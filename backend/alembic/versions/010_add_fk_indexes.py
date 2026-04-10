"""Add FK indexes for performance on child tables.

Revision ID: 012
Revises: 011
Create Date: 2025-01-01 00:00:00.000000
"""

from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_businesses_owner_id", "businesses", ["owner_id"], unique=False, if_not_exists=True)
    op.create_index("ix_financial_records_business_id", "financial_records", ["business_id"], unique=False, if_not_exists=True)
    op.create_index("ix_risk_analyses_business_id", "risk_analyses", ["business_id"], unique=False, if_not_exists=True)
    op.create_index("ix_risk_analyses_financial_record_id", "risk_analyses", ["financial_record_id"], unique=False, if_not_exists=True)
    op.create_index("ix_reports_business_id", "reports", ["business_id"], unique=False, if_not_exists=True)
    op.create_index("ix_reports_risk_analysis_id", "reports", ["risk_analysis_id"], unique=False, if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_reports_risk_analysis_id", table_name="reports")
    op.drop_index("ix_reports_business_id", table_name="reports")
    op.drop_index("ix_risk_analyses_financial_record_id", table_name="risk_analyses")
    op.drop_index("ix_risk_analyses_business_id", table_name="risk_analyses")
    op.drop_index("ix_financial_records_business_id", table_name="financial_records")
    op.drop_index("ix_businesses_owner_id", table_name="businesses")
