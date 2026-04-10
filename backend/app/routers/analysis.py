from types import SimpleNamespace
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.business import Business
from app.schemas.risk_analysis import (
    RiskAnalysisRead,
    ForecastRequest,
    ForecastResponse,
    ForecastMonth,
    MultiScenarioForecastResponse,
    ScenarioAdjustments,
    ScenarioResponse,
    ScenarioPreset,
)
from app.schemas.ai_chat import ChatRequest, ChatResponse
from app.repositories.financial_record_repository import FinancialRecordRepository
from app.repositories.risk_analysis_repository import RiskAnalysisRepository
from app.services.financial_analysis import FinancialAnalysisEngine
from app.services.advisor import AdvisorService
from app.services.forecasting import calculate_forecast, calculate_all_scenarios
from app.services.scenario import simulate_scenario, get_predefined_scenarios, PREDEFINED_SCENARIOS
from app.services.benchmarks import get_benchmark as get_industry_benchmark
from app.services.ai_chat import AIChatService
from app.config import settings
from app.middleware.rate_limiter import limiter
from app.dependencies import get_owned_business
from app.services.auth_service import get_current_user
from app.models.user import User

router = APIRouter()


def _build_analysis_data(
    business_id: UUID,
    record,
    previous,
    scope: str,
    advisor: AdvisorService,
    engine: FinancialAnalysisEngine,
    industry: str = "",
    all_records: Optional[list] = None,
):
    result = engine.analyze(record, previous, industry=industry, all_records=all_records)
    recommendations = advisor.generate_recommendations(result)
    explanation = advisor.generate_risk_explanation(result)

    # Embed v4.0 explainability fields in calculation_sources (no DB migration)
    enriched_sources = dict(result.calculation_sources)
    enriched_sources["risk_score_breakdown"] = result.risk_score_breakdown
    enriched_sources["confidence_level"] = result.confidence_level
    enriched_sources["confidence_explanation"] = result.confidence_explanation
    enriched_sources["revenue_trend_label"] = result.revenue_trend_label
    enriched_sources["runway_label"] = result.runway_label
    enriched_sources["bankruptcy_explanation"] = result.bankruptcy_explanation
    enriched_sources["drivers"] = result.drivers
    enriched_sources["explanation"] = result.explanation
    enriched_sources["expense_ratio"] = result.expense_ratio
    enriched_sources["risk_level_display"] = result.risk_level

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
        "calculation_sources": enriched_sources,
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
@limiter.limit("30/minute")
def run_analysis(
    request: Request,
    business: Business = Depends(get_owned_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Run a financial risk analysis on the most recent financial record for the business.
    Returns the full analysis result including risk score, metrics, and recommendations.
    """
    # Early access limit enforcement
    if not current_user.is_unlocked and current_user.analyses_count >= 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="FREE_LIMIT_REACHED")

    record_repo = FinancialRecordRepository(db)
    latest = record_repo.get_latest(business.id)
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No financial records found. Please add at least one financial record before running analysis.",
        )

    # Fetch the second-most-recent record for trend calculations
    all_records = record_repo.get_all_by_business(business.id)
    previous = all_records[1] if len(all_records) > 1 else None

    engine = FinancialAnalysisEngine()
    advisor = AdvisorService()

    analysis_data = _build_analysis_data(
        business_id=business.id,
        record=latest,
        previous=previous,
        scope="monthly",
        advisor=advisor,
        engine=engine,
        industry=business.industry or "",
        all_records=all_records,
    )

    result = RiskAnalysisRepository(db).create(analysis_data)
    current_user.analyses_count += 1
    db.commit()
    return result


@router.post("/{business_id}/analyze/all-months", response_model=List[RiskAnalysisRead], status_code=status.HTTP_201_CREATED)
def run_all_months_analysis(
    business: Business = Depends(get_owned_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run and persist one analysis per available financial month for the business."""
    # Early access limit enforcement
    if not current_user.is_unlocked and current_user.analyses_count >= 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="FREE_LIMIT_REACHED")

    record_repo = FinancialRecordRepository(db)
    records = record_repo.get_all_by_business(business.id)
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
            business_id=business.id,
            record=record,
            previous=previous,
            scope="monthly",
            advisor=advisor,
            engine=engine,
            industry=business.industry or "",
            all_records=records,
        )
        created.append(repo.create(analysis_data))

    current_user.analyses_count += 1
    db.commit()
    return created


