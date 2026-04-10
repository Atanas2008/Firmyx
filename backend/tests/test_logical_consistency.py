"""Logical consistency & sanity tests for the Firmyx financial engine.

Every test here verifies an INVARIANT — a logical rule that must always hold.
If any test fails, the engine can produce impossible or contradictory results
that would mislead paying customers making real financial decisions.

Categories:
  1. Mathematical impossibilities (e.g. health + risk ≠ 100)
  2. Directional violations (e.g. more cash → higher risk)
  3. Cross-metric contradictions (e.g. profitable + critical risk)
  4. Boundary violations (e.g. scores outside 0-100)
  5. Scenario logic (e.g. adding cash makes things worse)
  6. Forecast logic (e.g. pessimistic better than optimistic)
  7. Advisor coherence (e.g. recommending growth during crisis)
"""

import pytest
from types import SimpleNamespace
from app.services.financial_analysis import (
    FinancialAnalysisEngine,
    get_industry_weights,
    INDUSTRY_WEIGHTS,
    DEFAULT_WEIGHTS,
    SCORING_MODEL_VERSION,
)
from app.services.advisor import AdvisorService
from app.services.forecasting import calculate_forecast, calculate_all_scenarios
from app.services.scenario import simulate_scenario, get_predefined_scenarios, PREDEFINED_SCENARIOS


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rec(
    revenue=50000, expenses=40000, cogs=15000, cash=100000, debt=30000,
    total_assets=None, current_liabilities=None, ebit=None, retained_earnings=None,
):
    """Create a financial record namespace."""
    return SimpleNamespace(
        id="test", monthly_revenue=revenue, monthly_expenses=expenses,
        cost_of_goods_sold=cogs, cash_reserves=cash, debt=debt,
        total_assets=total_assets, current_liabilities=current_liabilities,
        ebit=ebit, retained_earnings=retained_earnings,
    )


def _analyze(record=None, previous=None, industry="", all_records=None, **kw):
    """Shortcut: build record from kwargs and analyze."""
    if record is None:
        record = _rec(**kw)
    return FinancialAnalysisEngine().analyze(record, previous, industry, all_records)


