"""Scenario Analysis ("What-If" Engine).

Simulates business scenarios by applying adjustments to base financials and
re-running the analysis engine to produce a side-by-side comparison.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Optional

from app.services.financial_analysis import FinancialAnalysisEngine, AnalysisResult

# ---------------------------------------------------------------------------
# Predefined scenario presets
# ---------------------------------------------------------------------------
PREDEFINED_SCENARIOS: dict[str, dict] = {
    "raise_funding": {
        "label": "Raise Funding ($500K)",
        "description": "Simulate receiving a $500K cash injection.",
        "adjustments": {"cash_change_abs": 500_000},
    },
    "cut_costs_20": {
        "label": "Cut Costs 20%",
        "description": "Reduce all expenses by 20%.",
        "adjustments": {"cost_reduction_pct": 20},
    },
    "hire_5_employees": {
        "label": "Hire 5 Employees",
        "description": "Increase monthly expenses by $40K for new hires.",
        "adjustments": {"expense_change_abs": 40_000},
    },
    "increase_pricing_15": {
        "label": "Increase Pricing 15%",
        "description": "Raise revenue by 15% through pricing changes.",
        "adjustments": {"revenue_change_pct": 15},
    },
    "revenue_drop_30": {
        "label": "Revenue Drop 30%",
        "description": "Simulate a 30% decline in revenue.",
        "adjustments": {"revenue_change_pct": -30},
    },
    "take_on_debt": {
        "label": "Take on $200K Debt",
        "description": "Add $200K in new debt.",
        "adjustments": {"debt_change_abs": 200_000},
    },
}


def get_predefined_scenarios() -> list[dict]:
    """Return a serialisable list of preset scenarios for the frontend."""
    return [
        {"key": key, "label": v["label"], "description": v["description"]}
        for key, v in PREDEFINED_SCENARIOS.items()
    ]


def simulate_scenario(
    base_financials: dict,
    adjustments: dict,
    industry: str = "",
) -> dict:
    """Apply *adjustments* to *base_financials*, re-run the analysis engine,
    and return both the adjusted metrics and a metric-by-metric comparison.

    Parameters
    ----------
    base_financials : dict
        Keys expected: revenue, expenses, cash_reserves, debt, cogs,
        total_assets, current_liabilities, ebit, retained_earnings.
    adjustments : dict
        Supported keys:
          revenue_change_pct      – % change to revenue (e.g. -20 means −20 %)
          revenue_change_abs      – absolute change to revenue
          expense_change_pct      – % change to expenses
          expense_change_abs      – absolute change to expenses
          debt_change_abs         – absolute change to debt (e.g. +50000)
          cash_change_abs         – absolute change to cash reserves
          cost_reduction_pct      – % reduction applied to expenses *after*
                                    other expense adjustments

    Returns
    -------
    dict with keys:
      original   – AnalysisResult fields as dict
      adjusted   – AnalysisResult fields as dict
      comparison – {metric_name: {original, adjusted, delta, direction}}
      summary    – one-line human-readable description of the outcome
    """
    engine = FinancialAnalysisEngine()

    # -- Build the original record snapshot --
    original_record = _build_record(base_financials)
    original_result = engine.analyze(original_record, previous=None, industry=industry)

    # -- Apply adjustments with realism constraints --
    adj = dict(base_financials)  # shallow copy

    # Revenue adjustments — cap at ±50% to prevent unrealistic jumps
    rev_pct = max(-50, min(50, adjustments.get("revenue_change_pct", 0))) / 100.0
    rev_abs = adjustments.get("revenue_change_abs", 0)
    adj["revenue"] = adj.get("revenue", 0) * (1 + rev_pct) + rev_abs

    # Expense adjustments — cap cost reduction at 40%
    exp_pct = adjustments.get("expense_change_pct", 0) / 100.0
    exp_abs = adjustments.get("expense_change_abs", 0)
    cost_red_pct = min(40, adjustments.get("cost_reduction_pct", 0)) / 100.0
    adj["expenses"] = adj.get("expenses", 0) * (1 + exp_pct) + exp_abs
    adj["expenses"] = adj["expenses"] * (1 - cost_red_pct)

    # Debt and cash adjustments — debt reduction requires available cash
    debt_abs = adjustments.get("debt_change_abs", 0)
    cash_abs = adjustments.get("cash_change_abs", 0)
    if debt_abs < 0:
        # Debt reduction — cash must fund it unless offset by a cash injection
        net_cash_effect = cash_abs + debt_abs  # debt_abs is negative
        if net_cash_effect < -adj.get("cash_reserves", 0):
            # Can't reduce more debt than cash available; constrain
            max_reduction = adj.get("cash_reserves", 0) + max(cash_abs, 0)
            debt_abs = max(debt_abs, -max_reduction)
    adj["debt"] = max(adj.get("debt", 0) + debt_abs, 0)
    adj["cash_reserves"] = max(adj.get("cash_reserves", 0) + cash_abs, 0)

    adjusted_record = _build_record(adj)
    adjusted_result = engine.analyze(adjusted_record, previous=None, industry=industry)

    # -- Build comparison --
    original_dict = _result_to_dict(original_result)
    adjusted_dict = _result_to_dict(adjusted_result)

    comparison = {}
    comparison_metrics = [
        "profit_margin",
        "burn_rate",
        "cash_runway_months",
        "debt_ratio",
        "liquidity_ratio",
        "altman_z_score",
        "risk_score",
        "financial_health_score",
        "bankruptcy_probability",
    ]
    # Metrics where a LOWER value is better
    lower_is_better = {"burn_rate", "debt_ratio", "risk_score", "bankruptcy_probability"}

    for metric in comparison_metrics:
        orig_val = original_dict.get(metric)
        adj_val = adjusted_dict.get(metric)
        if orig_val is None or adj_val is None:
            comparison[metric] = {
                "original": orig_val,
                "adjusted": adj_val,
                "delta": None,
                "direction": "neutral",
            }
            continue

        delta = round(adj_val - orig_val, 4)
        if abs(delta) < 0.0001:
            direction = "neutral"
        elif metric in lower_is_better:
            direction = "better" if delta < 0 else "worse"
        else:
            direction = "better" if delta > 0 else "worse"

        comparison[metric] = {
            "original": round(orig_val, 4),
            "adjusted": round(adj_val, 4),
            "delta": delta,
            "direction": direction,
        }

    summary = _generate_summary(original_dict, adjusted_dict, comparison)

    return {
        "original": original_dict,
        "adjusted": adjusted_dict,
        "comparison": comparison,
        "summary": summary,
        "disclaimer": "Scenario assumes simplified adjustments for modeling purposes; real-world changes involve time lags and side effects.",
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_summary(original: dict, adjusted: dict, comparison: dict) -> str:
    """Generate a concise one-line summary of the scenario impact."""
    better_count = sum(1 for c in comparison.values() if c["direction"] == "better")
    worse_count = sum(1 for c in comparison.values() if c["direction"] == "worse")
    total = len(comparison)

    orig_health = original.get("financial_health_score", 0) or 0
    adj_health = adjusted.get("financial_health_score", 0) or 0
    health_delta = adj_health - orig_health

    if better_count > worse_count:
        tone = "positively"
    elif worse_count > better_count:
        tone = "negatively"
    else:
        tone = "neutrally"

    health_part = ""
    if abs(health_delta) >= 0.5:
        direction = "improving" if health_delta > 0 else "reducing"
        health_part = f", {direction} health score by {abs(health_delta):.1f} points"

    return (
        f"This scenario affects {better_count} of {total} metrics {tone}{health_part}. "
        "Scenario assumes simplified adjustments for modeling purposes; "
        "real-world changes involve time lags and side effects."
    )


def _build_record(fins: dict) -> SimpleNamespace:
    """Convert a plain dict into a record-like namespace the engine accepts."""
    return SimpleNamespace(
        id=None,
        period_month=None,
        period_year=None,
        monthly_revenue=fins.get("revenue", 0),
        monthly_expenses=fins.get("expenses", 0),
        cost_of_goods_sold=fins.get("cogs", 0),
        cash_reserves=fins.get("cash_reserves", 0),
        debt=fins.get("debt", 0),
        total_assets=fins.get("total_assets"),
        current_liabilities=fins.get("current_liabilities"),
        ebit=fins.get("ebit"),
        retained_earnings=fins.get("retained_earnings"),
    )


def _result_to_dict(result: AnalysisResult) -> dict:
    """Flatten an AnalysisResult dataclass into a plain dict."""
    return {
        "profit_margin": result.profit_margin,
        "burn_rate": result.burn_rate,
        "cash_runway_months": result.cash_runway_months,
        "revenue_trend": result.revenue_trend,
        "expense_trend": result.expense_trend,
        "debt_ratio": result.debt_ratio,
        "liquidity_ratio": result.liquidity_ratio,
        "altman_z_score": result.altman_z_score,
        "risk_score": result.risk_score,
        "risk_level": result.risk_level,
        "financial_health_score": result.financial_health_score,
        "bankruptcy_probability": result.bankruptcy_probability,
        "industry_model_applied": result.industry_model_applied,
    }