@router.post("/{business_id}/analyze/combined", response_model=RiskAnalysisRead, status_code=status.HTTP_201_CREATED)
def run_combined_analysis(
    business: Business = Depends(get_owned_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run and persist a single combined analysis across all available months."""
    # Early access limit enforcement
    if not current_user.is_unlocked and current_user.analyses_count >= 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="FREE_LIMIT_REACHED")

    record_repo = FinancialRecordRepository(db)
    records = record_repo.get_all_by_business(business.id)
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No financial records found. Please add at least one financial record before running analysis.",
        )

    engine = FinancialAnalysisEngine()
    advisor = AdvisorService()
    combined_record = _build_combined_record(records)

    analysis_data = _build_analysis_data(
        business_id=business.id,
        record=combined_record,
        previous=None,
        scope="combined",
        advisor=advisor,
        engine=engine,
        industry=business.industry or "",
        all_records=records,
    )

    result = RiskAnalysisRepository(db).create(analysis_data)
    current_user.analyses_count += 1
    db.commit()
    return result


@router.get("/{business_id}/analysis")
def list_analyses(
    skip: int = 0,
    limit: int = 50,
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """List all risk analyses for a business (paginated), most recent first."""
    limit = min(limit, 100)
    repo = RiskAnalysisRepository(db)
    items = repo.get_by_business(business.id, skip=skip, limit=limit)
    total = repo.count_by_business(business.id)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": skip + limit < total,
    }


@router.get("/{business_id}/analysis/{analysis_id}", response_model=RiskAnalysisRead)
def get_analysis(
    analysis_id: UUID,
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """Get a specific risk analysis by ID."""
    analysis = RiskAnalysisRepository(db).get_by_id(analysis_id)
    if not analysis or analysis.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found.")
    return analysis


# ─── Forecast endpoint ────────────────────────────────────────────────────────

@router.post("/{business_id}/forecast", response_model=ForecastResponse)
def run_forecast(
    body: ForecastRequest = ForecastRequest(),
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """Project financial metrics forward based on current data and trends."""
    record_repo = FinancialRecordRepository(db)
    latest = record_repo.get_latest(business.id)
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No financial records found. Add data before running a forecast.",
        )

    # Get trends from the latest analysis if available
    analysis_repo = RiskAnalysisRepository(db)
    analyses = analysis_repo.get_by_business(business.id)
    latest_analysis = analyses[0] if analyses else None

    revenue_trend = latest_analysis.revenue_trend if latest_analysis else None
    expense_trend = latest_analysis.expense_trend if latest_analysis else None
    risk_score = latest_analysis.risk_score if latest_analysis else 30.0

    projections = calculate_forecast(
        current_revenue=float(latest.monthly_revenue or 0),
        current_expenses=float(latest.monthly_expenses or 0),
        cash_reserves=float(latest.cash_reserves or 0),
        debt=float(latest.debt or 0),
        revenue_trend=revenue_trend,
        expense_trend=expense_trend,
        months=body.months,
        scenario=body.scenario,
        period_month=latest.period_month,
        period_year=latest.period_year,
        risk_score=risk_score,
    )

    # Determine month where cash first hits zero
    cash_runway_month: int | None = None
    for p in projections:
        if p["projected_cash_balance"] <= 0:
            cash_runway_month = p["month"]
            break

    end_risk = projections[-1]["projected_risk_score"] if projections else 0.0
    end_cash = projections[-1]["projected_cash_balance"] if projections else 0.0

    return ForecastResponse(
        business_id=business.id,
        months=body.months,
        scenario=body.scenario,
        projections=[ForecastMonth(**p) for p in projections],
        projected_cash_runway=cash_runway_month,
        end_of_period_risk_score=end_risk,
        end_cash_balance=end_cash,
    )


@router.post("/{business_id}/forecast/all-scenarios", response_model=MultiScenarioForecastResponse)
def run_all_scenarios_forecast(
    body: ForecastRequest = ForecastRequest(),
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """Return forecasts for all three scenarios (baseline, optimistic, pessimistic)."""
    record_repo = FinancialRecordRepository(db)
    latest = record_repo.get_latest(business.id)
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No financial records found. Add data before running a forecast.",
        )

    analysis_repo = RiskAnalysisRepository(db)
    analyses = analysis_repo.get_by_business(business.id)
    latest_analysis = analyses[0] if analyses else None

    revenue_trend = latest_analysis.revenue_trend if latest_analysis else None
    expense_trend = latest_analysis.expense_trend if latest_analysis else None
    risk_score = latest_analysis.risk_score if latest_analysis else 30.0

    all_scenarios = calculate_all_scenarios(
        current_revenue=float(latest.monthly_revenue or 0),
        current_expenses=float(latest.monthly_expenses or 0),
        cash_reserves=float(latest.cash_reserves or 0),
        debt=float(latest.debt or 0),
        revenue_trend=revenue_trend,
        expense_trend=expense_trend,
        months=body.months,
        period_month=latest.period_month,
        period_year=latest.period_year,
        risk_score=risk_score,
    )

    return MultiScenarioForecastResponse(
        business_id=business.id,
        months=body.months,
        baseline=[ForecastMonth(**p) for p in all_scenarios["baseline"]],
        optimistic=[ForecastMonth(**p) for p in all_scenarios["optimistic"]],
        pessimistic=[ForecastMonth(**p) for p in all_scenarios["pessimistic"]],
    )


# ─── Scenario endpoint ───────────────────────────────────────────────────────

@router.get("/{business_id}/scenario/presets", response_model=List[ScenarioPreset])
def list_scenario_presets(
    business: Business = Depends(get_owned_business),
):
    """Return the list of predefined scenario presets."""
    return get_predefined_scenarios()


@router.post("/{business_id}/scenario", response_model=ScenarioResponse)
def run_scenario(
    adjustments: ScenarioAdjustments,
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """Simulate a what-if scenario by applying adjustments to the latest financials."""
    record_repo = FinancialRecordRepository(db)
    latest = record_repo.get_latest(business.id)
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No financial records found. Add data before running a scenario.",
        )

    # Merge preset adjustments if a preset key is provided
    adj_dict = adjustments.model_dump(exclude={"preset"})
    if adjustments.preset and adjustments.preset in PREDEFINED_SCENARIOS:
        preset_adj = PREDEFINED_SCENARIOS[adjustments.preset]["adjustments"]
        for k, v in preset_adj.items():
            adj_dict[k] = adj_dict.get(k, 0) + v

    base_financials = {
        "revenue": float(latest.monthly_revenue or 0),
        "expenses": float(latest.monthly_expenses or 0),
        "cash_reserves": float(latest.cash_reserves or 0),
        "debt": float(latest.debt or 0),
        "cogs": float(latest.cost_of_goods_sold or 0),
        "total_assets": float(latest.total_assets) if latest.total_assets is not None else None,
        "current_liabilities": float(latest.current_liabilities) if latest.current_liabilities is not None else None,
        "ebit": float(latest.ebit) if latest.ebit is not None else None,
        "retained_earnings": float(latest.retained_earnings) if latest.retained_earnings is not None else None,
    }

    result = simulate_scenario(
        base_financials=base_financials,
        adjustments=adj_dict,
        industry=business.industry or "",
    )

    return ScenarioResponse(
        business_id=business.id,
        original=result["original"],
        adjusted=result["adjusted"],
        comparison=result["comparison"],
        summary=result.get("summary", ""),
    )


# ─── AI Chat endpoint ────────────────────────────────────────────────────────

@router.post("/{business_id}/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
def ai_chat(
    request: Request,
    payload: ChatRequest,
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """Send a message to the AI Financial Advisor, grounded in this business's data."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI advisor is not configured. Set GEMINI_API_KEY in environment.",
        )

    record_repo = FinancialRecordRepository(db)
    latest_record = record_repo.get_latest(business.id)
    if not latest_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No financial records found. Add data before using the AI advisor.",
        )

    analysis_repo = RiskAnalysisRepository(db)
    analyses = analysis_repo.get_by_business(business.id)
    latest_analysis = analyses[0] if analyses else None
    if not latest_analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run an analysis first before using the AI advisor.",
        )

    business_data = {
        "name": business.name,
        "industry": business.industry or "",
        "country": business.country or "",
        "num_employees": business.num_employees,
        "years_operating": business.years_operating,
    }

    financial_data = {
        "monthly_revenue": float(latest_record.monthly_revenue or 0),
        "monthly_expenses": float(latest_record.monthly_expenses or 0),
        "payroll": float(latest_record.payroll or 0),
        "rent": float(latest_record.rent or 0),
        "debt": float(latest_record.debt or 0),
        "cash_reserves": float(latest_record.cash_reserves or 0),
        "cost_of_goods_sold": float(latest_record.cost_of_goods_sold or 0),
        "period_month": latest_record.period_month,
        "period_year": latest_record.period_year,
    }

    analysis_data = {
        "risk_score": latest_analysis.risk_score,
        "risk_level": latest_analysis.risk_level.value if hasattr(latest_analysis.risk_level, 'value') else str(latest_analysis.risk_level),
        "financial_health_score": latest_analysis.financial_health_score,
        "profit_margin": latest_analysis.profit_margin,
        "burn_rate": latest_analysis.burn_rate,
        "cash_runway_months": latest_analysis.cash_runway_months,
        "debt_ratio": latest_analysis.debt_ratio,
        "liquidity_ratio": latest_analysis.liquidity_ratio,
        "altman_z_score": latest_analysis.altman_z_score,
        "bankruptcy_probability": latest_analysis.bankruptcy_probability,
        "revenue_trend": latest_analysis.revenue_trend,
        "expense_trend": latest_analysis.expense_trend,
        "industry_model_applied": latest_analysis.industry_model_applied,
        "recommendations": latest_analysis.recommendations,
        "calculation_sources": latest_analysis.calculation_sources,
    }

    benchmark_data = get_industry_benchmark(business.industry or "")

    service = AIChatService()
    reply, tokens_used = service.chat(
        user_message=payload.message,
        conversation_history=[
            {"role": m.role, "content": m.content} for m in payload.history
        ],
        business_data=business_data,
        financial_data=financial_data,
        analysis_data=analysis_data,
        benchmark_data=benchmark_data,
    )

    return ChatResponse(reply=reply, tokens_used=tokens_used)
