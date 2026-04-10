from typing import List, Optional
from app.services.financial_analysis import AnalysisResult, FinancialAnalysisEngine, get_industry_weights
from app.models.risk_analysis import RiskLevel

# ---------------------------------------------------------------------------
# Global risk-state classification used to gate recommendations.
# v3.0: 4-tier state classification matching the upgraded risk model.
# ---------------------------------------------------------------------------
_STATE_CRITICAL = "CRITICAL"
_STATE_DISTRESSED = "DISTRESSED"
_STATE_ELEVATED = "ELEVATED"
_STATE_STABLE = "STABLE"


def _system_state(result: AnalysisResult) -> str:
    """Classify the overall business risk posture for recommendation gating."""
    if result.risk_score >= 80 or result.bankruptcy_probability >= 50:
        return _STATE_CRITICAL
    if result.risk_score >= 60 or result.bankruptcy_probability >= 30:
        return _STATE_DISTRESSED
    if result.risk_score >= 40:
        return _STATE_ELEVATED
    return _STATE_STABLE


# ---------------------------------------------------------------------------
# v5.0 step-function scoring helpers
# ---------------------------------------------------------------------------
_engine = FinancialAnalysisEngine()


def _v5_component_score(metric: str, value: float, revenue_history: list[float] | None = None) -> float:
    """Return the v5.0 step-function score (0-100) for a given metric."""
    if metric == "leverage":
        return _engine._score_leverage(value)
    elif metric == "liquidity":
        return _engine._score_liquidity(value)
    elif metric == "profitability":
        return _engine._score_profitability(value)
    elif metric == "stability":
        return _engine._score_stability(revenue_history or [])
    elif metric == "growth":
        return _engine._score_growth(value)
    return 50.0


def _v5_improvement(metric: str, current: float, target: float, weight: float, revenue_history: list[float] | None = None) -> float:
    """Estimated risk-score improvement using v5.0 step functions."""
    current_score = _v5_component_score(metric, current, revenue_history)
    target_score = _v5_component_score(metric, target, revenue_history)
    return max(0.0, round(weight * (current_score - target_score), 1))


def _rec(
    title: str, explanation: str, driver: str,
    comparison: str, impact_text: str, impact_points: float,
    *,
    priority: str = "Medium",
    current_value: str = "",
    target_value: str = "",
    timeframe: str = "1–3 months",
    concrete_actions: Optional[List[str]] = None,
) -> dict:
    """Build a recommendation dict with justification and an internal sorting key."""
    return {
        "title": title,
        "explanation": explanation,
        "priority": priority,
        "current_value": current_value,
        "target_value": target_value,
        "timeframe": timeframe,
        "concrete_actions": concrete_actions or [],
        "justification": {
            "driver": driver,
            "comparison": comparison,
            "impact": impact_text,
            "priority_reason": "",  # assigned after rank-ordering
        },
        "_impact_points": impact_points,  # internal — removed before output
    }