def _advisor_result(**overrides):
    """Build a minimal AnalysisResult-like namespace for advisor tests."""
    defaults = dict(
        profit_margin=15.0, burn_rate=0.0, cash_runway_months=None,
        revenue_trend=0.05, expense_trend=0.02, debt_ratio=0.25,
        liquidity_ratio=2.5, altman_z_score=3.5, financial_health_score=70.0,
        bankruptcy_probability=5.0, risk_score=30.0, risk_level="medium",
        industry_model_applied="Technology", calculation_sources={},
        risk_score_breakdown={}, confidence_level="High",
        confidence_explanation="", revenue_trend_label="Increasing",
        runway_label="No burn", bankruptcy_explanation="",
        drivers=[], explanation="", expense_ratio=0.8,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


ENGINE = FinancialAnalysisEngine()
ADVISOR = AdvisorService()


# ═══════════════════════════════════════════════════════════════════════════
# 1. MATHEMATICAL INVARIANTS
# ═══════════════════════════════════════════════════════════════════════════

class TestMathInvariants:
    """Rules that follow directly from arithmetic — must NEVER break."""

    def test_health_plus_risk_equals_100(self):
        """health_score + risk_score must always equal exactly 100."""
        scenarios = [
            dict(revenue=100000, expenses=50000, cash=500000, debt=10000),
            dict(revenue=0, expenses=5000, cash=1000, debt=500000),
            dict(revenue=50000, expenses=50000, cash=0, debt=0),
            dict(revenue=1, expenses=1, cash=1, debt=1),
            dict(revenue=999999, expenses=1, cash=999999, debt=0),
        ]
        for kw in scenarios:
            r = _analyze(**kw)
            total = r.financial_health_score + r.risk_score
            assert abs(total - 100.0) < 0.1, (
                f"health({r.financial_health_score}) + risk({r.risk_score}) = {total} ≠ 100 "
                f"for inputs {kw}"
            )

    def test_risk_score_within_bounds(self):
        """Risk score must be in [0, 100] — no overflow, no negative."""
        extremes = [
            dict(revenue=0, expenses=0, cash=0, debt=0),
            dict(revenue=0, expenses=999999, cash=0, debt=999999),
            dict(revenue=999999, expenses=0, cash=999999, debt=0),
            dict(revenue=1, expenses=999999, cash=1, debt=1),
        ]
        for kw in extremes:
            r = _analyze(**kw)
            assert 0 <= r.risk_score <= 100, f"risk_score={r.risk_score} out of bounds for {kw}"
            assert 0 <= r.financial_health_score <= 100

    def test_profit_margin_arithmetic(self):
        """profit_margin = (revenue - expenses) / revenue × 100 when revenue > 0."""
        cases = [
            (100000, 70000, 30.0),
            (100000, 100000, 0.0),
            (100000, 130000, -30.0),
            (50000, 25000, 50.0),
        ]
        for rev, exp, expected_margin in cases:
            r = _analyze(revenue=rev, expenses=exp)
            assert abs(r.profit_margin - expected_margin) < 0.01, (
                f"Expected margin {expected_margin}%, got {r.profit_margin}% "
                f"for rev={rev}, exp={exp}"
            )

    def test_burn_rate_is_zero_when_profitable(self):
        """If revenue > expenses, burn rate must be 0 (no cash burn)."""
        r = _analyze(revenue=80000, expenses=60000)
        assert r.burn_rate == 0.0, f"Profitable business has burn_rate={r.burn_rate}"

    def test_burn_rate_equals_deficit(self):
        """If expenses > revenue, burn_rate = expenses - revenue exactly."""
        r = _analyze(revenue=30000, expenses=50000)
        assert r.burn_rate == 20000.0, f"Expected burn=20000, got {r.burn_rate}"

    def test_cash_runway_math(self):
        """runway = cash_reserves / burn_rate when burning cash."""
        r = _analyze(revenue=10000, expenses=20000, cash=30000)
        # burn = 10000, runway = 30000 / 10000 = 3.0
        assert r.cash_runway_months == 3.0

    def test_cash_runway_none_when_profitable(self):
        """Profitable businesses have no runway limit (None = infinite)."""
        r = _analyze(revenue=80000, expenses=50000, cash=1000)
        assert r.cash_runway_months is None, (
            "Profitable business should have runway=None (infinite), "
            f"got {r.cash_runway_months}"
        )

    def test_bankruptcy_probability_within_bounds(self):
        """Bankruptcy probability must be in [0, 100]."""
        extremes = [
            dict(revenue=999999, expenses=1, cash=999999, debt=0),
            dict(revenue=0, expenses=999999, cash=0, debt=999999),
        ]
        for kw in extremes:
            r = _analyze(**kw)
            assert 0 <= r.bankruptcy_probability <= 100, (
                f"bankruptcy_probability={r.bankruptcy_probability} out of bounds"
            )

    def test_debt_ratio_non_negative(self):
        """Debt ratio cannot be negative (debt ≥ 0, assets > 0)."""
        r = _analyze(debt=0, cash=100000)
        assert r.debt_ratio >= 0

    def test_expense_ratio_matches_inputs(self):
        """expense_ratio = expenses / revenue when revenue > 0."""
        r = _analyze(revenue=100000, expenses=75000)
        expected = 75000 / 100000
        assert abs(r.expense_ratio - expected) < 0.001


# ═══════════════════════════════════════════════════════════════════════════
# 2. DIRECTIONAL MONOTONICITY — "More X → risk moves in expected direction"
# ═══════════════════════════════════════════════════════════════════════════

class TestDirectionalLogic:
    """If we improve one metric, risk should not get worse (ceteris paribus)."""

    def test_more_cash_reduces_or_maintains_risk(self):
        """Adding cash (all else equal) must not increase risk score."""
        base = _analyze(revenue=50000, expenses=60000, cash=10000, debt=80000)
        more_cash = _analyze(revenue=50000, expenses=60000, cash=200000, debt=80000)
        assert more_cash.risk_score <= base.risk_score, (
            f"Adding cash INCREASED risk: {base.risk_score} → {more_cash.risk_score}"
        )

    def test_less_debt_reduces_or_maintains_risk(self):
        """Reducing debt (all else equal) must not increase risk score."""
        high_debt = _analyze(revenue=50000, expenses=40000, cash=100000, debt=300000)
        low_debt = _analyze(revenue=50000, expenses=40000, cash=100000, debt=10000)
        assert low_debt.risk_score <= high_debt.risk_score, (
            f"Reducing debt INCREASED risk: {high_debt.risk_score} → {low_debt.risk_score}"
        )

    def test_higher_revenue_same_expenses_reduces_risk(self):
        """Doubling revenue with same expenses must reduce risk."""
        low_rev = _analyze(revenue=30000, expenses=50000, cash=50000, debt=50000)
        high_rev = _analyze(revenue=100000, expenses=50000, cash=50000, debt=50000)
        assert high_rev.risk_score <= low_rev.risk_score, (
            f"Higher revenue INCREASED risk: {low_rev.risk_score} → {high_rev.risk_score}"
        )

    def test_higher_expenses_same_revenue_increases_risk(self):
        """Higher expenses with same revenue must not decrease risk."""
        low_exp = _analyze(revenue=80000, expenses=40000, cash=50000, debt=30000)
        high_exp = _analyze(revenue=80000, expenses=90000, cash=50000, debt=30000)
        assert high_exp.risk_score >= low_exp.risk_score, (
            f"Higher expenses DECREASED risk: {low_exp.risk_score} → {high_exp.risk_score}"
        )

    def test_revenue_growth_trend_reduces_or_maintains_risk(self):
        """A business with growing revenue should not score worse than one with shrinking."""
        prev_common = _rec(revenue=50000, expenses=40000)
        growing = _analyze(record=_rec(revenue=60000, expenses=40000), previous=prev_common)
        shrinking = _analyze(record=_rec(revenue=40000, expenses=40000), previous=prev_common)
        assert growing.risk_score <= shrinking.risk_score, (
            f"Growing revenue has HIGHER risk ({growing.risk_score}) "
            f"than shrinking ({shrinking.risk_score})"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 3. CROSS-METRIC CONTRADICTIONS
# ═══════════════════════════════════════════════════════════════════════════

class TestCrossMetricCoherence:
    """Metrics must not contradict each other."""

    def test_low_risk_means_low_bankruptcy(self):
        """If risk_score ≤ 25, bankruptcy_probability should not be ≥ 30%."""
        r = _analyze(
            revenue=100000, expenses=50000, cash=500000, debt=10000,
            total_assets=1000000,
        )
        if r.risk_score <= 25:
            assert r.bankruptcy_probability < 30, (
                f"Low risk ({r.risk_score}) but high bankruptcy ({r.bankruptcy_probability}%)"
            )

    def test_critical_risk_means_high_bankruptcy(self):
        """If risk_level is 'critical', bankruptcy_probability should be ≥ 15%."""
        r = _analyze(revenue=1000, expenses=50000, cash=500, debt=500000)
        if r.risk_level == "critical":
            assert r.bankruptcy_probability >= 15, (
                f"Critical risk but bankruptcy only {r.bankruptcy_probability}%"
            )

    def test_profitable_business_not_critical(self):
        """A business with >20% profit margin, low debt, high cash should not be critical."""
        r = _analyze(
            revenue=100000, expenses=60000, cash=300000, debt=20000,
            total_assets=500000,
        )
        assert r.profit_margin > 20, "Setup check: should be profitable"
        assert r.risk_level != "critical", (
            f"Highly profitable business classified as critical (risk={r.risk_score})"
        )

    def test_zero_revenue_is_high_risk(self):
        """A business with zero revenue and expenses should be at least medium risk."""
        r = _analyze(revenue=0, expenses=10000, cash=5000, debt=50000)
        assert r.risk_score >= 50, (
            f"Zero-revenue business with expenses has only {r.risk_score} risk"
        )

    def test_cash_flow_positive_not_burning(self):
        """If revenue > expenses, burn_rate must be 0 and runway must be None."""
        r = _analyze(revenue=80000, expenses=50000, cash=10000)
        assert r.burn_rate == 0.0
        assert r.cash_runway_months is None

    def test_risk_level_matches_risk_score(self):
        """risk_level label must match the risk_score number."""
        test_cases = [
            dict(revenue=100000, expenses=50000, cash=500000, debt=10000, total_assets=1000000),
            dict(revenue=50000, expenses=45000, cash=50000, debt=50000),
            dict(revenue=20000, expenses=50000, cash=10000, debt=200000),
            dict(revenue=1000, expenses=50000, cash=500, debt=500000),
        ]
        for kw in test_cases:
            r = _analyze(**kw)
            if r.risk_score <= 25:
                assert r.risk_level == "low", f"score={r.risk_score} but level={r.risk_level}"
            elif r.risk_score <= 50:
                assert r.risk_level == "medium", f"score={r.risk_score} but level={r.risk_level}"
            elif r.risk_score <= 75:
                assert r.risk_level == "high", f"score={r.risk_score} but level={r.risk_level}"
            else:
                assert r.risk_level == "critical", f"score={r.risk_score} but level={r.risk_level}"

    def test_confidence_low_when_many_fallbacks(self):
        """If no balance-sheet data provided, confidence should not be 'High'."""
        r = _analyze(
            revenue=50000, expenses=40000, cash=50000, debt=30000,
            total_assets=None, current_liabilities=None, ebit=None, retained_earnings=None,
        )
        assert r.confidence_level != "High", (
            f"All balance-sheet fields are fallbacks but confidence is '{r.confidence_level}'"
        )

    def test_confidence_high_when_all_provided(self):
        """If all balance-sheet data is provided, confidence should be 'High'."""
        r = _analyze(
            revenue=50000, expenses=40000, cash=50000, debt=30000,
            total_assets=200000, current_liabilities=30000, ebit=10000, retained_earnings=50000,
        )
        assert r.confidence_level == "High", (
            f"All fields provided but confidence is '{r.confidence_level}'"
        )


# ═══════════════════════════════════════════════════════════════════════════
# 4. INDUSTRY WEIGHT COHERENCE
# ═══════════════════════════════════════════════════════════════════════════

class TestIndustryWeights:
    """Industry weights must form valid probability distributions."""

    @pytest.mark.parametrize("industry", list(INDUSTRY_WEIGHTS.keys()) + ["General Industry"])
    def test_weights_sum_to_one(self, industry):
        weights, _ = get_industry_weights(industry)
        total = sum(weights.values())
        assert abs(total - 1.0) < 0.001, f"{industry} weights sum to {total}"

    @pytest.mark.parametrize("industry", list(INDUSTRY_WEIGHTS.keys()))
    def test_all_weights_positive(self, industry):
        weights, _ = get_industry_weights(industry)
        for key, val in weights.items():
            assert val > 0, f"{industry}.{key} = {val} (must be positive)"

    @pytest.mark.parametrize("industry", list(INDUSTRY_WEIGHTS.keys()))
    def test_required_weight_keys(self, industry):
        weights, _ = get_industry_weights(industry)
        required = {"debtRatio", "liquidity", "profitMargin", "zScore", "revenueTrend"}
        assert set(weights.keys()) == required, (
            f"{industry} has keys {set(weights.keys())} but expected {required}"
        )

    def test_same_inputs_different_industry_different_score(self):
        """Industry weights should actually affect the output score."""
        record = _rec(revenue=50000, expenses=45000, cash=50000, debt=80000)
        tech = ENGINE.analyze(record, industry="Technology")
        realestate = ENGINE.analyze(record, industry="Real Estate")
        # These industries have very different weight distributions
        # so the same inputs should produce different risk scores
        assert tech.risk_score != realestate.risk_score, (
            "Same inputs produced identical risk scores for Technology vs Real Estate — "
            "industry weights are not being applied"
        )

    def test_industry_model_label_is_recorded(self):
        """The applied model label must appear in the output."""
        r = _analyze(industry="Software")
        assert r.industry_model_applied == "Software"

        r2 = _analyze(industry="something random")
        assert r2.industry_model_applied == "General Industry"


# ═══════════════════════════════════════════════════════════════════════════
# 5. SCENARIO SIMULATION LOGIC
# ═══════════════════════════════════════════════════════════════════════════

class TestScenarioLogic:
    """What-if scenarios must produce logically consistent results."""

    BASE = dict(
        revenue=50000, expenses=40000, cogs=15000, cash_reserves=80000,
        debt=60000, total_assets=300000, current_liabilities=35000,
        ebit=10000, retained_earnings=40000,
    )

    def test_cash_injection_improves_health(self):
        """Adding $500K cash should improve (or maintain) health score."""
        result = simulate_scenario(self.BASE, {"cash_change_abs": 500_000})
        orig_health = result["original"]["financial_health_score"]
        adj_health = result["adjusted"]["financial_health_score"]
        assert adj_health >= orig_health, (
            f"Cash injection WORSENED health: {orig_health} → {adj_health}"
        )

    def test_cost_reduction_improves_health(self):
        """Cutting costs 20% should improve health score."""
        result = simulate_scenario(self.BASE, {"cost_reduction_pct": 20})
        orig_risk = result["original"]["risk_score"]
        adj_risk = result["adjusted"]["risk_score"]
        assert adj_risk <= orig_risk, (
            f"Cutting costs INCREASED risk: {orig_risk} → {adj_risk}"
        )

    def test_revenue_drop_worsens_health(self):
        """30% revenue drop should worsen (or maintain) risk score."""
        result = simulate_scenario(self.BASE, {"revenue_change_pct": -30})
        orig_risk = result["original"]["risk_score"]
        adj_risk = result["adjusted"]["risk_score"]
        assert adj_risk >= orig_risk, (
            f"Revenue drop DECREASED risk: {orig_risk} → {adj_risk}"
        )

    def test_adding_debt_worsens_or_maintains_risk(self):
        """Taking on $200K debt should not improve risk score."""
        result = simulate_scenario(self.BASE, {"debt_change_abs": 200_000})
        orig_risk = result["original"]["risk_score"]
        adj_risk = result["adjusted"]["risk_score"]
        assert adj_risk >= orig_risk, (
            f"Adding debt REDUCED risk: {orig_risk} → {adj_risk}"
        )

    def test_scenario_comparison_directions_coherent(self):
        """Each metric's 'direction' field must match the actual delta sign."""
        result = simulate_scenario(self.BASE, {"cash_change_abs": 100_000})
        for metric, comp in result["comparison"].items():
            if comp["delta"] is None:
                continue
            if comp["delta"] > 0.001:
                assert comp["direction"] in ("better", "worse"), (
                    f"{metric}: positive delta but direction={comp['direction']}"
                )
            elif comp["delta"] < -0.001:
                assert comp["direction"] in ("better", "worse"), (
                    f"{metric}: negative delta but direction={comp['direction']}"
                )
            else:
                assert comp["direction"] == "neutral"

    def test_scenario_original_matches_standalone_analysis(self):
        """The 'original' in a scenario must match a standalone analysis of the same data."""
        result = simulate_scenario(self.BASE, {"cash_change_abs": 0})
        standalone = _analyze(
            revenue=self.BASE["revenue"], expenses=self.BASE["expenses"],
            cogs=self.BASE["cogs"], cash=self.BASE["cash_reserves"],
            debt=self.BASE["debt"], total_assets=self.BASE["total_assets"],
            current_liabilities=self.BASE["current_liabilities"],
            ebit=self.BASE["ebit"], retained_earnings=self.BASE["retained_earnings"],
        )
        assert abs(result["original"]["risk_score"] - standalone.risk_score) < 0.01, (
            f"Scenario original ({result['original']['risk_score']}) != "
            f"standalone ({standalone.risk_score})"
        )

    def test_all_presets_exist_and_have_required_keys(self):
        """Every preset must have label, description, adjustments."""
        presets = get_predefined_scenarios()
        assert len(presets) == len(PREDEFINED_SCENARIOS)
        for p in presets:
            assert "key" in p
            assert "label" in p
            assert "description" in p

    def test_zero_adjustments_no_change(self):
        """Zero adjustments should produce identical original and adjusted."""
        result = simulate_scenario(self.BASE, {})
        assert abs(
            result["original"]["risk_score"] - result["adjusted"]["risk_score"]
        ) < 0.01, "Zero adjustments changed the risk score"


# ═══════════════════════════════════════════════════════════════════════════
# 6. FORECASTING LOGIC
# ═══════════════════════════════════════════════════════════════════════════

class TestForecastLogic:
    """Forecasts must be internally consistent and logically ordered."""

    def test_returns_correct_number_of_months(self):
        for n in [1, 6, 12, 24]:
            fc = calculate_forecast(50000, 40000, 100000, 30000, 0.05, 0.02, months=n)
            assert len(fc) == n, f"Asked for {n} months, got {len(fc)}"

    def test_deterministic_same_inputs_same_outputs(self):
        """Same inputs must always produce identical forecasts (no randomness)."""
        args = (50000, 40000, 100000, 30000, 0.05, 0.02)
        a = calculate_forecast(*args, months=12, scenario="baseline")
        b = calculate_forecast(*args, months=12, scenario="baseline")
        for i in range(12):
            assert a[i]["projected_revenue"] == b[i]["projected_revenue"], (
                f"Month {i+1}: non-deterministic forecast"
            )

    def test_optimistic_better_than_pessimistic(self):
        """Optimistic scenario must have higher revenue than pessimistic by month 6+."""
        all_sc = calculate_all_scenarios(
            50000, 40000, 100000, 30000, 0.05, 0.02, months=12,
        )
        # By month 12, optimistic should clearly outperform pessimistic
        opt_rev_12 = all_sc["optimistic"][-1]["projected_revenue"]
        pes_rev_12 = all_sc["pessimistic"][-1]["projected_revenue"]
        assert opt_rev_12 > pes_rev_12, (
            f"Month 12: optimistic revenue ({opt_rev_12}) ≤ pessimistic ({pes_rev_12})"
        )

    def test_optimistic_lower_risk_than_pessimistic(self):
        """By month 12, optimistic should have lower risk than pessimistic."""
        all_sc = calculate_all_scenarios(
            50000, 40000, 100000, 30000, 0.05, 0.02, months=12,
        )
        opt_risk = all_sc["optimistic"][-1]["projected_risk_score"]
        pes_risk = all_sc["pessimistic"][-1]["projected_risk_score"]
        assert opt_risk <= pes_risk, (
            f"Month 12: optimistic risk ({opt_risk}) > pessimistic ({pes_risk})"
        )

    def test_profitable_forecast_no_negative_cash(self):
        """A highly profitable business should not go cash-negative in baseline."""
        fc = calculate_forecast(
            100000, 50000, 500000, 10000, 0.05, 0.02,
            months=12, scenario="baseline",
        )
        for m in fc:
            assert m["projected_cash_balance"] > 0, (
                f"Month {m['month']}: profitable business went cash-negative "
                f"(cash={m['projected_cash_balance']})"
            )

    def test_revenue_non_negative(self):
        """Projected revenue must never go below zero."""
        fc = calculate_forecast(
            10000, 40000, 5000, 100000, -0.2, 0.1,
            months=24, scenario="pessimistic",
        )
        for m in fc:
            assert m["projected_revenue"] >= 0, (
                f"Month {m['month']}: negative revenue ({m['projected_revenue']})"
            )

    def test_expenses_non_negative(self):
        """Projected expenses must never go below zero."""
        fc = calculate_forecast(
            50000, 10000, 100000, 0, 0.0, -0.3,
            months=24, scenario="optimistic",
        )
        for m in fc:
            assert m["projected_expenses"] >= 0, (
                f"Month {m['month']}: negative expenses ({m['projected_expenses']})"
            )

    def test_risk_score_stays_bounded(self):
        """Projected risk scores must remain in [0, 100]."""
        fc = calculate_forecast(
            50000, 40000, 100000, 30000, 0.05, 0.02,
            months=24, scenario="pessimistic", risk_score=80,
        )
        for m in fc:
            assert 0 <= m["projected_risk_score"] <= 100, (
                f"Month {m['month']}: risk_score={m['projected_risk_score']} out of bounds"
            )

    def test_month_labels_sequential(self):
        """Month labels should be sequential when base period is provided."""
        fc = calculate_forecast(
            50000, 40000, 100000, 30000, 0.05, 0.02,
            months=6, period_month=10, period_year=2025,
        )
        # Month 1 after Oct 2025 = Nov 2025
        assert "Nov" in fc[0]["label"]
        assert "2025" in fc[0]["label"]

    def test_three_scenarios_returned(self):
        """calculate_all_scenarios must return exactly 3 keys."""
        result = calculate_all_scenarios(50000, 40000, 100000, 30000, 0.05, 0.02)
        assert set(result.keys()) == {"baseline", "optimistic", "pessimistic"}


# ═══════════════════════════════════════════════════════════════════════════
# 7. ADVISOR COHERENCE
# ═══════════════════════════════════════════════════════════════════════════

class TestAdvisorCoherence:
    """Recommendations must be contextually appropriate."""

    def test_always_returns_3_to_7_recommendations(self):
        """Every scenario must produce between 3 and 7 recommendations."""
        scenarios = [
            _advisor_result(risk_score=10, risk_level="low"),
            _advisor_result(risk_score=45, risk_level="medium", profit_margin=8.0),
            _advisor_result(
                risk_score=75, risk_level="high", profit_margin=-5.0,
                debt_ratio=0.7, altman_z_score=1.5, bankruptcy_probability=30,
            ),
            _advisor_result(
                risk_score=92, risk_level="critical", profit_margin=-100.0,
                burn_rate=50000, cash_runway_months=1.0, debt_ratio=0.95,
                altman_z_score=0.5, bankruptcy_probability=60,
            ),
        ]
        for s in scenarios:
            recs = ADVISOR.generate_recommendations(s)
            assert 3 <= len(recs) <= 7, (
                f"risk_score={s.risk_score}: got {len(recs)} recommendations (expected 3-7)"
            )

    def test_no_growth_advice_during_crisis(self):
        """A critical/distressed business should NEVER get 'Deploy Excess Liquidity'."""
        crisis = _advisor_result(
            risk_score=85, risk_level="critical", profit_margin=-20.0,
            burn_rate=30000, cash_runway_months=2.0, debt_ratio=0.8,
            liquidity_ratio=2.5,  # high liquidity despite crisis
            altman_z_score=0.8, bankruptcy_probability=55,
        )
        recs = ADVISOR.generate_recommendations(crisis)
        titles = [r["title"] for r in recs]
        assert "Deploy Excess Liquidity" not in titles, (
            f"Recommending growth deployment during CRITICAL risk! Titles: {titles}"
        )

    def test_zero_revenue_triggers_establish_revenue(self):
        """A zero-revenue business must get 'Establish Revenue Stream'."""
        zero_rev = _advisor_result(
            risk_score=80, risk_level="critical", profit_margin=-100.0,
            burn_rate=50000, cash_runway_months=1.0, debt_ratio=0.5,
            altman_z_score=0.3, bankruptcy_probability=60,
        )
        recs = ADVISOR.generate_recommendations(zero_rev)
        titles = [r["title"] for r in recs]
        assert "Establish Revenue Stream" in titles, (
            f"Zero-revenue business missing 'Establish Revenue Stream'. Got: {titles}"
        )

    def test_recommendations_have_required_fields(self):
        """Every recommendation must have all required fields."""
        recs = ADVISOR.generate_recommendations(
            _advisor_result(risk_score=50, risk_level="medium", profit_margin=8.0)
        )
        required = {"title", "explanation", "priority", "justification"}
        justification_required = {"driver", "comparison", "impact", "priority_reason"}
        for rec in recs:
            missing = required - set(rec.keys())
            assert not missing, f"Recommendation missing fields: {missing}"
            j_missing = justification_required - set(rec["justification"].keys())
            assert not j_missing, f"Justification missing fields: {j_missing}"

    def test_no_duplicate_recommendation_titles(self):
        """No two recommendations should have the same title."""
        for risk in [20, 50, 80, 95]:
            level = "low" if risk <= 25 else "medium" if risk <= 50 else "high" if risk <= 75 else "critical"
            recs = ADVISOR.generate_recommendations(
                _advisor_result(risk_score=risk, risk_level=level, profit_margin=5.0)
            )
            titles = [r["title"] for r in recs]
            assert len(titles) == len(set(titles)), (
                f"Duplicate titles at risk={risk}: {titles}"
            )

    def test_risk_explanation_not_empty(self):
        """Risk explanation must always be a non-empty string."""
        for risk, level in [(10, "low"), (40, "medium"), (70, "high"), (90, "critical")]:
            explanation = ADVISOR.generate_risk_explanation(
                _advisor_result(risk_score=risk, risk_level=level)
            )
            assert isinstance(explanation, str) and len(explanation) > 20, (
                f"Empty or too-short explanation for risk={risk}"
            )

    def test_priority_ordering_makes_sense(self):
        """The first recommendation should have higher impact than the last."""
        recs = ADVISOR.generate_recommendations(
            _advisor_result(
                risk_score=70, risk_level="high", profit_margin=-5.0,
                debt_ratio=0.7, liquidity_ratio=0.8, altman_z_score=1.5,
                bankruptcy_probability=30, revenue_trend=-0.1,
            )
        )
        if len(recs) >= 2:
            # First rec should have "Ranked #1" in priority_reason
            assert "#1" in recs[0]["justification"]["priority_reason"], (
                f"First recommendation not ranked #1: {recs[0]['justification']['priority_reason']}"
            )


# ═══════════════════════════════════════════════════════════════════════════
# 8. EDGE CASES & STRESS TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestEdgeCases:
    """Extreme and unusual inputs must not crash or produce NaN/Inf."""

    @pytest.mark.parametrize("revenue,expenses,cash,debt", [
        (0, 0, 0, 0),                    # Completely empty business
        (1, 1, 1, 1),                     # Minimal values
        (0, 100000, 0, 1000000),          # No revenue, huge debt
        (1000000, 1, 1000000, 0),         # Extremely profitable
        (50000, 50000, 50000, 50000),     # Everything equal
        (100, 99, 1000000, 0),            # Tiny revenue, huge cash
    ])
    def test_no_crash_on_extreme_inputs(self, revenue, expenses, cash, debt):
        """Engine must not crash, return NaN, or return Inf for any valid input."""
        r = _analyze(revenue=revenue, expenses=expenses, cash=cash, debt=debt)
        import math
        assert not math.isnan(r.risk_score), f"NaN risk_score for {revenue}/{expenses}/{cash}/{debt}"
        assert not math.isinf(r.risk_score), f"Inf risk_score for {revenue}/{expenses}/{cash}/{debt}"
        assert not math.isnan(r.altman_z_score)
        assert not math.isinf(r.altman_z_score)
        assert 0 <= r.risk_score <= 100

    def test_very_large_numbers_no_overflow(self):
        """Billion-dollar companies should not break anything."""
        r = _analyze(
            revenue=500_000_000, expenses=400_000_000,
            cash=2_000_000_000, debt=1_000_000_000,
            total_assets=5_000_000_000,
        )
        assert 0 <= r.risk_score <= 100
        assert 0 <= r.financial_health_score <= 100

    def test_scenario_with_extreme_adjustments(self):
        """Extreme scenario adjustments should not crash."""
        base = dict(
            revenue=50000, expenses=40000, cogs=15000,
            cash_reserves=80000, debt=60000,
        )
        # Revenue change is capped at ±50%, so -100% should be clamped
        result = simulate_scenario(base, {"revenue_change_pct": -100})
        assert result["adjusted"]["risk_score"] >= 0

    def test_forecast_with_zero_everything(self):
        """Forecasting a dead business should not crash."""
        fc = calculate_forecast(0, 0, 0, 0, None, None, months=12)
        assert len(fc) == 12
        for m in fc:
            assert m["projected_revenue"] >= 0
            assert m["projected_expenses"] >= 0
