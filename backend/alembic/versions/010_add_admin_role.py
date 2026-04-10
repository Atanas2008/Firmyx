"""add admin role

Revision ID: 010
Revises: 009
Create Date: 2026-04-10
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers
revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'admin' value to the userrole enum type
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin' BEFORE 'owner'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from enums easily.
    # A full migration would require creating a new type and swapping,
    # which is risky. Leaving as-is for safety.
    pass
