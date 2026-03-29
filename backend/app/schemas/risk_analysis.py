from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.risk_analysis import RiskLevel


class RiskAnalysisRead(BaseModel):
    id: UUID
    business_id: UUID
    financial_record_id: UUID
    profit_margin: Optional[float] = None
    burn_rate: Optional[float] = None
    cash_runway_months: Optional[float] = None
    revenue_trend: Optional[float] = None
    expense_trend: Optional[float] = None
    debt_ratio: Optional[float] = None
    liquidity_ratio: Optional[float] = None
    altman_z_score: Optional[float] = None
    financial_health_score: Optional[float] = None
    bankruptcy_probability: Optional[float] = None
    risk_score: float
    risk_level: RiskLevel
    recommendations: Optional[List[str]] = None
    risk_explanation: Optional[str] = None
    calculation_sources: Optional[dict[str, str]] = None
    analysis_scope: str
    period_month: Optional[int] = None
    period_year: Optional[int] = None
    industry_model_applied: Optional[str] = None
    created_at: datetime

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
