"""Unit tests for the Scenario Analysis engine."""
import pytest
from app.services.scenario import simulate_scenario, get_predefined_scenarios, PREDEFINED_SCENARIOS


BASE_FINANCIALS = {
    "revenue": 50000,
    "expenses": 35000,
    "cash_reserves": 100000,
    "debt": 20000,
    "cogs": 10000,
    "total_assets": None,
    "current_liabilities": None,
    "ebit": None,
    "retained_earnings": None,
}


class TestSimulateScenario:
    def test_raise_funding_preset(self):
        preset = PREDEFINED_SCENARIOS["raise_funding"]
        result = simulate_scenario(BASE_FINANCIALS, preset["adjustments"])
        assert "original" in result
        assert "adjusted" in result
        assert "comparison" in result
        assert "summary" in result
        # Cash injection should increase cash reserves
        assert result["adjusted"]["cash_runway_months"] is None or (
            result["comparison"]["risk_score"]["direction"] in ("better", "neutral")
        )

    def test_adding_cash_lowers_risk(self):
        result = simulate_scenario(
            BASE_FINANCIALS,
            {"cash_change_abs": 500_000},
        )
        orig_risk = result["original"]["risk_score"]
        adj_risk = result["adjusted"]["risk_score"]
        assert adj_risk <= orig_risk, (
            f"Adding cash should not increase risk: {orig_risk} -> {adj_risk}"
        )

    def test_predefined_scenarios_returns_all_6(self):
        presets = get_predefined_scenarios()
        assert len(presets) == 6
        keys = {p["key"] for p in presets}
        expected = {"raise_funding", "cut_costs_20", "hire_5_employees",
                    "increase_pricing_15", "revenue_drop_30", "take_on_debt"}
        assert keys == expected

    def test_scenario_result_structure(self):
        result = simulate_scenario(BASE_FINANCIALS, {"revenue_change_pct": 10})
        assert "original" in result
        assert "adjusted" in result
        assert "comparison" in result
        assert "summary" in result
        assert "disclaimer" in result
        # Comparison should have expected metrics
        for metric in ("profit_margin", "risk_score", "debt_ratio"):
            assert metric in result["comparison"]
            assert "original" in result["comparison"][metric]
            assert "adjusted" in result["comparison"][metric]
            assert "delta" in result["comparison"][metric]
            assert "direction" in result["comparison"][metric]
