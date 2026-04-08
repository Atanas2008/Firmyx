import os
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.business import Business
from app.schemas.report import ReportRead, ReportGenerateRequest
from app.repositories.risk_analysis_repository import RiskAnalysisRepository
from app.repositories.financial_record_repository import FinancialRecordRepository
from app.services.report_generator import ReportGenerator
from app.services.forecasting import calculate_forecast
from app.dependencies import get_owned_business
from app.config import settings
from app.middleware.rate_limiter import limiter

router = APIRouter()


@router.post("/{business_id}/reports", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def generate_report(
    request: Request,
    payload: ReportGenerateRequest | None = None,
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """
    Generate a PDF financial health report based on the most recent risk analysis
    for the specified business.
    """
    analysis_repo = RiskAnalysisRepository(db)
    analyses = analysis_repo.get_by_business(business.id, skip=0, limit=1)
    if not analyses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No risk analysis found. Run an analysis before generating a report.",
        )

    selected_analysis = analyses[0]
    if payload and payload.analysis_id:
        found = analysis_repo.get_by_id(payload.analysis_id)
        if not found or found.business_id != business.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected analysis was not found for this business.",
            )
        selected_analysis = found

    generator = ReportGenerator()

    # CHANGED: Optionally generate forecast data for the report
    forecast_data = None
    record_repo = FinancialRecordRepository(db)
    latest_record = record_repo.get_latest(business.id)
    if latest_record:
        forecast_data = calculate_forecast(
            current_revenue=float(latest_record.monthly_revenue or 0),
            current_expenses=float(latest_record.monthly_expenses or 0),
            cash_reserves=float(latest_record.cash_reserves or 0),
            debt=float(latest_record.debt or 0),
            revenue_trend=selected_analysis.revenue_trend,
            expense_trend=selected_analysis.expense_trend,
            months=12,
        )

    filepath = generator.generate(business, selected_analysis, forecast_data=forecast_data)

    report_data = {
        "business_id": business.id,
        "risk_analysis_id": selected_analysis.id,
        "report_type": "pdf",
        "file_path": filepath,
    }
    return analysis_repo.create_report(report_data)


@router.get("/{business_id}/reports")
def list_reports(
    skip: int = 0,
    limit: int = 50,
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """List all generated reports for a business (paginated)."""
    limit = min(limit, 100)
    repo = RiskAnalysisRepository(db)
    items = repo.get_reports_by_business(business.id, skip=skip, limit=limit)
    total = repo.count_reports_by_business(business.id)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": skip + limit < total,
    }


@router.get("/{business_id}/reports/{report_id}/download")
def download_report(
    report_id: UUID,
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """Download a previously generated PDF report."""
    report = RiskAnalysisRepository(db).get_report_by_id(report_id)
    if not report or report.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    if not os.path.exists(report.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file is no longer available on disk.",
        )

    # Path traversal protection: ensure the file is within REPORTS_DIR
    real_path = os.path.realpath(report.file_path)
    reports_dir = os.path.realpath(settings.REPORTS_DIR)
    if not real_path.startswith(reports_dir + os.sep):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    return FileResponse(
        path=report.file_path,
        media_type="application/pdf",
        filename=os.path.basename(report.file_path),
    )
