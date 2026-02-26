import os
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.report import ReportRead
from app.repositories.business_repository import BusinessRepository
from app.repositories.risk_analysis_repository import RiskAnalysisRepository
from app.services.auth_service import get_current_user
from app.services.report_generator import ReportGenerator

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

    latest_analysis = analyses[0]
    generator = ReportGenerator()
    filepath = generator.generate(business, latest_analysis)

    report_data = {
        "business_id": business_id,
        "risk_analysis_id": latest_analysis.id,
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
