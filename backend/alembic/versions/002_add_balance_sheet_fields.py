"""002 add financial statement fields

Revision ID: 002
Revises: 001
Create Date: 2026-02-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("financial_records", sa.Column("total_assets", sa.Numeric(15, 2), nullable=True))
    op.add_column("financial_records", sa.Column("current_liabilities", sa.Numeric(15, 2), nullable=True))
    op.add_column("financial_records", sa.Column("ebit", sa.Numeric(15, 2), nullable=True))
    op.add_column("financial_records", sa.Column("retained_earnings", sa.Numeric(15, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("financial_records", "retained_earnings")
    op.drop_column("financial_records", "ebit")
    op.drop_column("financial_records", "current_liabilities")
    op.drop_column("financial_records", "total_assets")
