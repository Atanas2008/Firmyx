from dataclasses import dataclass, field
from typing import Optional
from app.models.financial_record import FinancialRecord

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
# Months used to annualise monthly flow figures (revenue, expenses, EBIT).
# Balance-sheet items (total_assets, current_liabilities, retained_earnings,
# total_debt) are already point-in-time figures and must NOT be scaled.
MONTHS_PER_YEAR = 12

# Scoring model version — increment whenever the risk scoring formula changes
# so the frontend can detect stale analysis records stored in the database.
SCORING_MODEL_VERSION = "5.0"


# ---------------------------------------------------------------------------
# Industry-Specific Risk Weight Models  (v5.0)
# ---------------------------------------------------------------------------
# Weight keys: debtRatio → LEVERAGE, liquidity, profitMargin → PROFITABILITY,
#              zScore → STABILITY (revenue variance), revenueTrend → GROWTH.
#
# v5.0 scoring uses deterministic step-functions instead of non-linear curves.
# The Altman Z-Score is kept as a display metric but no longer drives the
# risk score directly.  The "stability" component now measures revenue
# volatility (coefficient of variation across available periods).
#
# Each dict maps internal key → weight (must sum to 1.0).
INDUSTRY_WEIGHTS: dict[str, dict[str, float]] = {
    # --- Tech & Software ---
    # Low debt typical; profitability and growth are better risk predictors.
    "Technology": {
        "debtRatio": 0.20,
        "liquidity": 0.20,
        "profitMargin": 0.25,
        "zScore": 0.15,
        "revenueTrend": 0.20,
    },
    "Software": {
        "debtRatio": 0.20,
        "liquidity": 0.20,
        "profitMargin": 0.25,
        "zScore": 0.15,
        "revenueTrend": 0.20,
    },
    # --- Food, Beverage & Restaurants ---
    # Thin margins, high leverage exposure; stability is less volatile.
    "Food & Beverage": {
        "debtRatio": 0.30,
        "liquidity": 0.25,
        "profitMargin": 0.25,
        "zScore": 0.10,
        "revenueTrend": 0.10,
    },
    "Restaurants": {
        "debtRatio": 0.30,
        "liquidity": 0.25,
        "profitMargin": 0.25,
        "zScore": 0.10,
        "revenueTrend": 0.10,
    },
    "Coffee Chains": {
        "debtRatio": 0.30,
        "liquidity": 0.25,
        "profitMargin": 0.25,
        "zScore": 0.10,
        "revenueTrend": 0.10,
    },
    # --- Retail / Manufacturing ---
    # Capital-intensive, moderate leverage; liquidity and leverage dominate.
    "Retail": {
        "debtRatio": 0.30,
        "liquidity": 0.25,
        "profitMargin": 0.20,
        "zScore": 0.15,
        "revenueTrend": 0.10,
    },
    "Manufacturing": {
        "debtRatio": 0.30,
        "liquidity": 0.25,
        "profitMargin": 0.20,
        "zScore": 0.15,
        "revenueTrend": 0.10,
    },
    # --- Healthcare ---
    # Regulated revenues, stable demand; debt structure matters most.
    "Healthcare": {
        "debtRatio": 0.30,
        "liquidity": 0.20,
        "profitMargin": 0.25,
        "zScore": 0.15,
        "revenueTrend": 0.10,
    },
    # --- Real Estate ---
    # High leverage is normal; debt ratio is dominant risk factor.
    "Real Estate": {
        "debtRatio": 0.40,
        "liquidity": 0.20,
        "profitMargin": 0.20,
        "zScore": 0.10,
        "revenueTrend": 0.10,
    },
    # --- Logistics & Transport ---
    # Asset-intensive and cyclical; leverage and liquidity dominate.
    "Logistics & Transport": {
        "debtRatio": 0.30,
        "liquidity": 0.25,
        "profitMargin": 0.20,
        "zScore": 0.15,
        "revenueTrend": 0.10,
    },
}

