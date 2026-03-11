"""add industry_model_applied to risk_analyses

Revision ID: 006
Revises: 005
Create Date: 2026-03-11
"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'risk_analyses',
        sa.Column('industry_model_applied', sa.String(64), nullable=True),
    )


def downgrade():
    op.drop_column('risk_analyses', 'industry_model_applied')
