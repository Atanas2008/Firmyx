"""001 initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column(
            "role",
            sa.Enum("owner", "accountant", "viewer", name="userrole"),
            nullable=False,
            server_default="owner",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # --- businesses ---
    op.create_table(
        "businesses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("industry", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("num_employees", sa.Integer(), nullable=True),
        sa.Column("years_operating", sa.Integer(), nullable=True),
        sa.Column("monthly_fixed_costs", sa.Numeric(15, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_businesses_id", "businesses", ["id"])

    # --- financial_records ---
    op.create_table(
        "financial_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period_month", sa.Integer(), nullable=False),
        sa.Column("period_year", sa.Integer(), nullable=False),
        sa.Column("monthly_revenue", sa.Numeric(15, 2), nullable=False),
        sa.Column("monthly_expenses", sa.Numeric(15, 2), nullable=False),
        sa.Column("payroll", sa.Numeric(15, 2), nullable=True, server_default="0"),
        sa.Column("rent", sa.Numeric(15, 2), nullable=True, server_default="0"),
        sa.Column("debt", sa.Numeric(15, 2), nullable=True, server_default="0"),
        sa.Column("cash_reserves", sa.Numeric(15, 2), nullable=True, server_default="0"),
        sa.Column("taxes", sa.Numeric(15, 2), nullable=True, server_default="0"),
        sa.Column("cost_of_goods_sold", sa.Numeric(15, 2), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_financial_records_id", "financial_records", ["id"])

    # --- risk_analyses ---
    op.create_table(
        "risk_analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("financial_record_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("profit_margin", sa.Float(), nullable=True),
        sa.Column("burn_rate", sa.Float(), nullable=True),
        sa.Column("cash_runway_months", sa.Float(), nullable=True),
        sa.Column("revenue_trend", sa.Float(), nullable=True),
        sa.Column("expense_trend", sa.Float(), nullable=True),
        sa.Column("debt_ratio", sa.Float(), nullable=True),
        sa.Column("liquidity_ratio", sa.Float(), nullable=True),
        sa.Column("altman_z_score", sa.Float(), nullable=True),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column(
            "risk_level",
            sa.Enum("safe", "moderate_risk", "high_risk", name="risklevel"),
            nullable=False,
        ),
        sa.Column("recommendations", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("risk_explanation", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["financial_record_id"], ["financial_records.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_risk_analyses_id", "risk_analyses", ["id"])

    # --- reports ---
    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("risk_analysis_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_type", sa.String(), nullable=False, server_default="pdf"),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["risk_analysis_id"], ["risk_analyses.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_reports_id", "reports", ["id"])


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("risk_analyses")
    op.drop_table("financial_records")
    op.drop_table("businesses")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS risklevel")
    op.execute("DROP TYPE IF EXISTS userrole")
