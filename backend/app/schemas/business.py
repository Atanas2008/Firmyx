from uuid import UUID
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, field_validator


SUPPORTED_INDUSTRIES = [
    "Technology", "Software", "Food & Beverage", "Restaurants", "Coffee Chains",
    "Retail", "Manufacturing", "Healthcare", "Real Estate", "Logistics & Transport",
    "Other",
]


class BusinessCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    country: Optional[str] = None
    num_employees: Optional[int] = None
    years_operating: Optional[int] = None
    monthly_fixed_costs: Optional[Decimal] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1 or len(v) > 200:
            raise ValueError("Business name must be between 1 and 200 characters")
        return v

    @field_validator("industry")
    @classmethod
    def validate_industry(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if v and v not in SUPPORTED_INDUSTRIES:
                raise ValueError(f"Unsupported industry. Must be one of: {', '.join(SUPPORTED_INDUSTRIES)}")
        return v

    @field_validator("num_employees")
    @classmethod
    def validate_employees(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 0 or v > 10_000_000):
            raise ValueError("Number of employees must be between 0 and 10,000,000")
        return v

    @field_validator("years_operating")
    @classmethod
    def validate_years(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 0 or v > 500):
            raise ValueError("Years operating must be between 0 and 500")
        return v


class BusinessRead(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    industry: Optional[str] = None
    country: Optional[str] = None
    num_employees: Optional[int] = None
    years_operating: Optional[int] = None
    monthly_fixed_costs: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    num_employees: Optional[int] = None
    years_operating: Optional[int] = None
    monthly_fixed_costs: Optional[Decimal] = None
