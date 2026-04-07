from uuid import UUID
from datetime import datetime
from typing import Any, Optional, List, Union
from pydantic import BaseModel, field_validator, model_validator
from app.models.risk_analysis import RiskLevel


# ─── Recommendation justification layer ───────────────────────────────────────

class RecommendationJustification(BaseModel):
    """Quantitative rationale behind a single recommendation."""
    driver: str
    comparison: str
    impact: str
    priority_reason: str


class RecommendationItem(BaseModel):
    """Audit-grade recommendation with full justification."""
    title: str
    explanation: str
    justification: RecommendationJustification
    # v4.0 fields — optional for backward compat with stored data
    priority: Optional[str] = None          # High / Medium / Low
    current_value: Optional[str] = None
    target_value: Optional[str] = None
    timeframe: Optional[str] = None         # Immediate / 1–3 months / 3–6 months
    concrete_actions: Optional[List[str]] = None


class RiskAnalysisRead(BaseModel):
    id: UUID
    business_id: UUID
    financial_record_id: UUID
    profit_margin: Optional[float] = None
    burn_rate: Optional[float] = None
    cash_runway_months: Optional[float] = None
    revenue_trend: float = 0.0
    expense_trend: float = 0.0
    debt_ratio: Optional[float] = None
    liquidity_ratio: Optional[float] = None
    altman_z_score: Optional[float] = None
    financial_health_score: Optional[float] = None
    bankruptcy_probability: Optional[float] = None
    risk_score: float
    risk_level: RiskLevel
    recommendations: Optional[List[RecommendationItem]] = None
    risk_explanation: Optional[str] = None
    calculation_sources: Optional[dict[str, Any]] = None
    analysis_scope: str
    period_month: Optional[int] = None
    period_year: Optional[int] = None
    industry_model_applied: Optional[str] = None
    created_at: datetime
    # v4.0 explainability layer — embedded in calculation_sources for DB compat
    risk_score_breakdown: Optional[dict[str, float]] = None
    confidence_level: Optional[str] = None
    confidence_explanation: Optional[str] = None
    revenue_trend_label: Optional[str] = None
    runway_label: Optional[str] = None
    bankruptcy_explanation: Optional[str] = None
    # v5.0 deterministic scoring outputs
    drivers: Optional[List[str]] = None
    explanation: Optional[str] = None
    expense_ratio: Optional[float] = None
    risk_level_display: Optional[str] = None

    @field_validator("revenue_trend", "expense_trend", mode="before")
    @classmethod
    def _coerce_none_to_zero(cls, v: object) -> float:
        return 0.0 if v is None else float(v)

    @field_validator("recommendations", mode="before")
    @classmethod
    def _coerce_legacy_recommendations(cls, v: object) -> object:
        """Backward-compat: convert legacy string[] recommendations to structured format."""
        if not isinstance(v, list):
            return v
        result = []
        for item in v:
            if isinstance(item, str):
                result.append({
                    "title": (item[:57] + "...") if len(item) > 60 else item,
                    "explanation": item,
                    "justification": {
                        "driver": "Legacy recommendation — no driver data available",
                        "comparison": "N/A",
                        "impact": "N/A",
                        "priority_reason": "N/A",
                    },
                })
            else:
                result.append(item)
        return result

    @model_validator(mode="after")
    def _hydrate_v4_from_sources(self) -> "RiskAnalysisRead":
        """Populate v4.0 fields from calculation_sources for backward compat."""
        cs = self.calculation_sources or {}
        if self.risk_score_breakdown is None and "risk_score_breakdown" in cs:
            self.risk_score_breakdown = cs["risk_score_breakdown"]
        if self.confidence_level is None and "confidence_level" in cs:
            self.confidence_level = cs["confidence_level"]
        if self.confidence_explanation is None and "confidence_explanation" in cs:
            self.confidence_explanation = cs["confidence_explanation"]
        if self.revenue_trend_label is None and "revenue_trend_label" in cs:
            self.revenue_trend_label = cs["revenue_trend_label"]
        if self.runway_label is None and "runway_label" in cs:
            self.runway_label = cs["runway_label"]
        if self.bankruptcy_explanation is None and "bankruptcy_explanation" in cs:
            self.bankruptcy_explanation = cs["bankruptcy_explanation"]
        # v5.0 fields
        if self.drivers is None and "drivers" in cs:
            self.drivers = cs["drivers"]
        if self.explanation is None and "explanation" in cs:
            self.explanation = cs["explanation"]
        if self.expense_ratio is None and "expense_ratio" in cs:
            self.expense_ratio = cs["expense_ratio"]
        if self.risk_level_display is None and "risk_level_display" in cs:
            self.risk_level_display = cs["risk_level_display"]
        return self

    model_config = {"from_attributes": True}


# ─── Forecast schemas ─────────────────────────────────────────────────────────

class ForecastMonth(BaseModel):
    month: int
    label: str = ""
    projected_revenue: float
    projected_expenses: float
    projected_profit: float
    projected_cash_balance: float
    projected_risk_score: float
    burn_rate: float = 0.0
    runway_months: Optional[float] = None


class ForecastRequest(BaseModel):
    months: int = 12
    scenario: str = "baseline"


class ForecastResponse(BaseModel):
    business_id: UUID
    months: int
    scenario: str = "baseline"
    projections: List[ForecastMonth]
    projected_cash_runway: Optional[int] = None   # month where cash first hits 0
    end_of_period_risk_score: float
    end_cash_balance: float = 0.0


class MultiScenarioForecastResponse(BaseModel):
    """All three scenarios returned simultaneously for overlay charts."""
    business_id: UUID
    months: int
    baseline: List[ForecastMonth]
    optimistic: List[ForecastMonth]
    pessimistic: List[ForecastMonth]


# ─── Scenario schemas ─────────────────────────────────────────────────────────

class ScenarioAdjustments(BaseModel):
    preset: Optional[str] = None
    revenue_change_pct: float = 0.0
    revenue_change_abs: float = 0.0
    expense_change_pct: float = 0.0
    expense_change_abs: float = 0.0
    debt_change_abs: float = 0.0
    cash_change_abs: float = 0.0
    cost_reduction_pct: float = 0.0


class ScenarioPreset(BaseModel):
    key: str
    label: str
    description: str


class MetricComparison(BaseModel):
    original: Optional[float] = None
    adjusted: Optional[float] = None
    delta: Optional[float] = None
    direction: str = "neutral"


class ScenarioResponse(BaseModel):
    business_id: UUID
    original: dict
    adjusted: dict
    comparison: dict[str, MetricComparison]
    summary: str = ""
