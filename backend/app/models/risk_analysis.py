import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, Float, Text, DateTime, ForeignKey, Enum as SAEnum, JSON, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class RiskLevel(str, enum.Enum):
    safe = "safe"
    moderate_risk = "moderate_risk"
    high_risk = "high_risk"


class RiskAnalysis(Base):
    __tablename__ = "risk_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    financial_record_id = Column(UUID(as_uuid=True), ForeignKey("financial_records.id", ondelete="CASCADE"), nullable=False)
    profit_margin = Column(Float, nullable=True)
    burn_rate = Column(Float, nullable=True)
    cash_runway_months = Column(Float, nullable=True)
    revenue_trend = Column(Float, nullable=True)
    expense_trend = Column(Float, nullable=True)
    debt_ratio = Column(Float, nullable=True)
    liquidity_ratio = Column(Float, nullable=True)
    altman_z_score = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(SAEnum(RiskLevel), nullable=False)
    recommendations = Column(JSON, nullable=True)
    risk_explanation = Column(Text, nullable=True)
    calculation_sources = Column(JSON, nullable=True)
    analysis_scope = Column(String(20), nullable=False, default="monthly", server_default="monthly")
    period_month = Column(Integer, nullable=True)
    period_year = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    business = relationship("Business", back_populates="risk_analyses")
    financial_record = relationship("FinancialRecord", back_populates="risk_analyses")
    reports = relationship("Report", back_populates="risk_analysis", cascade="all, delete-orphan")
