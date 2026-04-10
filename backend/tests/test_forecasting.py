"""Unit tests for the Financial Forecasting engine."""
import pytest
from app.services.forecasting import calculate_forecast, calculate_all_scenarios


BASE_KWARGS = {
    "current_revenue": 50000,
    "current_expenses": 35000,
    "cash_reserves": 100000,
    "debt": 20000,
    "revenue_trend": 0.05,
    "expense_trend": 0.02,
}


class TestCalculateForecast:
    def test_returns_correct_number_of_months(self):
        for months in (6, 12, 24):
            result = calculate_forecast(**BASE_KWARGS, months=months)
            assert len(result) == months

    def test_pessimistic_has_lower_revenue_than_baseline(self):
        baseline = calculate_forecast(**BASE_KWARGS, months=12, scenario="baseline")
        pessimistic = calculate_forecast(**BASE_KWARGS, months=12, scenario="pessimistic")
        # Compare total projected revenue across all months
        baseline_total = sum(m["projected_revenue"] for m in baseline)
        pessimistic_total = sum(m["projected_revenue"] for m in pessimistic)
        assert pessimistic_total < baseline_total, (
            f"Pessimistic ({pessimistic_total:.0f}) should be lower than baseline ({baseline_total:.0f})"
        )

    def test_deterministic_variability(self):
        """Same inputs should produce identical outputs (no randomness)."""
        result1 = calculate_forecast(**BASE_KWARGS, months=12, scenario="baseline")
        result2 = calculate_forecast(**BASE_KWARGS, months=12, scenario="baseline")
        for m1, m2 in zip(result1, result2):
            assert m1["projected_revenue"] == m2["projected_revenue"]
            assert m1["projected_expenses"] == m2["projected_expenses"]
            assert m1["projected_cash_balance"] == m2["projected_cash_balance"]

    def test_projection_structure(self):
        result = calculate_forecast(**BASE_KWARGS, months=3)
        for proj in result:
            assert "month" in proj
            assert "projected_revenue" in proj
            assert "projected_expenses" in proj
            assert "projected_profit" in proj
            assert "projected_cash_balance" in proj
            assert "projected_risk_score" in proj

    def test_all_scenarios_returns_three(self):
        result = calculate_all_scenarios(**BASE_KWARGS, months=6)
        assert "baseline" in result
        assert "optimistic" in result
        assert "pessimistic" in result
        for scenario in result.values():
            assert len(scenario) == 6
