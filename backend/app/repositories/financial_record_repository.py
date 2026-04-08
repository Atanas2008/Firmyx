from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.financial_record import FinancialRecord
from app.schemas.financial_record import FinancialRecordCreate


class FinancialRecordRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, record_id: UUID) -> Optional[FinancialRecord]:
        return self.db.query(FinancialRecord).filter(FinancialRecord.id == record_id).first()

    def get_by_business(self, business_id: UUID, skip: int = 0, limit: int = 50) -> List[FinancialRecord]:
        return (
            self.db.query(FinancialRecord)
            .filter(FinancialRecord.business_id == business_id)
            .order_by(FinancialRecord.period_year.desc(), FinancialRecord.period_month.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_all_by_business(self, business_id: UUID) -> List[FinancialRecord]:
        """Return all records without pagination — for internal analysis use."""
        return (
            self.db.query(FinancialRecord)
            .filter(FinancialRecord.business_id == business_id)
            .order_by(FinancialRecord.period_year.desc(), FinancialRecord.period_month.desc())
            .all()
        )

    def count_by_business(self, business_id: UUID) -> int:
        return self.db.query(FinancialRecord).filter(FinancialRecord.business_id == business_id).count()

    def get_latest(self, business_id: UUID) -> Optional[FinancialRecord]:
        return (
            self.db.query(FinancialRecord)
            .filter(FinancialRecord.business_id == business_id)
            .order_by(FinancialRecord.period_year.desc(), FinancialRecord.period_month.desc())
            .first()
        )

    def create(self, business_id: UUID, data: FinancialRecordCreate) -> FinancialRecord:
        record = FinancialRecord(business_id=business_id, **data.model_dump())
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def create_bulk(self, business_id: UUID, records: List[FinancialRecordCreate]) -> List[FinancialRecord]:
        db_records = [FinancialRecord(business_id=business_id, **r.model_dump()) for r in records]
        self.db.add_all(db_records)
        self.db.commit()
        for r in db_records:
            self.db.refresh(r)
        return db_records

    def delete(self, record: FinancialRecord) -> None:
        self.db.delete(record)
        self.db.commit()
