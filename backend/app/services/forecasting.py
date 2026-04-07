"""Financial Forecasting Engine v3.0.

Projects financial metrics 12 months forward based on current data and trends.
v3.0 changes:
- Returns all 3 scenarios (best/base/worst) simultaneously
- Adds monthly variability so projections aren't perfectly smooth lines
- Risk-adjusted volatility: higher risk = more volatile forecasts
"""

from __future__ import annotations

import calendar
import math

# Scenario trend modifiers: (revenue_multiplier, expense_multiplier)
SCENARIO_MODIFIERS: dict[str, tuple[float, float]] = {
    "baseline": (1.0, 1.0),
    "optimistic": (1.5, 0.5),
    "pessimistic": (0.5, 1.5),
}


def _monthly_variability(month: int, seed: float, amplitude: float) -> float:
    """Deterministic pseudo-random variability using sine waves.
    
    Produces consistent ripple without external randomness,
    making forecasts reproducible but not artificially smooth.
    """
    # Combine two sine waves at different frequencies for natural-looking variation
    v1 = math.sin(month * 1.7 + seed * 3.14) * amplitude
    v2 = math.sin(month * 0.8 + seed * 2.17) * amplitude * 0.5
    return v1 + v2


def calculate_forecast(
    current_revenue: float,
    current_expenses: float,
    cash_reserves: float,
    debt: float,
    revenue_trend: float | None,
    expense_trend: float | None,
    months: int = 12,
    scenario: str = "baseline",
    period_month: int | None = None,
    period_year: int | None = None,
    risk_score: float = 30.0,
) -> list[dict]:
    """Return a list of monthly projections for the next *months* periods.

    v3.0: Accepts risk_score to calibrate forecast volatility.
    Higher risk = more variance in projections (reflecting uncertainty).
    """
    rev_trend = revenue_trend if revenue_trend is not None else 0.0
    exp_trend = expense_trend if expense_trend is not None else 0.0

    # Apply scenario modifiers
    rev_mult, exp_mult = SCENARIO_MODIFIERS.get(scenario, (1.0, 1.0))
    rev_trend = rev_trend * rev_mult
    exp_trend = exp_trend * exp_mult

    # Risk-adjusted volatility: higher risk = more monthly variance
    # Range: 0.5% (low risk) to 4% (critical risk)
    volatility = 0.005 + (risk_score / 100.0) * 0.035

    # Monthly debt service: 0.5 % of outstanding debt
    monthly_debt_service = debt * 0.005 if debt > 0 else 0.0

    # Seed for deterministic variability (based on scenario)
    seed = {"baseline": 1.0, "optimistic": 2.0, "pessimistic": 3.0}.get(scenario, 1.0)

    projections: list[dict] = []
    prev_rev = current_revenue
    prev_exp = current_expenses
    prev_cash = cash_reserves

    for m in range(1, months + 1):
        # Apply trend + deterministic monthly variability
        rev_var = _monthly_variability(m, seed, volatility)
        exp_var = _monthly_variability(m, seed + 5.0, volatility * 0.7)

        proj_rev = prev_rev * (1 + rev_trend + rev_var)
        proj_exp = prev_exp * (1 + exp_trend + exp_var)

        # Ensure non-negative
        proj_rev = max(0.0, proj_rev)
        proj_exp = max(0.0, proj_exp)

        proj_profit = proj_rev - proj_exp
        proj_cash = prev_cash + proj_profit - monthly_debt_service

        remaining_debt = max(debt - monthly_debt_service * m, 0)

        # Simplified risk score based on projected figures
        proj_risk = _simplified_risk_score(
            revenue=proj_rev,
            expenses=proj_exp,
            cash_balance=proj_cash,
            debt=remaining_debt,
        )

        # Burn rate & runway
        burn = max(proj_exp - proj_rev, 0) + monthly_debt_service
        if burn > 0 and proj_cash > 0:
            runway = round(proj_cash / burn, 1)
        elif burn <= 0:
            runway = None  # profitable — infinite runway
        else:
            runway = 0.0

        # Month label
        label = _month_label(m, period_month, period_year)

        projections.append(
            {
                "month": m,
                "label": label,
                "projected_revenue": round(proj_rev, 2),
                "projected_expenses": round(proj_exp, 2),
                "projected_profit": round(proj_profit, 2),
                "projected_cash_balance": round(proj_cash, 2),
                "projected_risk_score": round(proj_risk, 2),
                "burn_rate": round(burn, 2),
                "runway_months": runway,
            }
        )

        prev_rev = proj_rev
        prev_exp = proj_exp
        prev_cash = proj_cash

    return projections


def calculate_all_scenarios(
    current_revenue: float,
    current_expenses: float,
    cash_reserves: float,
    debt: float,
    revenue_trend: float | None,
    expense_trend: float | None,
    months: int = 12,
    period_month: int | None = None,
    period_year: int | None = None,
    risk_score: float = 30.0,
) -> dict[str, list[dict]]:
    """Return forecasts for all three scenarios simultaneously.

    Returns:
        dict with keys "baseline", "optimistic", "pessimistic",
        each containing a list of monthly projections.
    """
    return {
        scenario: calculate_forecast(
            current_revenue=current_revenue,
            current_expenses=current_expenses,
            cash_reserves=cash_reserves,
            debt=debt,
            revenue_trend=revenue_trend,
            expense_trend=expense_trend,
            months=months,
            scenario=scenario,
            period_month=period_month,
            period_year=period_year,
            risk_score=risk_score,
        )
        for scenario in ("baseline", "optimistic", "pessimistic")
    }


def _month_label(offset: int, base_month: int | None, base_year: int | None) -> str:
    """Generate a human-readable label like 'Apr 2025' for a given month offset."""
    if base_month is None or base_year is None:
        return f"M{offset}"
    # offset=1 means "next month after base"
    total = (base_year * 12 + base_month - 1) + offset
    year = total // 12
    month = total % 12 + 1
    return f"{calendar.month_abbr[month]} {year}"


def _simplified_risk_score(
    revenue: float,
    expenses: float,
    cash_balance: float,
    debt: float,
) -> float:
    """Compute a lightweight risk score (0–100) for a projected month.

    This intentionally mirrors the main engine's philosophy but avoids a full
    Z-score calculation since projected months lack balance-sheet detail.
    """
    score = 30.0  # baseline: moderate

    # Profit margin component
    if revenue > 0:
        margin = (revenue - expenses) / revenue * 100
        if margin >= 20:
            score -= 15
        elif margin >= 10:
            score -= 10
        elif margin >= 0:
            score -= 5
        else:
            score += 15
    else:
        score += 20

    # Cash balance component
    if cash_balance <= 0:
        score += 30
    elif cash_balance < expenses * 3:
        score += 15
    elif cash_balance < expenses * 6:
        score += 5
    else:
        score -= 10

    # Debt component
    total_assets_proxy = max(revenue * 6 + cash_balance, 1)
    debt_ratio = debt / total_assets_proxy
    if debt_ratio > 0.6:
        score += 15
    elif debt_ratio > 0.3:
        score += 5
    else:
        score -= 5

    return max(0.0, min(100.0, score))
