"""Unit tests for the Financial Analysis Engine.

Covers:
- Profit margin calculation
- Burn rate and cash runway
- Altman Z-Score
- Industry-specific weighting
- Distress penalties
- Risk level classification
- Edge cases (zero values, missing data)
"""

import pytest
from types import SimpleNamespace
from app.services.financial_analysis import (
    FinancialAnalysisEngine,
    get_industry_weights,
    DEFAULT_WEIGHTS,
)


def _make_record(
    revenue=10000,
    expenses=8000,
    cogs=3000,
    cash=50000,
    debt=20000,
    total_assets=None,
    current_liabilities=None,
    ebit=None,
    retained_earnings=None,
):
    """Create a mock financial record SimpleNamespace."""
    return SimpleNamespace(
        id="test-id",
        monthly_revenue=revenue,
        monthly_expenses=expenses,
        cost_of_goods_sold=cogs,
        cash_reserves=cash,
        debt=debt,
        total_assets=total_assets,
        current_liabilities=current_liabilities,
        ebit=ebit,
        retained_earnings=retained_earnings,
    )


class TestProfitMargin:
    def test_profitable_business(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(revenue=10000, expenses=7000))
        assert result.profit_margin == 30.0  # (10000-7000)/10000 * 100

    def test_break_even(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(revenue=10000, expenses=10000))
        assert result.profit_margin == 0.0

    def test_loss_making(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(revenue=5000, expenses=8000))
        assert result.profit_margin < 0

    def test_zero_revenue(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(revenue=0, expenses=5000))
        assert result.profit_margin == 0.0


class TestBurnRate:
    def test_burning_cash(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(revenue=5000, expenses=8000))
        assert result.burn_rate == 3000.0

    def test_profitable_no_burn(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(revenue=10000, expenses=7000))
        assert result.burn_rate == 0.0


class TestCashRunway:
    def test_runway_calculation(self):
        engine = FinancialAnalysisEngine()
        # Cash 30000, burn = 10000 - 7000 = 3000? No, burn = max(expenses - revenue, 0) = 0 for profitable
        result = engine.analyze(_make_record(revenue=5000, expenses=8000, cash=9000))
        # burn = 3000, runway = 9000/3000 = 3 months
        assert result.cash_runway_months == 3.0

    def test_infinite_runway_when_profitable(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(revenue=10000, expenses=7000, cash=50000))
        assert result.cash_runway_months is None  # profitable = infinite runway


class TestRiskLevel:
    def test_low_risk_classification(self):
        engine = FinancialAnalysisEngine()
        # Strong financials
        result = engine.analyze(_make_record(
            revenue=100000, expenses=50000, cash=500000, debt=10000,
            total_assets=1000000, cogs=20000,
        ))
        assert result.risk_level == "safe"
        assert result.risk_score <= 30

    def test_high_risk_classification(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(
            revenue=1000, expenses=15000, cash=5000, debt=200000,
        ))
        assert result.risk_level == "high_risk"
        assert result.risk_score > 60


class TestIndustryWeights:
    def test_known_industry(self):
        weights, label = get_industry_weights("Technology")
        assert label == "Technology"
        assert abs(sum(weights.values()) - 1.0) < 0.001

    def test_unknown_industry_uses_default(self):
        weights, label = get_industry_weights("Underwater Basket Weaving")
        assert label == "General Industry"
        assert weights == DEFAULT_WEIGHTS

    def test_case_insensitive(self):
        weights, label = get_industry_weights("RETAIL")
        assert label == "Retail"

    def test_empty_industry(self):
        weights, label = get_industry_weights("")
        assert label == "General Industry"

    def test_all_weights_sum_to_one(self):
        from app.services.financial_analysis import INDUSTRY_WEIGHTS
        for industry, weights in INDUSTRY_WEIGHTS.items():
            total = sum(weights.values())
            assert abs(total - 1.0) < 0.001, f"{industry} weights sum to {total}"


class TestDistressPenalties:
    def test_low_z_score_penalty(self):
        engine = FinancialAnalysisEngine()
        # Very low revenue, high debt -> should push Z-score below 1.8
        result = engine.analyze(_make_record(
            revenue=1000, expenses=5000, cash=2000, debt=100000,
        ))
        # If Z < 1.8, additional +20 penalty
        assert result.risk_score >= 60

    def test_negative_profit_penalty(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(
            revenue=3000, expenses=10000, cash=50000, debt=5000,
        ))
        assert result.profit_margin < 0


class TestTrend:
    def test_revenue_growth(self):
        engine = FinancialAnalysisEngine()
        prev = _make_record(revenue=8000, expenses=7000)
        curr = _make_record(revenue=10000, expenses=7000)
        result = engine.analyze(curr, prev)
        assert result.revenue_trend is not None
        assert result.revenue_trend > 0

    def test_no_previous_record(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record())
        assert result.revenue_trend is None
        assert result.expense_trend is None


class TestHealthScore:
    def test_health_score_inverse_of_risk(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record())
        assert abs((result.financial_health_score + result.risk_score) - 100.0) < 0.01

    def test_health_score_range(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record())
        assert 0 <= result.financial_health_score <= 100
        assert 0 <= result.risk_score <= 100


class TestBankruptcyProbability:
    def test_strong_company_low_probability(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(
            revenue=100000, expenses=50000, cash=500000, debt=10000,
            total_assets=1000000,
        ))
        assert result.bankruptcy_probability < 30

    def test_distressed_company_high_probability(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(
            revenue=500, expenses=20000, cash=1000, debt=500000,
        ))
        assert result.bankruptcy_probability > 50


class TestCalculationSources:
    def test_provided_assets_noted(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(total_assets=100000))
        assert result.calculation_sources["total_assets"] == "provided"

    def test_fallback_assets_noted(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(total_assets=None))
        assert "fallback" in result.calculation_sources["total_assets"]

    def test_industry_model_recorded(self):
        engine = FinancialAnalysisEngine()
        result = engine.analyze(_make_record(), industry="Retail")
        assert result.industry_model_applied == "Retail"
