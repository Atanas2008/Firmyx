from types import SimpleNamespace
from typing import List, Optional
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


def _build_analysis_data(
    business_id: UUID,
    record,
    previous,
    scope: str,
    advisor: AdvisorService,
    engine: FinancialAnalysisEngine,
    industry: str = "",
):
    result = engine.analyze(record, previous, industry=industry)
    recommendations = advisor.generate_recommendations(result)
    explanation = advisor.generate_risk_explanation(result)

    return {
        "business_id": business_id,
        "financial_record_id": record.id,
        "profit_margin": result.profit_margin,
        "burn_rate": result.burn_rate,
        "cash_runway_months": result.cash_runway_months,
        "revenue_trend": result.revenue_trend,
        "expense_trend": result.expense_trend,
        "debt_ratio": result.debt_ratio,
        "liquidity_ratio": result.liquidity_ratio,
        "altman_z_score": result.altman_z_score,
        "financial_health_score": result.financial_health_score,
        "bankruptcy_probability": result.bankruptcy_probability,
        "risk_score": result.risk_score,
        "risk_level": result.risk_level,
        "recommendations": recommendations,
        "risk_explanation": explanation,
        "calculation_sources": result.calculation_sources,
        "analysis_scope": scope,
        "period_month": getattr(record, "period_month", None) if scope == "monthly" else None,
        "period_year": getattr(record, "period_year", None) if scope == "monthly" else None,
        "industry_model_applied": result.industry_model_applied,
    }


def _build_combined_record(records):
    latest = records[0]
    count = len(records)

    def avg(field: str) -> float:
        total = sum(float(getattr(record, field) or 0) for record in records)
        return total / count if count > 0 else 0.0

    def avg_optional(field: str) -> Optional[float]:
        values = [float(getattr(record, field)) for record in records if getattr(record, field) is not None]
        if not values:
            return None
        return sum(values) / len(values)

    return SimpleNamespace(
        id=latest.id,
        period_month=None,
        period_year=None,
        monthly_revenue=avg("monthly_revenue"),
        monthly_expenses=avg("monthly_expenses"),
        cost_of_goods_sold=avg("cost_of_goods_sold"),
        cash_reserves=float(latest.cash_reserves or 0),
        debt=float(latest.debt or 0),
        total_assets=float(latest.total_assets) if latest.total_assets is not None else None,
        current_liabilities=(
            float(latest.current_liabilities) if latest.current_liabilities is not None else None
        ),
        ebit=avg_optional("ebit"),
        retained_earnings=(
            float(latest.retained_earnings) if latest.retained_earnings is not None else None
        ),
    )


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
    business = _assert_business_owner(business_id, current_user, db)

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

    analysis_data = _build_analysis_data(
        business_id=business_id,
        record=latest,
        previous=previous,
        scope="monthly",
        advisor=advisor,
        engine=engine,
        industry=business.industry or "",
    )

    return RiskAnalysisRepository(db).create(analysis_data)


@router.post("/{business_id}/analyze/all-months", response_model=List[RiskAnalysisRead], status_code=status.HTTP_201_CREATED)
def run_all_months_analysis(
    business_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run and persist one analysis per available financial month for the business."""
    business = _assert_business_owner(business_id, current_user, db)

    record_repo = FinancialRecordRepository(db)
    records = record_repo.get_by_business(business_id)
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No financial records found. Please add at least one financial record before running analysis.",
        )

    engine = FinancialAnalysisEngine()
    advisor = AdvisorService()
    repo = RiskAnalysisRepository(db)

    created = []
    for index, record in enumerate(records):
        previous = records[index + 1] if index + 1 < len(records) else None
        analysis_data = _build_analysis_data(
            business_id=business_id,
            record=record,
            previous=previous,
            scope="monthly",
            advisor=advisor,
            engine=engine,
            industry=business.industry or "",
        )
        created.append(repo.create(analysis_data))

    return created


@router.post("/{business_id}/analyze/combined", response_model=RiskAnalysisRead, status_code=status.HTTP_201_CREATED)
def run_combined_analysis(
    business_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run and persist a single combined analysis across all available months."""
    business = _assert_business_owner(business_id, current_user, db)

    record_repo = FinancialRecordRepository(db)
    records = record_repo.get_by_business(business_id)
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No financial records found. Please add at least one financial record before running analysis.",
        )

    engine = FinancialAnalysisEngine()
    advisor = AdvisorService()
    combined_record = _build_combined_record(records)

    analysis_data = _build_analysis_data(
        business_id=business_id,
        record=combined_record,
        previous=None,
        scope="combined",
        advisor=advisor,
        engine=engine,
        industry=business.industry or "",
    )

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
