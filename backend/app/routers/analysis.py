from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.risk_analysis import RiskAnalysisRead
from app.repositories.business_repository import BusinessRepository
from app.repositories.financial_record_repository import FinancialRecordRepository
from app.repositories.risk_analysis_repository import RiskAnalysisRepository
from app.services.auth_service import get_current_user
from app.services.financial_analysis import FinancialAnalysisEngine
from app.services.advisor import AdvisorService

router = APIRouter()


def _assert_business_owner(business_id: UUID, current_user: User, db: Session):
    business = BusinessRepository(db).get_by_id(business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found.")
    if business.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return business


@router.post("/{business_id}/analyze", response_model=RiskAnalysisRead, status_code=status.HTTP_201_CREATED)
def run_analysis(
    business_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run a financial risk analysis on the most recent financial record for the business.
    Returns the full analysis result including risk score, metrics, and recommendations.
    """
    _assert_business_owner(business_id, current_user, db)

    record_repo = FinancialRecordRepository(db)
    latest = record_repo.get_latest(business_id)
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No financial records found. Please add at least one financial record before running analysis.",
        )

    # Fetch the second-most-recent record for trend calculations
    all_records = record_repo.get_by_business(business_id)
    previous = all_records[1] if len(all_records) > 1 else None

    engine = FinancialAnalysisEngine()
    advisor = AdvisorService()

    result = engine.analyze(latest, previous)
    recommendations = advisor.generate_recommendations(result)
    explanation = advisor.generate_risk_explanation(result)

    analysis_data = {
        "business_id": business_id,
        "financial_record_id": latest.id,
        "profit_margin": result.profit_margin,
        "burn_rate": result.burn_rate,
        "cash_runway_months": result.cash_runway_months,
        "revenue_trend": result.revenue_trend,
        "expense_trend": result.expense_trend,
        "debt_ratio": result.debt_ratio,
        "liquidity_ratio": result.liquidity_ratio,
        "altman_z_score": result.altman_z_score,
        "risk_score": result.risk_score,
        "risk_level": result.risk_level,
        "recommendations": recommendations,
        "risk_explanation": explanation,
    }

    return RiskAnalysisRepository(db).create(analysis_data)


@router.get("/{business_id}/analysis", response_model=List[RiskAnalysisRead])
def list_analyses(
    business_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all risk analyses for a business, most recent first."""
    _assert_business_owner(business_id, current_user, db)
    return RiskAnalysisRepository(db).get_by_business(business_id)


@router.get("/{business_id}/analysis/{analysis_id}", response_model=RiskAnalysisRead)
def get_analysis(
    business_id: UUID,
    analysis_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific risk analysis by ID."""
    _assert_business_owner(business_id, current_user, db)
    analysis = RiskAnalysisRepository(db).get_by_id(analysis_id)
    if not analysis or analysis.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")
    return analysis
