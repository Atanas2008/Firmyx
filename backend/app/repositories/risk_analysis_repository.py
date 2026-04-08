from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.risk_analysis import RiskAnalysis
from app.models.report import Report


class RiskAnalysisRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, analysis_id: UUID) -> Optional[RiskAnalysis]:
        return self.db.query(RiskAnalysis).filter(RiskAnalysis.id == analysis_id).first()

    def get_by_business(self, business_id: UUID, skip: int = 0, limit: int = 50) -> List[RiskAnalysis]:
        return (
            self.db.query(RiskAnalysis)
            .filter(RiskAnalysis.business_id == business_id)
            .order_by(RiskAnalysis.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_all_by_business(self, business_id: UUID) -> List[RiskAnalysis]:
        """Return all analyses without pagination — for internal use."""
        return (
            self.db.query(RiskAnalysis)
            .filter(RiskAnalysis.business_id == business_id)
            .order_by(RiskAnalysis.created_at.desc())
            .all()
        )

    def count_by_business(self, business_id: UUID) -> int:
        return self.db.query(RiskAnalysis).filter(RiskAnalysis.business_id == business_id).count()

    def create(self, data: dict) -> RiskAnalysis:
        analysis = RiskAnalysis(**data)
        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def get_report_by_id(self, report_id: UUID) -> Optional[Report]:
        return self.db.query(Report).filter(Report.id == report_id).first()

    def get_reports_by_business(self, business_id: UUID, skip: int = 0, limit: int = 50) -> List[Report]:
        return (
            self.db.query(Report)
            .filter(Report.business_id == business_id)
            .order_by(Report.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_reports_by_business(self, business_id: UUID) -> int:
        return self.db.query(Report).filter(Report.business_id == business_id).count()

    def create_report(self, data: dict) -> Report:
        report = Report(**data)
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report
