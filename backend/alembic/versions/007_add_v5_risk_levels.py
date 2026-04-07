"""Add v5.0 risk level enum values (low, medium, high, critical)

Revision ID: 007
Revises: 006
Create Date: 2026-04-07
"""
from alembic import op

# revision identifiers
revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL supports adding new values to an existing enum type.
    # These must run outside a transaction block in some PG versions,
    # but Alembic's default autocommit mode handles this correctly.
    op.execute("ALTER TYPE risklevel ADD VALUE IF NOT EXISTS 'low'")
    op.execute("ALTER TYPE risklevel ADD VALUE IF NOT EXISTS 'medium'")
    op.execute("ALTER TYPE risklevel ADD VALUE IF NOT EXISTS 'high'")
    op.execute("ALTER TYPE risklevel ADD VALUE IF NOT EXISTS 'critical'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values.
    # Old values (safe, moderate_risk, high_risk) remain in the type.
    pass
