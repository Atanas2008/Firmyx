from uuid import UUID
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, field_validator

# Upper bound for any single financial field (prevents absurd values / overflow)
_MAX_FINANCIAL_VALUE = Decimal("999_999_999_999.99")


class FinancialRecordCreate(BaseModel):
    period_month: int
    period_year: int
    monthly_revenue: Decimal
    monthly_expenses: Decimal
    payroll: Optional[Decimal] = Decimal("0")
    rent: Optional[Decimal] = Decimal("0")
    debt: Optional[Decimal] = Decimal("0")
    cash_reserves: Optional[Decimal] = Decimal("0")
    taxes: Optional[Decimal] = Decimal("0")
    cost_of_goods_sold: Optional[Decimal] = Decimal("0")
    total_assets: Optional[Decimal] = None
    current_liabilities: Optional[Decimal] = None
    ebit: Optional[Decimal] = None
    retained_earnings: Optional[Decimal] = None

    @field_validator("period_month")
    @classmethod
    def validate_month(cls, v: int) -> int:
        if not 1 <= v <= 12:
            raise ValueError("period_month must be between 1 and 12")
        return v

    @field_validator("period_year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if not 2000 <= v <= 2100:
            raise ValueError("period_year must be between 2000 and 2100")
        return v

    @field_validator(
        "monthly_revenue", "monthly_expenses", "payroll", "rent", "debt",
        "cash_reserves", "taxes", "cost_of_goods_sold", "total_assets",
        "current_liabilities", "ebit", "retained_earnings",
    )
    @classmethod
    def validate_financial_bounds(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and abs(v) > _MAX_FINANCIAL_VALUE:
            raise ValueError(f"Value {v} exceeds maximum allowed magnitude of {_MAX_FINANCIAL_VALUE}")
        return v


class FinancialRecordRead(BaseModel):
    id: UUID
    business_id: UUID
    period_month: int
    period_year: int
    monthly_revenue: Decimal
    monthly_expenses: Decimal
    payroll: Optional[Decimal] = None
    rent: Optional[Decimal] = None
    debt: Optional[Decimal] = None
    cash_reserves: Optional[Decimal] = None
    taxes: Optional[Decimal] = None
    cost_of_goods_sold: Optional[Decimal] = None
    total_assets: Optional[Decimal] = None
    current_liabilities: Optional[Decimal] = None
    ebit: Optional[Decimal] = None
    retained_earnings: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FinancialRecordUpdate(BaseModel):
    period_month: Optional[int] = None
    period_year: Optional[int] = None
    monthly_revenue: Optional[Decimal] = None
    monthly_expenses: Optional[Decimal] = None
    payroll: Optional[Decimal] = None
    rent: Optional[Decimal] = None
    debt: Optional[Decimal] = None
    cash_reserves: Optional[Decimal] = None
    taxes: Optional[Decimal] = None
    cost_of_goods_sold: Optional[Decimal] = None
    total_assets: Optional[Decimal] = None
    current_liabilities: Optional[Decimal] = None
    ebit: Optional[Decimal] = None
    retained_earnings: Optional[Decimal] = None


class PaginatedFinancialRecords(BaseModel):
    items: list[FinancialRecordRead]
    total: int
    skip: int
    limit: int
    has_more: bool
