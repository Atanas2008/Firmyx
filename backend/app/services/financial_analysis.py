from dataclasses import dataclass
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
SCORING_MODEL_VERSION = "2.0"


# ---------------------------------------------------------------------------
# Industry-Specific Risk Weight Models
# ---------------------------------------------------------------------------
# Different industries have fundamentally different financial structures.
# A single fixed set of weights would produce misleading scores:
#
# - Technology / Software companies carry low debt and high margins, so
#   profit margin and revenue growth are better predictors of health than
#   solvency ratios (Z-Score).
#
# - Restaurants / Food & Beverage operate on thin margins and high turnover;
#   liquidity and insolvency risk (Z-Score) dominate.
#
# - Retail / Manufacturing are capital-intensive with moderate leverage;
#   solvency (Z-Score) and liquidity matter most.
#
# Each dict maps metric name → weight (must sum to 1.0).
INDUSTRY_WEIGHTS: dict[str, dict[str, float]] = {
    # --- Tech & Software ---
    # Z-Score and liquidity are elevated to catch distressed companies early,
    # even in high-growth environments. Revenue trend remains a factor but
    # no longer dominates — a growing startup burning cash must still register
    # as risky.
    "Technology": {
        "zScore": 0.35,
        "liquidity": 0.20,
        "profitMargin": 0.20,
        "debtRatio": 0.15,
        "revenueTrend": 0.10,
    },
    "Software": {
        "zScore": 0.35,
        "liquidity": 0.20,
        "profitMargin": 0.20,
        "debtRatio": 0.15,
        "revenueTrend": 0.10,
    },
    # --- Food, Beverage & Restaurants ---
    # Thin margins and high operational costs make Z-Score and liquidity
    # the most reliable early-warning signals for distress.
    "Food & Beverage": {
        "zScore": 0.25,
        "liquidity": 0.20,
        "profitMargin": 0.25,
        "debtRatio": 0.20,
        "revenueTrend": 0.10,
    },
    "Restaurants": {
        "zScore": 0.25,
        "liquidity": 0.20,
        "profitMargin": 0.25,
        "debtRatio": 0.20,
        "revenueTrend": 0.10,
    },
    "Coffee Chains": {
        "zScore": 0.25,
        "liquidity": 0.20,
        "profitMargin": 0.25,
        "debtRatio": 0.20,
        "revenueTrend": 0.10,
    },
    # --- Retail / Manufacturing ---
    # Capital-intensive, moderate leverage; solvency and liquidity dominate.
    # Revenue trend has less predictive power because sales can be lumpy.
    "Retail": {
        "zScore": 0.30,
        "liquidity": 0.25,
        "profitMargin": 0.20,
        "debtRatio": 0.15,
        "revenueTrend": 0.10,
    },
    "Manufacturing": {
        "zScore": 0.30,
        "liquidity": 0.25,
        "profitMargin": 0.20,
        "debtRatio": 0.15,
        "revenueTrend": 0.10,
    },
    # --- Healthcare ---
    # Regulated revenues; debt and margin stability are key.
    "Healthcare": {
        "zScore": 0.25,
        "liquidity": 0.20,
        "profitMargin": 0.25,
        "debtRatio": 0.20,
        "revenueTrend": 0.10,
    },
    # --- Real Estate ---
    # Asset-heavy, high leverage is normal; Z-Score is less informative.
    # Debt ratio needs extra weight given the sector's capital structure.
    "Real Estate": {
        "zScore": 0.15,
        "liquidity": 0.20,
        "profitMargin": 0.20,
        "debtRatio": 0.35,
        "revenueTrend": 0.10,
    },
    # --- Logistics & Transport ---
    # Asset-intensive and cyclical; liquidity and debt coverage matter most.
    "Logistics & Transport": {
        "zScore": 0.25,
        "liquidity": 0.25,
        "profitMargin": 0.20,
        "debtRatio": 0.20,
        "revenueTrend": 0.10,
    },
}