class AdvisorService:
    """Generates audit-grade, justified recommendations and a human-readable
    risk explanation based on the computed financial metrics."""

    def generate_recommendations(self, result: AnalysisResult) -> List[dict]:
        """
        Evaluate each financial metric against predefined thresholds and return
        a list of 3–7 structured, justified recommendations.

        Each recommendation includes a justification layer with:
        - driver:          which risk factor triggered it, with quantified contribution
        - comparison:      current value vs threshold / industry benchmark
        - impact:          estimated risk-score improvement
        - priority_reason: why this recommendation is ranked at its position

        Recommendations are context-aware: the global risk state (DISTRESSED /
        ELEVATED / STABLE) gates which advice categories are permitted so that
        the output never contradicts the overall risk assessment.
        """
        state = _system_state(result)
        weights, _ = get_industry_weights(result.industry_model_applied or "")
        candidates: List[dict] = []

        # The engine returns exactly -100.0 when revenue is zero and expenses
        # are positive.  Any PM below -100% comes from actual revenue that is
        # vastly exceeded by expenses — those are NOT zero-revenue businesses.
        is_zero_revenue = result.profit_margin == -100.0 and result.burn_rate > 0

        # ── Current penalty flags ──────────────────────────────────
        z_penalty = 20.0 if result.altman_z_score < 1.8 else 0.0
        pm_penalty = 15.0 if result.profit_margin < 0 else 0.0
        runway_penalty = 10.0 if (
            result.cash_runway_months is not None and result.cash_runway_months < 6
        ) else 0.0

        # ── Per-metric total risk contributions (for driver strings) ──
        leverage_contribution = round(weights["debtRatio"] * _v5_component_score("leverage", result.debt_ratio), 1)
        profitability_contribution = round(weights["profitMargin"] * _v5_component_score("profitability", result.profit_margin), 1)
        debt_total = leverage_contribution
        pm_total = profitability_contribution
        liq_total = round(weights["liquidity"] * _v5_component_score("liquidity", result.liquidity_ratio), 1)
        rev_total = round(weights["revenueTrend"] * _v5_component_score("growth", result.revenue_trend), 1)

        # ── Profit margin ──────────────────────────────────────────
        if is_zero_revenue:
            imp = _v5_improvement("profitability", result.profit_margin, 0.0, weights["profitMargin"])
            candidates.append(_rec(
                title="Establish Revenue Stream",
                explanation=(
                    "CRITICAL: The business has zero revenue and is entirely reliant on cash reserves. "
                    "Establish a revenue stream immediately or secure emergency funding to avoid insolvency."
                ),
                driver=(
                    f"Profit margin contributes {pm_total:.1f}/100 risk points "
                    f"(weight: {weights['profitMargin']*100:.0f}%, includes "
                    f"{pm_penalty:.0f}-point negative-margin penalty)"
                ),
                comparison=(
                    "Profit margin is \u2212100.0% (zero revenue) vs the breakeven threshold of 0%"
                ),
                impact_text=(
                    f"Reaching breakeven (PM \u2265 0%) could improve your risk score by "
                    f"approximately {imp:.0f} points"
                ),
                impact_points=imp,
            ))
        elif result.profit_margin < 10:
            imp = _v5_improvement("profitability", result.profit_margin, 10.0, weights["profitMargin"])
            penalty_note = (
                f", includes {pm_penalty:.0f}-point negative-margin penalty"
                if pm_penalty > 0 else ""
            )
            candidates.append(_rec(
                title="Improve Profit Margin",
                explanation=(
                    "Increase pricing or reduce cost of goods sold (COGS) to improve your "
                    "profit margin above 10%."
                ),
                driver=(
                    f"Profit margin contributes {pm_total:.1f}/100 risk points "
                    f"(weight: {weights['profitMargin']*100:.0f}%{penalty_note})"
                ),
                comparison=(
                    f"Profit margin of {result.profit_margin:.1f}% is below "
                    "the target threshold of 10%"
                ),
                impact_text=(
                    f"Improving profit margin to 10% could improve your risk score by "
                    f"approximately {imp:.0f} points"
                ),
                impact_points=imp,
            ))

        # ── Cash runway / burn rate ────────────────────────────────
        if result.burn_rate > 0 and result.cash_runway_months is not None:
            if result.cash_runway_months < 3:
                candidates.append(_rec(
                    title="Extend Cash Runway",
                    explanation=(
                        "CRITICAL: Cash runway is below 3 months. Immediately cut all non-essential "
                        "expenses and seek emergency financing or revenue acceleration."
                    ),
                    driver=(
                        f"Cash runway constraint adds a {runway_penalty:.0f}-point "
                        "distress penalty to the risk score"
                    ),
                    comparison=(
                        f"Cash runway of {result.cash_runway_months:.1f} months is critically "
                        "below the 6-month safe threshold"
                    ),
                    impact_text=(
                        f"Extending runway above 6 months would remove the "
                        f"{runway_penalty:.0f}-point penalty"
                    ),
                    impact_points=runway_penalty,
                ))
            elif result.cash_runway_months < 6:
                candidates.append(_rec(
                    title="Build Cash Reserves",
                    explanation=(
                        "Cash runway is below 6 months. Reduce discretionary expenses and explore "
                        "bridging finance or new revenue channels before reserves run out."
                    ),
                    driver=(
                        f"Cash runway below 6 months adds a {runway_penalty:.0f}-point "
                        "distress penalty to the risk score"
                    ),
                    comparison=(
                        f"Cash runway of {result.cash_runway_months:.1f} months is below "
                        "the 6-month safe threshold"
                    ),
                    impact_text=(
                        f"Extending runway above 6 months would remove the "
                        f"{runway_penalty:.0f}-point penalty"
                    ),
                    impact_points=runway_penalty,
                ))

        # ── Debt ratio ─────────────────────────────────────────────
        if result.debt_ratio > 0.6:
            imp = _v5_improvement("leverage", result.debt_ratio, 0.6, weights["debtRatio"])
            candidates.append(_rec(
                title="Reduce Leverage Ratio",
                explanation=(
                    "Debt ratio is dangerously high (above 60%). Prioritize debt refinancing, "
                    "negotiate extended repayment terms, or seek equity to reduce leverage."
                ),
                driver=(
                    f"Leverage contributes {debt_total:.1f}/100 risk points "
                    f"(weight: {weights['debtRatio']*100:.0f}%)"
                ),
                comparison=(
                    f"Debt ratio of {result.debt_ratio*100:.1f}% is significantly above "
                    "the critical threshold of 60%"
                ),
                impact_text=(
                    f"Reducing leverage to 60% could improve your risk score by "
                    f"approximately {imp:.0f} points"
                ),
                impact_points=imp,
            ))
        elif result.debt_ratio > 0.3:
            imp = _v5_improvement("leverage", result.debt_ratio, 0.3, weights["debtRatio"])
            candidates.append(_rec(
                title="Manage Debt Levels",
                explanation=(
                    "Debt ratio is elevated (above 30%). Avoid taking on additional debt and "
                    "create a structured repayment plan to bring the ratio below 30%."
                ),
                driver=(
                    f"Leverage contributes {debt_total:.1f}/100 risk points "
                    f"(weight: {weights['debtRatio']*100:.0f}%)"
                ),
                comparison=(
                    f"Debt ratio of {result.debt_ratio*100:.1f}% exceeds "
                    "the conservative threshold of 30%"
                ),
                impact_text=(
                    f"Reducing leverage below 30% could improve your risk score by "
                    f"approximately {imp:.0f} points"
                ),
                impact_points=imp,
            ))

        # ── Liquidity ratio ────────────────────────────────────────
        if result.liquidity_ratio < 1.0:
            imp = _v5_improvement("liquidity", result.liquidity_ratio, 1.5, weights["liquidity"])
            candidates.append(_rec(
                title="Restore Working Capital",
                explanation=(
                    "Liquidity is critical \u2014 current assets do not cover current liabilities. "
                    "Improve working capital by accelerating receivables collection, reducing "
                    "inventory, and building a cash buffer of at least 3 months of operating expenses."
                ),
                driver=(
                    f"Liquidity contributes {liq_total:.1f}/100 risk points "
                    f"(weight: {weights['liquidity']*100:.0f}%)"
                ),
                comparison=(
                    f"Liquidity ratio of {result.liquidity_ratio:.2f} is below "
                    "the coverage threshold of 1.0"
                ),
                impact_text=(
                    f"Improving liquidity to 1.5 could improve your risk score by "
                    f"approximately {imp:.0f} points"
                ),
                impact_points=imp,
            ))
        elif result.liquidity_ratio < 1.2:
            imp = _v5_improvement("liquidity", result.liquidity_ratio, 1.5, weights["liquidity"])
            candidates.append(_rec(
                title="Strengthen Liquidity Buffer",
                explanation=(
                    "Liquidity ratio is in the watch zone (below 1.2). Work toward a ratio "
                    "above 1.5 by extending payables where possible and reducing short-term "
                    "obligations."
                ),
                driver=(
                    f"Liquidity contributes {liq_total:.1f}/100 risk points "
                    f"(weight: {weights['liquidity']*100:.0f}%)"
                ),
                comparison=(
                    f"Liquidity ratio of {result.liquidity_ratio:.2f} is below the 1.5 "
                    "target and approaching the critical threshold of 1.0"
                ),
                impact_text=(
                    f"Improving liquidity to 1.5 could improve your risk score by "
                    f"approximately {imp:.0f} points"
                ),
                impact_points=imp,
            ))
        elif result.liquidity_ratio < 2.0:
            imp = _v5_improvement("liquidity", result.liquidity_ratio, 2.0, weights["liquidity"])
            candidates.append(_rec(
                title="Optimize Liquidity Position",
                explanation=(
                    "Liquidity ratio is healthy but could be stronger. Target a ratio above 2.0 "
                    "to provide a comfortable buffer against unexpected short-term obligations."
                ),
                driver=(
                    f"Liquidity contributes {liq_total:.1f}/100 risk points "
                    f"(weight: {weights['liquidity']*100:.0f}%)"
                ),
                comparison=(
                    f"Liquidity ratio of {result.liquidity_ratio:.2f} is adequate "
                    "but below the strong threshold of 2.0"
                ),
                impact_text=(
                    f"Improving liquidity to 2.0 could improve your risk score by "
                    f"approximately {imp:.0f} points"
                ),
                impact_points=imp,
            ))

        # ── Expense trend ──────────────────────────────────────────
        if result.expense_trend > 0.1:
            approx_impact = round(
                result.expense_trend * weights["profitMargin"] * 100, 1,
            )
            candidates.append(_rec(
                title="Control Expense Growth",
                explanation=(
                    "Expenses are growing faster than 10% month-over-month. Review and cut "
                    "discretionary spending, renegotiate supplier contracts, and track cost "
                    "drivers weekly."
                ),
                driver=(
                    f"Expense growth of {result.expense_trend*100:.1f}% MoM erodes profit "
                    f"margin (profitability weight: {weights['profitMargin']*100:.0f}%)"
                ),
                comparison=(
                    f"Expense trend of +{result.expense_trend*100:.1f}% MoM exceeds "
                    "the sustainable growth threshold of 10%"
                ),
                impact_text=(
                    f"Stabilizing expenses could prevent approximately {approx_impact:.0f} "
                    "points of risk deterioration per period"
                ),
                impact_points=approx_impact,
            ))

        # ── Altman Z-Score distress zone ───────────────────────────
        if result.altman_z_score <= 1.81:
            imp = _v5_improvement("stability", result.altman_z_score, 3.0, weights["zScore"])
            candidates.append(_rec(
                title="Address Solvency Risk",
                explanation=(
                    "Altman Z-Score indicates financial distress. Consider engaging a financial "
                    "advisor or turnaround specialist and review your business model viability."
                ),
                driver=(
                    f"Stability contributes {round(weights['zScore'] * _v5_component_score('stability', result.altman_z_score), 1):.1f}/100 risk points "
                    f"(weight: {weights['zScore']*100:.0f}%)"
                ),
                comparison=(
                    f"Z-Score of {result.altman_z_score:.2f} is in the distress zone "
                    "(below 1.81), significantly below the safe threshold of 3.0"
                ),
                impact_text=(
                    f"Improving Z-Score to the safe zone (above 3.0) could improve your "
                    f"risk score by approximately {imp:.0f} points"
                ),
                impact_points=imp,
            ))

        # ── Revenue trend negative ─────────────────────────────────
        if result.revenue_trend < -0.05:
            imp = _v5_improvement("growth", result.revenue_trend, 0.0, weights["revenueTrend"])
            if state == _STATE_DISTRESSED:
                candidates.append(_rec(
                    title="Stabilize Revenue",
                    explanation=(
                        "Revenue is declining in an already distressed environment. Focus on "
                        "retaining existing customers, cutting loss-making product lines, and "
                        "stabilising core revenue."
                    ),
                    driver=(
                        f"Revenue trend contributes {rev_total:.1f}/100 risk points "
                        f"(weight: {weights['revenueTrend']*100:.0f}%)"
                    ),
                    comparison=(
                        f"Revenue is declining at {result.revenue_trend*100:.1f}% MoM, "
                        "below the stable threshold of 0%"
                    ),
                    impact_text=(
                        f"Stabilizing revenue to neutral growth could improve your risk "
                        f"score by approximately {imp:.0f} points"
                    ),
                    impact_points=imp,
                ))
            else:
                candidates.append(_rec(
                    title="Reverse Revenue Decline",
                    explanation=(
                        "Revenue is declining. Analyze your customer churn rate, re-evaluate "
                        "your pricing strategy, and invest in targeted sales and marketing "
                        "efforts."
                    ),
                    driver=(
                        f"Revenue trend contributes {rev_total:.1f}/100 risk points "
                        f"(weight: {weights['revenueTrend']*100:.0f}%)"
                    ),
                    comparison=(
                        f"Revenue is declining at {result.revenue_trend*100:.1f}% MoM, "
                        "below the stable threshold of 0%"
                    ),
                    impact_text=(
                        f"Reversing revenue decline to neutral could improve your risk "
                        f"score by approximately {imp:.0f} points"
                    ),
                    impact_points=imp,
                ))

        # ── Context-gated positive signals ─────────────────────────
        # Positive / growth recommendations are ONLY permitted when the
        # business is in a STABLE state.  In elevated or distressed states
        # they are replaced with conservative alternatives.

        if result.liquidity_ratio > 2:
            if state == _STATE_STABLE:
                candidates.append(_rec(
                    title="Deploy Excess Liquidity",
                    explanation=(
                        f"Liquidity levels are strong (ratio: {result.liquidity_ratio:.2f}). "
                        "Excess cash could be strategically reinvested into growth initiatives "
                        "or used to build a long-term reserve fund."
                    ),
                    driver=(
                        f"Liquidity ratio is a positive signal \u2014 contributing minimal risk "
                        f"({liq_total:.1f} points, weight: {weights['liquidity']*100:.0f}%)"
                    ),
                    comparison=(
                        f"Liquidity ratio of {result.liquidity_ratio:.2f} is well above "
                        "the strong threshold of 2.0"
                    ),
                    impact_text=(
                        "Redeploying excess liquidity into growth could increase returns "
                        "without materially affecting the risk score"
                    ),
                    impact_points=0.0,
                ))
            elif state == _STATE_ELEVATED:
                candidates.append(_rec(
                    title="Preserve Liquidity Buffer",
                    explanation=(
                        f"Liquidity ratio of {result.liquidity_ratio:.2f} provides a buffer. "
                        "Preserve this cash reserve until risk factors are resolved rather "
                        "than deploying it into growth initiatives."
                    ),
                    driver=(
                        f"Liquidity ratio is a positive signal at "
                        f"{result.liquidity_ratio:.2f} "
                        f"(risk contribution: {liq_total:.1f} points)"
                    ),
                    comparison=(
                        f"Despite elevated overall risk, liquidity of "
                        f"{result.liquidity_ratio:.2f} exceeds the 2.0 strong threshold"
                    ),
                    impact_text=(
                        "Preserving this buffer protects against downside risk while "
                        "other factors are addressed"
                    ),
                    impact_points=0.0,
                ))
            # DISTRESSED: strong liquidity is unusual but possible (e.g. high
            # burn rate eating through reserves).  Do NOT suggest reinvestment.
            else:
                candidates.append(_rec(
                    title="Protect Cash Reserves",
                    explanation=(
                        f"Current liquidity ratio of {result.liquidity_ratio:.2f} is a "
                        "critical lifeline. Preserve every unit of cash \u2014 avoid "
                        "discretionary spend and defer all non-essential capital expenditure "
                        "until the business is stabilised."
                    ),
                    driver=(
                        f"In distressed state, liquidity of {result.liquidity_ratio:.2f} "
                        f"is a survival lifeline despite overall risk of "
                        f"{result.risk_score:.0f}/100"
                    ),
                    comparison=(
                        f"Liquidity ratio of {result.liquidity_ratio:.2f} exceeds the 2.0 "
                        "threshold but other critical factors dominate the risk profile"
                    ),
                    impact_text=(
                        "Protect cash to reduce risk of insolvency \u2014 deploying "
                        "reserves now could accelerate business failure"
                    ),
                    impact_points=0.0,
                ))

        if result.debt_ratio < 0.3:
            if state == _STATE_STABLE:
                candidates.append(_rec(
                    title="Leverage Financing Capacity",
                    explanation=(
                        f"Low leverage (debt ratio: {result.debt_ratio * 100:.1f}%) provides "
                        "room for strategic financing if expansion capital is needed."
                    ),
                    driver=(
                        f"Low leverage is a positive signal \u2014 debt contributes only "
                        f"{debt_total:.1f}/100 risk points "
                        f"(weight: {weights['debtRatio']*100:.0f}%)"
                    ),
                    comparison=(
                        f"Debt ratio of {result.debt_ratio*100:.1f}% is well below "
                        "the conservative threshold of 30%"
                    ),
                    impact_text=(
                        "Moderate leverage increase for growth investment would have "
                        "minimal impact on risk score"
                    ),
                    impact_points=0.0,
                ))
            elif state == _STATE_ELEVATED:
                candidates.append(_rec(
                    title="Maintain Conservative Leverage",
                    explanation=(
                        f"Debt ratio of {result.debt_ratio * 100:.1f}% is conservative. "
                        "Maintain this low leverage position \u2014 avoid new borrowing "
                        "until risk factors are addressed."
                    ),
                    driver=(
                        f"Debt ratio is a bright spot at {result.debt_ratio*100:.1f}% "
                        f"(risk contribution: {debt_total:.1f} points)"
                    ),
                    comparison=(
                        f"Debt ratio of {result.debt_ratio*100:.1f}% is below the 30% "
                        "conservative threshold despite elevated overall risk"
                    ),
                    impact_text=(
                        "Maintaining low leverage preserves balance-sheet flexibility "
                        "while other risks are addressed"
                    ),
                    impact_points=0.0,
                ))
            else:
                candidates.append(_rec(
                    title="Avoid Additional Leverage",
                    explanation=(
                        "Avoid taking on additional leverage until profitability stabilises "
                        "and the risk profile improves materially."
                    ),
                    driver=(
                        f"In distressed state with risk score of "
                        f"{result.risk_score:.0f}/100, any leverage increase could "
                        "accelerate insolvency"
                    ),
                    comparison=(
                        f"Debt ratio of {result.debt_ratio*100:.1f}% is low, but overall "
                        "distress makes new borrowing dangerous"
                    ),
                    impact_text=(
                        "Taking on debt in a distressed state could increase risk score "
                        "significantly and trigger covenant violations"
                    ),
                    impact_points=0.0,
                ))

        # ── Sort by impact (largest first) ─────────────────────────
        candidates.sort(key=lambda r: r["_impact_points"], reverse=True)

        # ── Deduplicate by title ───────────────────────────────────
        seen_titles: set[str] = set()
        deduplicated: List[dict] = []
        for rec in candidates:
            if rec["title"] not in seen_titles:
                seen_titles.add(rec["title"])
                deduplicated.append(rec)
        candidates = deduplicated

        # ── Ensure at least 3 recommendations ─────────────────────
        if len(candidates) < 3:
            self._add_general_recommendations(candidates, result, state, weights)

        # ── Assign priority and priority reasons based on ranking ──
        for i, rec in enumerate(candidates[:7]):
            pos = i + 1
            pts = rec["_impact_points"]

            # Auto-assign priority from impact + risk state if not explicitly set
            if rec.get("priority", "Medium") == "Medium":
                if pts >= 10 or state in (_STATE_CRITICAL, _STATE_DISTRESSED):
                    rec["priority"] = "High"
                    rec["timeframe"] = "Immediate"
                elif pts >= 5:
                    rec["priority"] = "Medium"
                    rec["timeframe"] = "1–3 months"
                else:
                    rec["priority"] = "Low"
                    rec["timeframe"] = "3–6 months"

            if pos == 1 and pts > 0:
                rec["justification"]["priority_reason"] = (
                    f"Ranked #{pos}: this is the single largest contributor to "
                    f"your risk score at {pts:.0f} points"
                )
            elif pts > 0:
                rec["justification"]["priority_reason"] = (
                    f"Ranked #{pos} by estimated impact on composite risk score "
                    f"({pts:.0f} points)"
                )
            else:
                rec["justification"]["priority_reason"] = (
                    f"Ranked #{pos}: strategic optimization \u2014 maintaining "
                    "strengths is as important as addressing weaknesses"
                )

        # ── Remove internal fields and return ──────────────────────
        output: List[dict] = []
        for rec in candidates[:7]:
            rec.pop("_impact_points", None)
            output.append(rec)

        return output

    def _add_general_recommendations(
        self,
        candidates: List[dict],
        result: AnalysisResult,
        state: str,
        weights: dict,
    ) -> None:
        """Pad the candidates list with forward-looking strategic advice
        appropriate for the current risk state, each with justification."""

        if state in (_STATE_CRITICAL, _STATE_DISTRESSED):
            survival = [
                _rec(
                    title="Cash-Flow Triage",
                    explanation=(
                        "Conduct an immediate cash-flow triage: identify the three largest "
                        "discretionary expense lines and freeze or eliminate them within the "
                        "next 30 days."
                    ),
                    driver=(
                        f"Risk score of {result.risk_score:.0f}/100 indicates material "
                        "financial distress requiring immediate cash management intervention"
                    ),
                    comparison=(
                        f"Risk score of {result.risk_score:.0f} significantly exceeds the "
                        "safe threshold of 30 and the high-risk threshold of 60"
                    ),
                    impact_text=(
                        "Eliminating discretionary expenses could extend cash runway and "
                        "prevent 5\u201310 points of risk deterioration"
                    ),
                    impact_points=5.0,
                ),
                _rec(
                    title="Engage Creditors Proactively",
                    explanation=(
                        "Engage creditors proactively to negotiate payment deferrals or "
                        "restructured terms before covenant breaches occur."
                    ),
                    driver=(
                        f"At a risk score of {result.risk_score:.0f}/100, unmanaged "
                        "creditor obligations accelerate insolvency risk"
                    ),
                    comparison=(
                        f"Risk profile at {result.risk_score:.0f}/100 is in the danger "
                        "zone \u2014 proactive negotiation prevents forced liquidation"
                    ),
                    impact_text=(
                        "Successful creditor renegotiation could reduce debt-ratio "
                        "pressure by 3\u20135 points and extend runway"
                    ),
                    impact_points=4.0,
                ),
                _rec(
                    title="13-Week Cash Forecast",
                    explanation=(
                        "Prepare a 13-week rolling cash-flow forecast to maintain day-level "
                        "visibility into liquidity and avoid surprise shortfalls."
                    ),
                    driver=(
                        "In a distressed state, day-level cash visibility is critical \u2014 "
                        "surprise shortfalls are the proximate cause of most business failures"
                    ),
                    comparison=(
                        f"Risk score of {result.risk_score:.0f}/100 leaves no margin for "
                        "error \u2014 weekly or monthly forecasting intervals are insufficient"
                    ),
                    impact_text=(
                        "Early detection of shortfalls enables intervention before they "
                        "become unrecoverable, protecting 5\u201315 points of risk"
                    ),
                    impact_points=3.0,
                ),
            ]
            for tip in survival:
                if len(candidates) >= 3:
                    break
                if not any(c["title"] == tip["title"] for c in candidates):
                    candidates.append(tip)
        else:
            strategic = [
                _rec(
                    title="Stress-Test Revenue Decline",
                    explanation=(
                        f"With a profit margin of {result.profit_margin:.1f}%, model a "
                        "10\u201320% revenue decline scenario to identify at what point the "
                        "business becomes cash-flow negative \u2014 then build reserves to "
                        "cover that gap."
                    ),
                    driver=(
                        f"Profit margin of {result.profit_margin:.1f}% provides current "
                        "resilience, but untested assumptions create hidden risk"
                    ),
                    comparison=(
                        f"Current margin of {result.profit_margin:.1f}% vs breakeven "
                        "\u2014 the gap determines vulnerability to revenue shocks"
                    ),
                    impact_text=(
                        "Identifying the breakeven threshold and building reserves could "
                        "prevent 10\u201320 points of risk increase from an unexpected "
                        "revenue decline"
                    ),
                    impact_points=3.0,
                ),
                _rec(
                    title="Establish Credit Facility",
                    explanation=(
                        f"Current debt ratio of {result.debt_ratio*100:.1f}% is manageable. "
                        "Use this position to negotiate better credit terms or establish a "
                        "revolving credit facility before it\u2019s needed."
                    ),
                    driver=(
                        f"Debt ratio of {result.debt_ratio*100:.1f}% provides headroom for "
                        f"strategic borrowing (weight: {weights['debtRatio']*100:.0f}%)"
                    ),
                    comparison=(
                        f"Debt ratio of {result.debt_ratio*100:.1f}% is below the elevated "
                        "threshold of 30%, giving negotiating leverage with lenders"
                    ),
                    impact_text=(
                        "A pre-arranged credit facility provides 3\u20136 months of "
                        "emergency runway at minimal risk-score cost"
                    ),
                    impact_points=2.0,
                ),
                _rec(
                    title="Implement Rolling Forecast",
                    explanation=(
                        "Establish a rolling 12-month financial forecast and review it "
                        "monthly \u2014 early trend detection prevents small issues from "
                        "becoming crises."
                    ),
                    driver=(
                        "Forecast discipline is the strongest leading indicator of "
                        "financial resilience \u2014 businesses that forecast monthly reduce "
                        "surprise risk by 40\u201360%"
                    ),
                    comparison=(
                        "Without a rolling forecast, emerging trends (margin erosion, "
                        "cash drain) can escalate undetected for 2\u20133 quarters"
                    ),
                    impact_text=(
                        "Early trend detection could prevent 5\u201315 points of risk "
                        "increase by enabling corrective action before metrics deteriorate"
                    ),
                    impact_points=2.0,
                ),
                _rec(
                    title="Stress-Test Concentration Risk",
                    explanation=(
                        "Stress-test the business model against rising input costs and "
                        "customer concentration risk. Identify the top 3 revenue dependencies "
                        "and develop mitigation plans."
                    ),
                    driver=(
                        "Revenue concentration and input-cost sensitivity are off-balance-sheet "
                        "risks not captured by the composite score"
                    ),
                    comparison=(
                        "Industry best practice is to cap single-customer revenue "
                        "dependency at 20% \u2014 exceeding this creates fragility"
                    ),
                    impact_text=(
                        "Diversifying revenue sources could prevent 5\u201310 points of "
                        "risk increase from losing a key customer or supplier"
                    ),
                    impact_points=1.5,
                ),
                _rec(
                    title="Benchmark Operating Margins",
                    explanation=(
                        "Benchmark your operating margins against industry peers quarterly. "
                        "Even healthy margins can erode if competitors are improving faster."
                    ),
                    driver=(
                        f"Current margin of {result.profit_margin:.1f}% may appear strong "
                        "but relative competitive position determines long-term sustainability"
                    ),
                    comparison=(
                        "Without peer benchmarking, margin erosion relative to industry "
                        "standards can go undetected until it becomes a material risk"
                    ),
                    impact_text=(
                        "Quarterly benchmarking enables proactive margin defense, "
                        "preventing 3\u20138 points of risk deterioration over 12 months"
                    ),
                    impact_points=1.0,
                ),
            ]
            for tip in strategic:
                if len(candidates) >= 3:
                    break
                if not any(c["title"] == tip["title"] for c in candidates):
                    candidates.append(tip)

    def generate_risk_explanation(self, result: AnalysisResult) -> str:
        """
        Compose a 2–4 sentence plain-English explanation of WHY the business
        has been assigned its current risk level, using CFO/credit-analyst tone.
        v3.0: Tone matches 5-tier severity level.
        """
        # 5-tier label based on risk_score
        # SPECIAL RULE: if debt_ratio > 60% OR Z < 2.5, NEVER say "healthy" or "stable"
        is_financially_constrained = result.debt_ratio > 0.6 or result.altman_z_score < 2.5
        if result.risk_score > 80:
            level_label = "critical financial distress requiring immediate intervention"
        elif result.risk_score > 60:
            level_label = "material financial headwinds with significant distress indicators"
        elif result.risk_score > 40:
            level_label = "elevated risk with identifiable vulnerabilities requiring attention"
        elif is_financially_constrained:
            level_label = "a financially constrained position with structural vulnerabilities"
        elif result.risk_score > 20:
            level_label = "a stable financial position with room for strategic improvement"
        else:
            level_label = "a strong financial position with healthy fundamentals"

        sentences: List[str] = []

        # Compound flags
        is_wc_constrained = result.burn_rate == 0 and result.liquidity_ratio < 1.0
        is_structurally_fragile = result.debt_ratio >= 0.6 and result.altman_z_score < 1.8

        # Opening sentence
        health = 100 - result.risk_score
        opening = (
            f"Based on the submitted financial data, this business currently faces {level_label} "
            f"with a composite risk score of {result.risk_score:.0f}/100 (financial health: {health:.0f}%)."
        )
        if is_structurally_fragile:
            opening += " The combination of high leverage and a distress-zone Z-score renders the business structurally fragile."
        elif is_wc_constrained:
            opening += " Despite positive operating cash flow, working-capital constraints create short-term balance-sheet risk."
        sentences.append(opening)

        # Key driving factors
        drivers: List[str] = []
        positives: List[str] = []

        if result.altman_z_score <= 1.81:
            drivers.append(f"an Altman Z-Score of {result.altman_z_score:.2f} in the distress zone")
        elif result.altman_z_score <= 2.99:
            drivers.append(f"an Altman Z-Score of {result.altman_z_score:.2f} in the grey zone")
        else:
            positives.append(f"an Altman Z-Score of {result.altman_z_score:.2f} in the safe zone")

        if result.cash_runway_months is not None and result.burn_rate > 0:
            if result.cash_runway_months < 3:
                drivers.append(f"critically low cash runway of {result.cash_runway_months:.1f} months")
            elif result.cash_runway_months < 6:
                drivers.append(f"cash runway of only {result.cash_runway_months:.1f} months")
        elif result.burn_rate == 0:
            if is_wc_constrained:
                drivers.append(
                    f"a liquidity ratio of {result.liquidity_ratio:.2f} despite positive cash flow — "
                    "current liabilities exceed current assets, creating structural short-term risk"
                )
            else:
                positives.append("positive cash flow with no active burn rate")

        if result.profit_margin < 0:
            drivers.append(f"negative profit margin of {result.profit_margin:.1f}%")
        elif result.profit_margin < 5:
            drivers.append(f"razor-thin profit margin of {result.profit_margin:.1f}%")
        elif result.profit_margin >= 20:
            positives.append(f"strong profit margin of {result.profit_margin:.1f}%")

        if result.debt_ratio > 0.6:
            drivers.append(f"high leverage at {result.debt_ratio:.0%} debt ratio")
        elif result.debt_ratio < 0.3:
            positives.append(f"conservative leverage at {result.debt_ratio:.0%}")

        if result.liquidity_ratio < 1.0 and not is_wc_constrained:
            drivers.append(f"constrained liquidity at {result.liquidity_ratio:.2f}")
        elif result.liquidity_ratio >= 2.0:
            positives.append(f"strong liquidity at {result.liquidity_ratio:.2f}")

        if drivers:
            sentences.append("Key risk factors include: " + ", ".join(drivers) + ".")
        if positives and result.risk_level != "high_risk":
            sentences.append("Positive signals include: " + ", ".join(positives[:2]) + ".")

        # Bankruptcy probability context (Rule #6 — always explain)
        bp = result.bankruptcy_probability
        if bp >= 30:
            bp_drivers: List[str] = []
            if result.altman_z_score < 1.8: bp_drivers.append("distress-zone Z-score")
            if result.liquidity_ratio < 1: bp_drivers.append("sub-1 liquidity")
            if result.debt_ratio >= 0.6: bp_drivers.append("high leverage")
            driver_text = f", driven by {', '.join(bp_drivers)}" if bp_drivers else ""
            sentences.append(
                f"Bankruptcy probability of {bp:.0f}% is elevated{driver_text}. "
                "Urgent structural review is required."
            )
        elif bp >= 15:
            bp_drivers: List[str] = []
            if result.altman_z_score < 3: bp_drivers.append(f"grey-zone Z-score of {result.altman_z_score:.2f}")
            if result.liquidity_ratio < 1.2: bp_drivers.append("tight liquidity")
            if result.debt_ratio >= 0.3: bp_drivers.append(f"{result.debt_ratio:.0%} leverage")
            driver_text = f", linked to {', '.join(bp_drivers)}" if bp_drivers else ""
            sentences.append(
                f"Bankruptcy probability of {bp:.0f}% warrants close monitoring{driver_text}."
            )

        # Closing guidance — tone matches severity
        if result.risk_score > 80:
            sentences.append(
                "URGENT: Business viability is at immediate risk. Emergency intervention, "
                "potential restructuring, and professional turnaround advisory are required within days, not weeks."
            )
        elif result.risk_score > 60:
            sentences.append(
                "Immediate intervention at the strategic level is required to stabilise operations and restore financial resilience."
            )
        elif result.risk_score > 40:
            sentences.append(
                "Management should prioritise addressing identified vulnerabilities while building on existing strengths. Quarterly metric review is essential."
            )
        elif result.risk_score > 20:
            sentences.append(
                "The business is stable. Focus on optimising margins, building reserves, and stress-testing against downside scenarios."
            )
        else:
            sentences.append(
                "Maintain current financial discipline — focus on forecasting accuracy, margin preservation, "
                "and building liquidity reserves against downside scenarios."
            )

        return " ".join(sentences)
