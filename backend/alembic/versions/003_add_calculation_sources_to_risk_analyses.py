"""003 add calculation sources to risk analyses

Revision ID: 003
Revises: 002
Create Date: 2026-02-27 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "risk_analyses",
        sa.Column("calculation_sources", postgresql.JSON(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("risk_analyses", "calculation_sources")
