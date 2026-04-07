from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.business import Business
from app.schemas.business import BusinessCreate, BusinessUpdate


class BusinessRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, business_id: UUID) -> Optional[Business]:
        return self.db.query(Business).filter(Business.id == business_id).first()

    def get_by_owner(self, owner_id: UUID, skip: int = 0, limit: int = 100) -> List[Business]:
        return (
            self.db.query(Business)
            .filter(Business.owner_id == owner_id)
            .order_by(Business.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_by_owner(self, owner_id: UUID) -> int:
        return self.db.query(Business).filter(Business.owner_id == owner_id).count()

    def create(self, owner_id: UUID, data: BusinessCreate) -> Business:
        business = Business(owner_id=owner_id, **data.model_dump())
        self.db.add(business)
        self.db.commit()
        self.db.refresh(business)
        return business

    def update(self, business: Business, data: BusinessUpdate) -> Business:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(business, key, value)
        self.db.commit()
        self.db.refresh(business)
        return business

    def delete(self, business: Business) -> None:
        self.db.delete(business)
        self.db.commit()