# Default weights (matches user specification exactly):
# 0.30 Leverage + 0.25 Liquidity + 0.20 Profitability + 0.15 Stability + 0.10 Growth
DEFAULT_WEIGHTS: dict[str, float] = {
    "debtRatio": 0.30,
    "liquidity": 0.25,
    "profitMargin": 0.20,
    "zScore": 0.15,
    "revenueTrend": 0.10,
}


def get_industry_weights(industry: str) -> tuple[dict[str, float], str]:
    """Return the weight configuration and canonical model label for an industry.

    Matching is case-insensitive and uses substring search so that values
    like "Food & Beverage Manufacturing" still resolve correctly.

    Returns:
        (weights_dict, model_label) — model_label is shown in the UI so the
        user knows which risk model was applied to their score.
    """
    normalized = (industry or "").strip().lower()
    for label, weights in INDUSTRY_WEIGHTS.items():
        if label.lower() in normalized or normalized in label.lower():
            return weights, label
    return DEFAULT_WEIGHTS, "General Industry"


@dataclass
class AnalysisResult:
    profit_margin: float
    burn_rate: float
    cash_runway_months: Optional[float]
    revenue_trend: float
    expense_trend: float
    debt_ratio: float
    liquidity_ratio: float
    altman_z_score: float
    risk_score: float
    risk_level: str
    calculation_sources: dict[str, str]
    # --- Advanced metrics ---
    financial_health_score: float   # 0-100, inverse of risk score (higher = healthier business)
    bankruptcy_probability: float   # percentage estimate based on Z-Score zone
    industry_model_applied: str     # name of the industry risk model used for the health score
    # --- v4.0: explainability & consistency layer ---
    risk_score_breakdown: dict[str, float] = field(default_factory=dict)
    confidence_level: str = "High"                  # High / Medium / Low
    confidence_explanation: str = ""
    revenue_trend_label: str = "Insufficient data"  # Increasing / Flat / Declining / Volatile
    runway_label: str = ""                          # human-readable runway description
    bankruptcy_explanation: str = ""                 # always explain the probability
    # --- v5.0: deterministic scoring outputs ---
    drivers: list[str] = field(default_factory=list)    # top 3 risk factors (plain English)
    explanation: str = ""                                # executive summary for investors/CFOs
    expense_ratio: float = 0.0                          # total_expenses / revenue


