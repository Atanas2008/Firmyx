import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class FinancialRecord(Base):
    __tablename__ = "financial_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    period_month = Column(Integer, nullable=False)
    period_year = Column(Integer, nullable=False)
    monthly_revenue = Column(Numeric(15, 2), nullable=False)
    monthly_expenses = Column(Numeric(15, 2), nullable=False)
    payroll = Column(Numeric(15, 2), nullable=True, default=0)
    rent = Column(Numeric(15, 2), nullable=True, default=0)
    debt = Column(Numeric(15, 2), nullable=True, default=0)
    cash_reserves = Column(Numeric(15, 2), nullable=True, default=0)
    taxes = Column(Numeric(15, 2), nullable=True, default=0)
    cost_of_goods_sold = Column(Numeric(15, 2), nullable=True, default=0)
    total_assets = Column(Numeric(15, 2), nullable=True)
    current_liabilities = Column(Numeric(15, 2), nullable=True)
    ebit = Column(Numeric(15, 2), nullable=True)
    retained_earnings = Column(Numeric(15, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    business = relationship("Business", back_populates="financial_records")
    risk_analyses = relationship("RiskAnalysis", back_populates="financial_record", cascade="all, delete-orphan")
