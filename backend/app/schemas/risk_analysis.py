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
    risk_score: float
    risk_level: RiskLevel
    recommendations: Optional[List[str]] = None
    risk_explanation: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