class FinancialAnalysisEngine:
    """Core engine for computing financial health metrics from a FinancialRecord.

    All input values for *flow* metrics (revenue, expenses, EBIT) are stored as
    **monthly** figures.  The Altman Z-Score and related formulas require
    *annual* figures when compared against balance-sheet stocks, so monthly
    flows are multiplied by MONTHS_PER_YEAR before being used in those
    calculations.
    """

    def analyze(
        self,
        record: FinancialRecord,
        previous: Optional[FinancialRecord] = None,
        industry: str = "",
        all_records: Optional[list] = None,
    ) -> AnalysisResult:
        """Run the full analysis pipeline and return an AnalysisResult.

        Args:
            record:      The primary financial record to analyse.
            previous:    Optional prior period record used for trend calculations.
            industry:    The business industry string (e.g. "Technology", "Retail").
            all_records: All available financial records (for revenue variance).
        """
        # --- Monthly flow figures (stored as-is in the DB) ---
        revenue_monthly = float(record.monthly_revenue or 0)
        expenses_monthly = float(record.monthly_expenses or 0)
        cogs_monthly = float(record.cost_of_goods_sold or 0)

        # --- Balance-sheet / point-in-time figures ---
        cash = float(record.cash_reserves or 0)
        debt = float(record.debt or 0)
        total_assets = float(record.total_assets) if record.total_assets is not None else None
        current_liabilities = (
            float(record.current_liabilities) if record.current_liabilities is not None else None
        )
        # ebit and retained_earnings may be annual or monthly depending on
        # what the user provided; treat them as-is but note the source.
        ebit_provided = float(record.ebit) if record.ebit is not None else None
        retained_earnings = (
            float(record.retained_earnings) if record.retained_earnings is not None else None
        )

        # --- Annualised flow figures (for Z-Score and ratios that need annual) ---
        revenue_annual = revenue_monthly * MONTHS_PER_YEAR
        expenses_annual = expenses_monthly * MONTHS_PER_YEAR
        cogs_annual = cogs_monthly * MONTHS_PER_YEAR

        # Record which fallback paths were taken for UI transparency.
        # scoring_model_version lets the frontend detect stale DB records.
        sources = {
            "scoring_model_version": SCORING_MODEL_VERSION,
            "total_assets": (
                "provided" if total_assets is not None and total_assets > 0
                else "fallback_half_revenue_plus_cash"
            ),
            "current_liabilities": (
                "provided"
                if current_liabilities is not None and current_liabilities >= 0
                else "fallback_monthly_expenses"
            ),
            "ebit": "provided" if ebit_provided is not None else "fallback_revenue_minus_expenses",
            "retained_earnings": (
                "provided"
                if retained_earnings is not None
                else "fallback_revenue_minus_expenses_minus_cogs"
            ),
        }

        # --- Compute individual metrics ---
        profit_margin = self._profit_margin(revenue_monthly, expenses_monthly)
        burn_rate = self._burn_rate(revenue_monthly, expenses_monthly)
        cash_runway = self._cash_runway(cash, burn_rate)

        revenue_trend = (
            self._trend(float(previous.monthly_revenue or 0), revenue_monthly)
            if previous is not None
            else 0.0  # No prior period — treat as stable (0% change)
        )
        expense_trend = (
            self._trend(float(previous.monthly_expenses or 0), expenses_monthly)
            if previous is not None
            else 0.0  # No prior period — treat as stable (0% change)
        )

        debt_ratio = self._debt_ratio(debt, total_assets, revenue_annual, cash)
        liquidity_ratio = self._liquidity_ratio(
            cash, current_liabilities, expenses_monthly, revenue_monthly
        )

        z_score = self._altman_z_score(
            revenue_annual=revenue_annual,
            expenses_annual=expenses_annual,
            cogs_annual=cogs_annual,
            cash=cash,
            debt=debt,
            total_assets=total_assets,
            current_liabilities=current_liabilities,
            ebit_provided=ebit_provided,
            retained_earnings=retained_earnings,
        )

        # Resolve industry-specific weights and model label
        industry_weights, industry_model_applied = get_industry_weights(industry)

        # ── Revenue history for stability scoring ──────────────────────────
        revenue_history: list[float] = []
        if all_records:
            revenue_history = [
                float(getattr(r, "monthly_revenue", 0) or 0) for r in all_records
            ]
        elif previous is not None:
            revenue_history = [float(previous.monthly_revenue or 0), revenue_monthly]
        else:
            revenue_history = [revenue_monthly]

        # ── Component risk scores (0–100 each, step-function scoring) ────
        leverage_score = self._score_leverage(debt_ratio)
        liquidity_score = self._score_liquidity(liquidity_ratio)
        profitability_score = self._score_profitability(profit_margin)
        stability_score = self._score_stability(revenue_history)
        growth_score = self._score_growth(revenue_trend)

        # ── Weighted risk score (deterministic, no penalties) ─────────────
        risk_score = (
            industry_weights["debtRatio"] * leverage_score
            + industry_weights["liquidity"] * liquidity_score
            + industry_weights["profitMargin"] * profitability_score
            + industry_weights["zScore"] * stability_score
            + industry_weights["revenueTrend"] * growth_score
        )
        risk_score = round(max(0.0, min(100.0, risk_score)), 2)
        financial_health_score = round(100.0 - risk_score, 2)

        # ── Expense ratio (display metric) ────────────────────────────────
        expense_ratio = round(
            (expenses_monthly / revenue_monthly) if revenue_monthly > 0 else 0.0, 4
        )

        # ── 4-tier risk classification ────────────────────────────────────
        if risk_score <= 25:
            risk_level = "low"
        elif risk_score <= 50:
            risk_level = "medium"
        elif risk_score <= 75:
            risk_level = "high"
        else:
            risk_level = "critical"

        # ── Top 3 risk drivers ────────────────────────────────────────────
        _driver_items = [
            (
                industry_weights["debtRatio"] * leverage_score,
                f"Debt ratio of {debt_ratio:.0%} "
                + ("exceeds safe threshold" if debt_ratio > 0.6
                   else "approaching risk zone" if debt_ratio >= 0.4
                   else "is within healthy range"),
            ),
            (
                industry_weights["liquidity"] * liquidity_score,
                f"Liquidity ratio of {liquidity_ratio:.2f} "
                + ("signals cash strain" if liquidity_ratio < 1.0
                   else "is adequate" if liquidity_ratio <= 2.0
                   else "is strong"),
            ),
            (
                industry_weights["profitMargin"] * profitability_score,
                f"Profit margin of {profit_margin:.1f}% "
                + ("is critically thin" if profit_margin < 5
                   else "is moderate" if profit_margin <= 15
                   else "is healthy"),
            ),
            (
                industry_weights["zScore"] * stability_score,
                "Revenue "
                + ("is highly volatile" if stability_score >= 85
                   else "shows moderate volatility" if stability_score >= 60
                   else "is stable"),
            ),
            (
                industry_weights["revenueTrend"] * growth_score,
                f"Revenue growth of {revenue_trend * 100:.1f}% "
                + ("is negative — contraction risk" if revenue_trend < 0
                   else "is flat — limited momentum" if revenue_trend <= 0.10
                   else "is positive"),
            ),
        ]
        _driver_items.sort(key=lambda x: x[0], reverse=True)
        drivers = [item[1] for item in _driver_items[:3]]

        # ── Executive summary ─────────────────────────────────────────────
        _tones = {
            "low": "demonstrates a healthy financial position",
            "medium": "has moderate risk exposure that warrants monitoring",
            "high": "faces elevated financial risk requiring attention",
            "critical": "is under significant financial stress requiring immediate action",
        }
        explanation = (
            f"The business {_tones[risk_level]} with a risk score of "
            f"{risk_score:.0f}/100. Primary driver: {drivers[0].lower()}."
        )

        bankruptcy_probability = self._bankruptcy_probability(z_score)

        # ── v4.0: Risk score breakdown (per-component contributions) ────────
        risk_score_breakdown = self._risk_score_breakdown(
            leverage_score=leverage_score,
            liquidity_score=liquidity_score,
            profitability_score=profitability_score,
            stability_score=stability_score,
            growth_score=growth_score,
            weights=industry_weights,
        )

        # ── v4.0: Confidence level ─────────────────────────────────────────
        confidence_level, confidence_explanation = self._compute_confidence(sources)

        # ── v4.0: Revenue trend label ───────────────────────────────────────
        revenue_trend_label = self._classify_revenue_trend(revenue_trend, previous)

        # ── v4.0: Runway label ──────────────────────────────────────────────
        runway_label = self._resolve_runway_label(
            burn_rate, cash_runway, cash, expenses_monthly,
        )

        # ── v4.0: Bankruptcy explanation ────────────────────────────────────
        bankruptcy_explanation = self._explain_bankruptcy(
            bankruptcy_probability, z_score, debt_ratio,
            liquidity_ratio, profit_margin,
        )

        return AnalysisResult(
            profit_margin=round(profit_margin, 4),
            burn_rate=round(burn_rate, 2),
            cash_runway_months=round(cash_runway, 2) if cash_runway is not None else None,
            revenue_trend=round(revenue_trend, 4),
            expense_trend=round(expense_trend, 4),
            debt_ratio=round(debt_ratio, 4),
            liquidity_ratio=round(liquidity_ratio, 4),
            altman_z_score=round(z_score, 4),
            risk_score=round(risk_score, 2),
            risk_level=risk_level,
            calculation_sources=sources,
            financial_health_score=round(financial_health_score, 2),
            bankruptcy_probability=round(bankruptcy_probability, 2),
            industry_model_applied=industry_model_applied,
            risk_score_breakdown=risk_score_breakdown,
            confidence_level=confidence_level,
            confidence_explanation=confidence_explanation,
            revenue_trend_label=revenue_trend_label,
            runway_label=runway_label,
            bankruptcy_explanation=bankruptcy_explanation,
            drivers=drivers,
            explanation=explanation,
            expense_ratio=expense_ratio,
        )

    # ------------------------------------------------------------------
    # Individual metric methods
    # ------------------------------------------------------------------

    def _profit_margin(self, revenue: float, expenses: float) -> float:
        """
        Profit Margin = (Revenue - Expenses) / Revenue × 100  (%)

        Uses monthly figures — a ratio, so scale does not matter.
        A healthy mature business typically shows > 10 %.

        When revenue is zero and expenses are positive the business is in a
        pre-revenue or total-loss state.  Returning 0 % would mask the
        severity and skip the negative-margin distress penalty (+15 pts),
        so we return -100 % instead.
        """
        if revenue == 0:
            return -100.0 if expenses > 0 else 0.0
        return (revenue - expenses) / revenue * 100

    def _burn_rate(self, revenue: float, expenses: float) -> float:
        """
        Burn Rate = max(Expenses - Revenue, 0)  (monthly cash deficit)

        Positive only when the business spends more than it earns.
        Returns 0 for profitable / break-even businesses.
        """
        return max(expenses - revenue, 0.0)

    def _cash_runway(self, cash_reserves: float, burn_rate: float) -> Optional[float]:
        """
        Cash Runway = Cash Reserves / Burn Rate  (months)

        Shows how many months until cash reserves are depleted at the current
        net cash burn (expenses minus revenue).

        Returns None when burn_rate <= 0 (business is cash-flow positive and
        not depleting reserves — runway is effectively infinite / "not at risk").
        """
        if burn_rate <= 0:
            return None
        return cash_reserves / burn_rate

    def _trend(self, previous: float, current: float) -> float:
        """
        Trend = (Current - Previous) / Previous

        Returns the relative period-over-period change as a ratio.
        Returns 0 when the previous value is zero.
        """
        if previous == 0:
            return 0.0
        return (current - previous) / previous

    def _debt_ratio(
        self,
        debt: float,
        total_assets: Optional[float],
        revenue_annual: float,
        cash: float,
    ) -> float:
        """
        Debt Ratio = Total Debt / Total Assets

        Total Assets: use the provided balance-sheet figure when available;
        otherwise approximate as annualised revenue + cash reserves.

        Interpretation:
          < 0.4  → conservative / healthy
          0.4–0.7 → moderate leverage
          > 0.7  → high leverage / warning zone
        """
        resolved_assets = (
            total_assets
            if total_assets is not None and total_assets > 0
            else cash + (revenue_annual * 0.5)
        )
        if resolved_assets == 0:
            return 0.0
        return debt / resolved_assets

    def _liquidity_ratio(
        self,
        cash_reserves: float,
        current_liabilities: Optional[float],
        monthly_expenses: float,
        monthly_revenue: float = 0.0,
    ) -> float:
        """
        Liquidity Ratio = Current Assets / Current Liabilities

        Current Assets  = Cash Reserves + (Monthly Revenue × 2)
        Current Liabilities:
          - Use the provided balance-sheet figure when available.
          - Fallback: Monthly Expenses × 1.5  (approximates short-term obligations
            as 1.5 months of operating costs).

        Interpretation:
          ≥ 1.5  → strong liquidity
          ≥ 1.0  → adequate liquidity
          < 1.0  → potential short-term cash strain
        """
        current_assets = cash_reserves + (monthly_revenue * 2)
        denominator = (
            current_liabilities
            if current_liabilities is not None and current_liabilities > 0
            else monthly_expenses * 1.5
        )
        if denominator == 0:
            return 999.0
        return current_assets / denominator

    def _altman_z_score(
        self,
        revenue_annual: float,
        expenses_annual: float,
        cogs_annual: float,
        cash: float,
        debt: float,
        total_assets: Optional[float],
        current_liabilities: Optional[float],
        ebit_provided: Optional[float],
        retained_earnings: Optional[float],
    ) -> float:
        """
        Altman Z-Score for public / large companies:

          Z = 1.2·X1 + 1.4·X2 + 3.3·X3 + 0.6·X4 + 1.0·X5

          X1 = Working Capital / Total Assets
               Working Capital = Current Assets − Current Liabilities
               Proxy: Cash − Current Liabilities
          X2 = Retained Earnings / Total Assets
               Fallback: annualised (Revenue − Expenses − COGS)
          X3 = EBIT / Total Assets
               IMPORTANT: EBIT must be on the same annual basis as Total Assets.
               If a monthly EBIT was provided, it is annualised (×12).
               Fallback: annualised Revenue − annualised Expenses
          X4 = Book Value of Equity / Total Liabilities
               Book Equity = Total Assets − Total Liabilities
               (if equity is negative the score is penalised naturally)
          X5 = Annual Sales / Total Assets

        Interpretation:
          Z > 3.0          → Safe / Low Risk
          1.8 ≤ Z ≤ 3.0   → Grey zone / Medium Risk
          Z < 1.8          → Distress / High Risk

        Note on scale invariance: because every term is a ratio, the formula
        works correctly for businesses of any size (small or Fortune-500).
        """
        # ------------------------------------------------------------------
        # Resolve balance-sheet figures with sensible fallbacks
        # ------------------------------------------------------------------
        resolved_assets = (
            total_assets
            if total_assets is not None and total_assets > 0
            else cash + (revenue_annual * 0.5)
        )
        if resolved_assets == 0:
            return 0.0

        resolved_current_liabilities = (
            current_liabilities
            if current_liabilities is not None and current_liabilities >= 0
            else expenses_annual / MONTHS_PER_YEAR  # monthly expenses proxy
        )

        resolved_retained_earnings = (
            retained_earnings
            if retained_earnings is not None
            else revenue_annual - expenses_annual - cogs_annual
        )

        # EBIT: data is stored per-month, so a provided EBIT field represents
        # the operating income for that single month.  The Z-Score requires
        # annual EBIT to be consistent with annual-scale balance-sheet figures
        # (total_assets, etc.).  We therefore annualise the provided value the
        # same way we annualise revenue and expenses.
        if ebit_provided is not None:
            resolved_ebit = ebit_provided * MONTHS_PER_YEAR   # monthly → annual
        else:
            resolved_ebit = revenue_annual - expenses_annual  # annual fallback

        # ------------------------------------------------------------------
        # Altman Z-Score components
        # ------------------------------------------------------------------

        # X1: Working Capital / Total Assets
        working_capital = cash - resolved_current_liabilities
        x1 = working_capital / resolved_assets

        # X2: Retained Earnings / Total Assets
        x2 = resolved_retained_earnings / resolved_assets

        # X3: EBIT / Total Assets  (both on annual / balance-sheet scale)
        x3 = resolved_ebit / resolved_assets

        # X4: Book Value of Equity / Total Liabilities
        # Book Equity = Total Assets − Total Liabilities
        # Total Liabilities = Total Debt + Current Liabilities (proxy)
        total_liabilities = debt + resolved_current_liabilities
        book_equity = resolved_assets - total_liabilities
        x4 = book_equity / total_liabilities if total_liabilities > 0 else 0.0

        # X5: Annual Sales / Total Assets
        x5 = revenue_annual / resolved_assets

        return 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5

    # ------------------------------------------------------------------
    # v4.0: Risk score breakdown (per-component contributions)
    # ------------------------------------------------------------------

    def _risk_score_breakdown(
        self,
        leverage_score: float,
        liquidity_score: float,
        profitability_score: float,
        stability_score: float,
        growth_score: float,
        weights: dict[str, float],
    ) -> dict[str, float]:
        """Per-component risk contributions that sum exactly to risk_score.

        v5.0: each value = weight × component step-function score.
        """
        return {
            "leverage_risk": round(weights["debtRatio"] * leverage_score, 1),
            "liquidity_risk": round(weights["liquidity"] * liquidity_score, 1),
            "profitability_risk": round(weights["profitMargin"] * profitability_score, 1),
            "stability_risk": round(weights["zScore"] * stability_score, 1),
            "trend_risk": round(weights["revenueTrend"] * growth_score, 1),
        }

    # ------------------------------------------------------------------
    # v4.0: Confidence level
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_confidence(sources: dict[str, str]) -> tuple[str, str]:
        """Return (level, explanation) based on how many fields use fallbacks."""
        fallback_fields = [
            k for k in ("total_assets", "current_liabilities", "ebit", "retained_earnings")
            if sources.get(k, "provided") != "provided"
        ]
        count = len(fallback_fields)
        if count == 0:
            return "High", "All balance-sheet inputs were provided directly."
        names = ", ".join(fallback_fields)
        if count <= 1:
            return "Medium", (
                f"One input ({names}) was estimated using a fallback, "
                "which may affect accuracy of solvency metrics."
            )
        return "Low", (
            f"Multiple inputs ({names}) are estimated using fallbacks, "
            "which may affect accuracy. Provide actual balance-sheet data for higher confidence."
        )

    # ------------------------------------------------------------------
    # v4.0: Revenue trend label (Rule #4 — no artificial precision)
    # ------------------------------------------------------------------

    @staticmethod
    def _classify_revenue_trend(
        revenue_trend: float,
        previous: Optional[object],
    ) -> str:
        """Return a human-readable label: Increasing / Flat / Declining / Insufficient data."""
        if previous is None:
            return "Insufficient data"
        pct = revenue_trend * 100
        if pct > 1:
            return "Increasing"
        if pct < -1:
            return "Declining"
        return "Flat"

    # ------------------------------------------------------------------
    # v4.0: Runway label (Rule #3 — never show ∞ or "Not at risk")
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_runway_label(
        burn_rate: float,
        cash_runway: Optional[float],
        cash_reserves: float,
        monthly_expenses: float,
    ) -> str:
        """Return a decision-useful runway label."""
        if burn_rate > 0 and cash_runway is not None:
            if cash_runway < 3:
                return f"{cash_runway:.1f} months — critical"
            if cash_runway < 6:
                return f"{cash_runway:.1f} months — tight"
            if cash_runway < 12:
                return f"{cash_runway:.1f} months"
            return f"{cash_runway:.0f} months — comfortable"

        # Business is cash-flow positive (burn_rate <= 0)
        # Check if cash reserves are still low relative to expenses
        months_of_expenses = (
            cash_reserves / monthly_expenses if monthly_expenses > 0 else 999
        )
        if months_of_expenses < 3:
            return "Limited cash buffer despite positive cash flow"
        return "No burn (cash-flow positive)"

    # ------------------------------------------------------------------
    # v4.0: Bankruptcy explanation (Rule #5 — always explained)
    # ------------------------------------------------------------------

    @staticmethod
    def _explain_bankruptcy(
        probability: float,
        z_score: float,
        debt_ratio: float,
        liquidity_ratio: float,
        profit_margin: float,
    ) -> str:
        """Return a plain-English explanation of the bankruptcy probability."""
        drivers: list[str] = []
        offsets: list[str] = []

        if z_score < 1.8:
            drivers.append("distress-zone Altman Z-score")
        elif z_score < 2.5:
            drivers.append("grey-zone Altman Z-score")
        else:
            offsets.append("safe-zone Z-score")

        if debt_ratio >= 0.6:
            drivers.append(f"high leverage ({debt_ratio:.0%} debt ratio)")
        elif debt_ratio < 0.3:
            offsets.append("conservative leverage")

        if liquidity_ratio < 1.0:
            drivers.append("sub-1 liquidity")
        elif liquidity_ratio >= 2.0:
            offsets.append("strong liquidity")

        if profit_margin < 0:
            drivers.append("negative profitability")
        elif profit_margin >= 10:
            offsets.append("healthy profitability")

        parts: list[str] = []
        if probability <= 10:
            parts.append(
                f"Bankruptcy risk is low at {probability:.0f}%"
            )
        elif probability <= 30:
            parts.append(
                f"Bankruptcy risk of {probability:.0f}% warrants monitoring"
            )
        else:
            parts.append(
                f"Bankruptcy risk is elevated at {probability:.0f}%"
            )

        if drivers:
            parts.append(f"driven primarily by {', '.join(drivers)}")
        if offsets:
            parts.append(f"partially offset by {', '.join(offsets)}")

        return ", ".join(parts) + "."

    # ------------------------------------------------------------------
    # v5.0: Deterministic component scoring (step functions)
    # ------------------------------------------------------------------

    @staticmethod
    def _score_leverage(debt_ratio: float) -> float:
        """Leverage risk score (0–100) from debt ratio.

        < 0.4  → 20  (low risk)
        0.4–0.6 → 50  (moderate)
        > 0.6  → 90  (high risk)
        """
        if debt_ratio < 0.4:
            return 20.0
        if debt_ratio <= 0.6:
            return 50.0
        return 90.0

    @staticmethod
    def _score_liquidity(liquidity_ratio: float) -> float:
        """Liquidity risk score (0–100) from current ratio.

        > 2.0  → 20  (low risk)
        1.0–2.0 → 50  (moderate)
        < 1.0  → 85  (high risk)
        """
        if liquidity_ratio > 2.0:
            return 20.0
        if liquidity_ratio >= 1.0:
            return 50.0
        return 85.0

    @staticmethod
    def _score_profitability(profit_margin: float) -> float:
        """Profitability risk score (0–100) from profit margin (%).

        > 15%  → 20  (low risk)
        5–15%  → 50  (moderate)
        < 5%   → 80  (high risk)
        """
        if profit_margin > 15.0:
            return 20.0
        if profit_margin >= 5.0:
            return 50.0
        return 80.0

    @staticmethod
    def _score_stability(revenue_values: list[float]) -> float:
        """Stability risk score (0–100) from revenue variance.

        Coefficient of variation (CV) across available periods:
          CV < 0.10   → 30  (stable)
          0.10–0.25   → 60  (moderate volatility)
          CV > 0.25   → 85  (high volatility)

        Falls back to 50 (moderate) when fewer than 3 periods are available.
        """
        if len(revenue_values) < 3:
            return 50.0  # insufficient data — assume moderate
        mean_val = sum(revenue_values) / len(revenue_values)
        if mean_val == 0:
            return 85.0  # no revenue = high instability
        variance = sum((r - mean_val) ** 2 for r in revenue_values) / len(revenue_values)
        cv = (variance ** 0.5) / abs(mean_val)
        if cv < 0.10:
            return 30.0
        if cv <= 0.25:
            return 60.0
        return 85.0

    @staticmethod
    def _score_growth(revenue_growth: float) -> float:
        """Growth risk score (0–100) from revenue growth ratio.

        > 10%     → 20  (low risk)
        0–10%     → 50  (moderate)
        negative  → 80  (high risk)
        """
        if revenue_growth > 0.10:
            return 20.0
        if revenue_growth >= 0.0:
            return 50.0
        return 80.0

    def _bankruptcy_probability(self, z_score: float) -> float:
        """
        Bankruptcy Probability — simplified estimate derived from Altman Z-Score zones.

        Five-tier mapping based on Altman's published Z-Score model thresholds:
          Z > 3.0          → ~5 %  probability (safe zone)
          2.5 ≤ Z ≤ 3.0   → ~10 % probability (approaching safe zone)
          1.8 ≤ Z < 2.5   → ~15 % probability (grey zone)
          1.2 ≤ Z < 1.8   → ~30 % probability (lower grey / early distress)
          Z < 1.2          → ~60 % probability (distress zone)

        Note: This is a qualitative probability band, not a precise actuarial
        calculation.  It serves as an accessible communication tool for
        non-financial users interpreting the analysis.
        """
        if z_score > 3.0:
            return 5.0
        elif z_score >= 2.5:
            return 10.0
        elif z_score >= 1.8:
            return 15.0
        elif z_score >= 1.2:
            return 30.0
        else:
            return 60.0
