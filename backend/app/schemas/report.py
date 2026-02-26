from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class ReportRead(BaseModel):
    id: UUID
    business_id: UUID
    risk_analysis_id: UUID
    report_type: str
    file_path: str
    created_at: datetime

    model_config = {"from_attributes": True}
