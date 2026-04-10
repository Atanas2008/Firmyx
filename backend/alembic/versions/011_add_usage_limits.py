"""Add usage limit fields: analyses_count and is_unlocked.

Revision ID: 011
Revises: 010
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("analyses_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("is_unlocked", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("users", "is_unlocked")
    op.drop_column("users", "analyses_count")
