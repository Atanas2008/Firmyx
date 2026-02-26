from uuid import UUID
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel


class BusinessCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    country: Optional[str] = None
    num_employees: Optional[int] = None
    years_operating: Optional[int] = None
    monthly_fixed_costs: Optional[Decimal] = None


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
