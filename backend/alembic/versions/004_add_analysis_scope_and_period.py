"""004 add analysis scope and period

Revision ID: 004
Revises: 003
Create Date: 2026-02-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "risk_analyses",
        sa.Column("analysis_scope", sa.String(length=20), nullable=False, server_default="monthly"),
    )
    op.add_column("risk_analyses", sa.Column("period_month", sa.Integer(), nullable=True))
    op.add_column("risk_analyses", sa.Column("period_year", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("risk_analyses", "period_year")
    op.drop_column("risk_analyses", "period_month")
    op.drop_column("risk_analyses", "analysis_scope")
