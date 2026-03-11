"""005 add financial health score and bankruptcy probability

Revision ID: 005
Revises: 004
Create Date: 2026-03-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "risk_analyses",
        sa.Column("financial_health_score", sa.Float(), nullable=True),
    )
    op.add_column(
        "risk_analyses",
        sa.Column("bankruptcy_probability", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("risk_analyses", "bankruptcy_probability")
    op.drop_column("risk_analyses", "financial_health_score")
