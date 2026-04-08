"""Make timestamp columns timezone-aware

Revision ID: 008
Revises: 007
Create Date: 2026-04-08
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None

# All (table, column) pairs that hold timestamps
_TIMESTAMP_COLUMNS = [
    ("users", "created_at"),
    ("users", "updated_at"),
    ("businesses", "created_at"),
    ("businesses", "updated_at"),
    ("financial_records", "created_at"),
    ("financial_records", "updated_at"),
    ("risk_analyses", "created_at"),
    ("reports", "created_at"),
]


def upgrade() -> None:
    for table, column in _TIMESTAMP_COLUMNS:
        op.alter_column(
            table,
            column,
            type_=sa.DateTime(timezone=True),
            existing_type=sa.DateTime(),
            existing_nullable=False,
        )


def downgrade() -> None:
    for table, column in _TIMESTAMP_COLUMNS:
        op.alter_column(
            table,
            column,
            type_=sa.DateTime(),
            existing_type=sa.DateTime(timezone=True),
            existing_nullable=False,
        )