# Default weights used when no specific industry model is found.
# Balanced across all five metrics as a safe general-purpose baseline.
DEFAULT_WEIGHTS: dict[str, float] = {
    "zScore": 0.30,
    "liquidity": 0.25,
    "profitMargin": 0.20,
    "debtRatio": 0.15,
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
    revenue_trend: Optional[float]
    expense_trend: Optional[float]
    debt_ratio: float
    liquidity_ratio: float
    altman_z_score: float
    risk_score: float
    risk_level: str
    calculation_sources: dict[str, str]
    # --- New advanced metrics ---
    financial_health_score: float   # 0-100, inverse of risk score (higher = healthier business)
    bankruptcy_probability: float   # percentage estimate based on Z-Score zone
    industry_model_applied: str     # name of the industry risk model used for the health score


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
    ) -> AnalysisResult:
        """Run the full analysis pipeline and return an AnalysisResult.

        Args:
            record:   The primary financial record to analyse.
            previous: Optional prior period record used for trend calculations.
            industry: The business industry string (e.g. "Technology", "Retail").
                      Used to select the appropriate industry risk weight model.
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
        cash_runway = self._cash_runway(cash, expenses_monthly)

        revenue_trend = (
            self._trend(float(previous.monthly_revenue or 0), revenue_monthly)
            if previous is not None
            else None
        )
        expense_trend = (
            self._trend(float(previous.monthly_expenses or 0), expenses_monthly)
            if previous is not None
            else None
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

        # ── Primary composite Financial Health Score (0–100, higher = healthier) ──
        # Revenue trend is treated as 0.0 (neutral) when no prior period is available.
        financial_health_score = round(
            self._financial_health_score(
                z_score=z_score,
                liquidity_ratio=liquidity_ratio,
                profit_margin=profit_margin,
                debt_ratio=debt_ratio,
                revenue_trend=revenue_trend if revenue_trend is not None else 0.0,
                weights=industry_weights,
            ),
            2,
        )

        # Risk Score = complement of Financial Health Score (higher = riskier)
        risk_score = 100.0 - financial_health_score

        # ── Distress penalties ──────────────────────────────────────────────────
        # Applied after the weighted composite so that severe conditions in any
        # single critical dimension cannot be masked by strong scores elsewhere.
        # Combined maximum penalty = 45 points.
        if z_score < 1.8:
            risk_score = min(risk_score + 20.0, 100.0)
        if profit_margin < 0:
            risk_score = min(risk_score + 15.0, 100.0)
        if cash_runway is not None and cash_runway < 6:
            risk_score = min(risk_score + 10.0, 100.0)

        risk_score = round(min(risk_score, 100.0), 2)

        # Keep financial_health_score consistent with the penalised risk score
        financial_health_score = round(100.0 - risk_score, 2)

        # Map risk score to the 3-tier DB enum
        # (frontend derives the 4-tier display label directly from the numeric score)
        #   Safe          (0–30)   → "safe"
        #   Moderate Risk (30–50)  → "moderate_risk"
        #   High Risk     (50–70)  → "high_risk"
        #   Critical Risk (70–100) → "high_risk"
        if risk_score <= 30:
            risk_level = "safe"
        elif risk_score <= 50:
            risk_level = "moderate_risk"
        else:
            risk_level = "high_risk"

        bankruptcy_probability = self._bankruptcy_probability(z_score)

        return AnalysisResult(
            profit_margin=round(profit_margin, 4),
            burn_rate=round(burn_rate, 2),
            cash_runway_months=round(cash_runway, 2) if cash_runway is not None else None,
            revenue_trend=round(revenue_trend, 4) if revenue_trend is not None else None,
            expense_trend=round(expense_trend, 4) if expense_trend is not None else None,
            debt_ratio=round(debt_ratio, 4),
            liquidity_ratio=round(liquidity_ratio, 4),
            altman_z_score=round(z_score, 4),
            risk_score=round(risk_score, 2),
            risk_level=risk_level,
            calculation_sources=sources,
            financial_health_score=round(financial_health_score, 2),
            bankruptcy_probability=round(bankruptcy_probability, 2),
            industry_model_applied=industry_model_applied,
        )

    # ------------------------------------------------------------------
    # Individual metric methods
    # ------------------------------------------------------------------

    def _profit_margin(self, revenue: float, expenses: float) -> float:
        """
        Profit Margin = (Revenue - Expenses) / Revenue × 100  (%)

        Uses monthly figures — a ratio, so scale does not matter.
        A healthy mature business typically shows > 10 %.
        """
        if revenue == 0:
            return 0.0
        return (revenue - expenses) / revenue * 100

    def _burn_rate(self, revenue: float, expenses: float) -> float:
        """
        Burn Rate = max(Expenses - Revenue, 0)  (monthly cash deficit)

        Positive only when the business spends more than it earns.
        Returns 0 for profitable / break-even businesses.
        """
        return max(expenses - revenue, 0.0)

    def _cash_runway(self, cash_reserves: float, monthly_expenses: float) -> Optional[float]:
        """
        Cash Runway = Cash Reserves / Monthly Expenses  (months)

        Shows how many months the business can sustain all operations using
        current cash reserves, even if all revenue were to stop immediately.
        This applies to all businesses — not just those burning cash.

        Returns None if monthly expenses are zero.
        """
        if monthly_expenses <= 0:
            return None
        return cash_reserves / monthly_expenses

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

    def _risk_classification(
        self,
        z_score: float,
        liquidity_ratio: float,
        debt_ratio: float,
        profit_margin: float,
        burn_rate: float,
        cash_runway: Optional[float],
    ) -> tuple[float, str]:
        """
        Composite risk score (0–100) derived from four financial dimensions:

        1. Altman Z-Score (weight 50 %)
           Z > 3.0  → base 10   (low risk)
           1.8–3.0  → base 10–60 (linear scale, medium risk)
           Z < 1.8  → base 60–100 (linear scale, high risk)

        2. Liquidity Ratio (weight 20 %)
           ≥ 1.5  → +0   penalty
           1.0–1.5 → +5
           0.5–1.0 → +10
           < 0.5  → +15

        3. Debt Ratio (weight 20 %)
           < 0.4  → +0
           0.4–0.7 → +5
           ≥ 0.7  → +10

        4. Profit Margin (weight 10 %)
           ≥ 10 % → +0
           0–10 % → +3
           < 0 %  → +7

        Additional adjustment:
           Burn-rate penalty: +10 if runway < 3 months, +5 if < 6 months

        Final level:
           score ≤ 30 → "safe"
           30 < score ≤ 60 → "moderate_risk"
           score > 60 → "high_risk"
        """
        # --- Component 1: Z-Score base (0–100, 50 % of total) ---
        if z_score > 3.0:
            z_base = 10.0
        elif z_score >= 1.8:
            # Linear interpolation: Z=3.0 → 10, Z=1.8 → 60
            z_base = 10.0 + (3.0 - z_score) / (3.0 - 1.8) * 50.0
        else:
            # Linear interpolation: Z=1.8 → 60, Z=−5 → 100
            clamped = max(z_score, -5.0)
            z_base = 60.0 + (1.8 - clamped) / (1.8 + 5.0) * 40.0

        # --- Component 2: Liquidity penalty (0–15) ---
        if liquidity_ratio >= 1.5:
            liq_penalty = 0.0
        elif liquidity_ratio >= 1.0:
            liq_penalty = 5.0
        elif liquidity_ratio >= 0.5:
            liq_penalty = 10.0
        else:
            liq_penalty = 15.0

        # --- Component 3: Debt-ratio penalty (0–10) ---
        if debt_ratio < 0.4:
            debt_penalty = 0.0
        elif debt_ratio < 0.7:
            debt_penalty = 5.0
        else:
            debt_penalty = 10.0

        # --- Component 4: Profit-margin penalty (0–7) ---
        if profit_margin >= 10.0:
            margin_penalty = 0.0
        elif profit_margin >= 0.0:
            margin_penalty = 3.0
        else:
            margin_penalty = 7.0

        # --- Burn-rate adjustment ---
        burn_penalty = 0.0
        if burn_rate > 0 and cash_runway is not None:
            if cash_runway < 3:
                burn_penalty = 10.0
            elif cash_runway < 6:
                burn_penalty = 5.0

        # --- Combine with weights ---
        # z_base already reflects 50 % weight because its range is 10–100.
        # The remaining components add up to at most 42 points.
        # The weighted sum keeps the score meaningful and bounded at 100.
        raw = z_base * 0.50 + (liq_penalty + debt_penalty + margin_penalty + burn_penalty)

        # Normalise: z_base * 0.5 can be 5–50; penalties add 0–42 → max ~92.
        # We re-scale the penalty portion so the total fits 0–100.
        risk_score = min(max(raw, 0.0), 100.0)

        # 5-tier display classification (used on frontend via risk_score):
        #   0–20  → Very Safe    (mapped to DB level: safe)
        #   21–40 → Low Risk     (mapped to DB level: safe)
        #   41–60 → Moderate Risk(mapped to DB level: moderate_risk)
        #   61–80 → High Risk    (mapped to DB level: high_risk)
        #   81–100→ Critical Risk (mapped to DB level: high_risk)
        if risk_score <= 40:
            risk_level = "safe"
        elif risk_score <= 60:
            risk_level = "moderate_risk"
        else:
            risk_level = "high_risk"

        return risk_score, risk_level

    def _financial_health_score(
        self,
        z_score: float,
        liquidity_ratio: float,
        profit_margin: float,
        debt_ratio: float,
        revenue_trend: float,
        weights: Optional[dict] = None,
    ) -> float:
        """
        Financial Health Score — primary composite weighted metric (0–100, higher = healthier).

        Each raw metric is first normalised to a 0–1 scale where 1.0 = best-possible
        financial health for that dimension.  The industry-weighted average gives an
        overall health index [0–1] which is scaled to 0–100.

        Default weights (General Industry):
          30 % Altman Z-Score   — primary solvency signal
          25 % Liquidity Ratio  — short-term cash adequacy
          20 % Profit Margin    — operational efficiency
          15 % Debt Ratio       — leverage risk
          10 % Revenue Trend    — growth trajectory

        Normalisation bounds (chosen so that spec thresholds map to meaningful scores):
          Z-Score      [-5, 6]   : Z = 3.0 (safe zone entry) → ~0.73
          Liquidity    [0, 3.0]  : ratio = 2.0 (strong) → 0.67
          Profit Margin[-20, 30] : PM = 20 % (strong) → 0.80; PM = 0 % → 0.40
          Debt Ratio   [0, 1.0]  : debt = 0.60 (high risk) → health 0.40
          Revenue Trend[-0.3, 0.3]: +5 % MoM (strong growth) → ~0.58

        Risk classification (derived from this score):
          81–100 → Very Safe
          61–80  → Low Risk
          41–60  → Moderate Risk
          21–40  → High Risk
          0–20   → Critical Risk
        """
        if weights is None:
            weights = DEFAULT_WEIGHTS

        # --- Normalise each metric to [0, 1] health scale ---

        # Z-Score: clamp [-5, 6]; Z=6 → 1.0, Z=-5 → 0.0
        # Safe zone (Z≥3.0) maps to ≥0.73; distress zone (Z<1.2) maps to <0.38.
        z_norm = max(0.0, min(1.0, (z_score + 5.0) / 11.0))

        # Liquidity Ratio: clamp [0, 3]; ratio=3 → 1.0, ratio=2 → 0.67, ratio<1 → <0.33
        liq_norm = max(0.0, min(1.0, liquidity_ratio / 3.0))

        # Profit Margin (%): clamp [-20, 30]; 30 % → 1.0, 20 % → 0.80, 0 % → 0.40, -20 % → 0.0
        pm_norm = max(0.0, min(1.0, (profit_margin + 20.0) / 50.0))

        # Debt Ratio: lower debt = healthier; clamp [0, 1.0]; 0 → 1.0, 0.6 → 0.40, ≥1.0 → 0.0
        debt_norm = max(0.0, min(1.0, 1.0 - debt_ratio / 1.0))

        # Revenue Trend (ratio): clamp [-0.3, 0.3]; +0.3 → 1.0, +0.05 → ~0.58, 0 → 0.50, -0.3 → 0.0
        trend_norm = max(0.0, min(1.0, (revenue_trend + 0.3) / 0.6))

        # --- Weighted health index (0–1, higher = healthier) ---
        health = (
            weights["zScore"]       * z_norm
            + weights["liquidity"]    * liq_norm
            + weights["profitMargin"] * pm_norm
            + weights["debtRatio"]    * debt_norm
            + weights["revenueTrend"] * trend_norm
        )

        # Scale to 0–100 (higher = healthier, NOT inverted)
        return health * 100.0

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
