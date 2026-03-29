import os
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.report import ReportRead, ReportGenerateRequest
from app.repositories.business_repository import BusinessRepository
from app.repositories.risk_analysis_repository import RiskAnalysisRepository
from app.repositories.financial_record_repository import FinancialRecordRepository
from app.services.auth_service import get_current_user
from app.services.report_generator import ReportGenerator
from app.services.forecasting import calculate_forecast
from app.services.scenario import simulate_scenario

router = APIRouter()


def _assert_business_owner(business_id: UUID, current_user: User, db: Session):
    business = BusinessRepository(db).get_by_id(business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found.")
    if business.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return business


@router.post("/{business_id}/reports", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def generate_report(
    business_id: UUID,
    payload: ReportGenerateRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a PDF financial health report based on the most recent risk analysis
    for the specified business.
    """
    business = _assert_business_owner(business_id, current_user, db)

    analysis_repo = RiskAnalysisRepository(db)
    analyses = analysis_repo.get_by_business(business_id)
    if not analyses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No risk analysis found. Run an analysis before generating a report.",
        )

    selected_analysis = analyses[0]
    if payload and payload.analysis_id:
        found = analysis_repo.get_by_id(payload.analysis_id)
        if not found or found.business_id != business_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected analysis was not found for this business.",
            )
        selected_analysis = found

    generator = ReportGenerator()

    # CHANGED: Optionally generate forecast data for the report
    forecast_data = None
    record_repo = FinancialRecordRepository(db)
    latest_record = record_repo.get_latest(business_id)
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
        "business_id": business_id,
        "risk_analysis_id": selected_analysis.id,
        "report_type": "pdf",
        "file_path": filepath,
    }
    return analysis_repo.create_report(report_data)


@router.get("/{business_id}/reports", response_model=List[ReportRead])
def list_reports(
    business_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all generated reports for a business."""
    _assert_business_owner(business_id, current_user, db)
    return RiskAnalysisRepository(db).get_reports_by_business(business_id)


@router.get("/{business_id}/reports/{report_id}/download")
def download_report(
    business_id: UUID,
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a previously generated PDF report."""
    _assert_business_owner(business_id, current_user, db)

    report = RiskAnalysisRepository(db).get_report_by_id(report_id)
    if not report or report.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    if not os.path.exists(report.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file is no longer available on disk.",
        )

    return FileResponse(
        path=report.file_path,
        media_type="application/pdf",
        filename=os.path.basename(report.file_path),
    )
