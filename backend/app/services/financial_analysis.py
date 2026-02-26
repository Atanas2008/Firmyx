from dataclasses import dataclass
from typing import Optional
from app.models.financial_record import FinancialRecord


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


class FinancialAnalysisEngine:
    """Core engine for computing financial health metrics from a FinancialRecord."""

    def analyze(self, record: FinancialRecord, previous: Optional[FinancialRecord] = None) -> AnalysisResult:
        """Run the full analysis pipeline and return an AnalysisResult."""
        revenue = float(record.monthly_revenue or 0)
        expenses = float(record.monthly_expenses or 0)
        cash = float(record.cash_reserves or 0)
        debt = float(record.debt or 0)
        cogs = float(record.cost_of_goods_sold or 0)

        profit_margin = self._profit_margin(revenue, expenses)
        burn_rate = self._burn_rate(revenue, expenses)
        cash_runway = self._cash_runway(cash, burn_rate)
        revenue_trend = self._trend(
            float(previous.monthly_revenue or 0) if previous else revenue, revenue
        )
        expense_trend = self._trend(
            float(previous.monthly_expenses or 0) if previous else expenses, expenses
        )
        debt_ratio = self._debt_ratio(debt, revenue, cash)
        liquidity_ratio = self._liquidity_ratio(cash, expenses)
        z_score = self._altman_z_score(revenue, expenses, cash, debt, cogs)
        risk_score, risk_level = self._risk_classification(
            z_score, burn_rate, cash_runway, profit_margin
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
        )

    # ------------------------------------------------------------------
    # Individual metric methods
    # ------------------------------------------------------------------

    def _profit_margin(self, revenue: float, expenses: float) -> float:
        """
        Profit Margin = (Revenue - Total Expenses) / Revenue * 100

        Measures what percentage of revenue remains as profit after expenses.
        A healthy business typically has a profit margin > 10%.
        """
        if revenue == 0:
            return 0.0
        return (revenue - expenses) / revenue * 100

    def _burn_rate(self, revenue: float, expenses: float) -> float:
        """
        Burn Rate = Expenses - Revenue (net monthly cash deficit).

        Represents the net cash consumed per month when the business is
        spending more than it earns. Returns 0 when revenue covers expenses
        (the business is break-even or profitable).
        """
        if expenses > revenue:
            return expenses - revenue
        return 0.0

    def _cash_runway(self, cash_reserves: float, burn_rate: float) -> Optional[float]:
        """
        Cash Runway = Cash Reserves / Burn Rate (in months).

        How many months the business can operate before running out of cash,
        given the current burn rate. Returns None when there is no burn
        (the business is profitable or break-even), because runway is not
        a meaningful finite value in that case.
        """
        if burn_rate <= 0:
            return None
        if cash_reserves <= 0:
            return 0.0
        return cash_reserves / burn_rate

    def _trend(self, previous: float, current: float) -> float:
        """
        Trend = (Current - Previous) / Previous as a ratio.

        Positive values indicate growth; negative values indicate contraction.
        Returns 0 when the previous value is zero to avoid division by zero.
        """
        if previous == 0:
            return 0.0
        return (current - previous) / previous

    def _debt_ratio(self, debt: float, revenue: float, cash: float) -> float:
        """
        Debt Ratio = Total Debt / Total Assets.

        Total assets are approximated as revenue + cash_reserves.
        A ratio above 0.7 is considered dangerous. Returns 0 when assets = 0.
        """
        total_assets = revenue + cash
        if total_assets == 0:
            return 0.0
        return debt / total_assets

    def _liquidity_ratio(self, cash_reserves: float, monthly_expenses: float) -> float:
        """
        Liquidity Ratio = Cash Reserves / Monthly Expenses.

        Indicates how many months of expenses can be covered by current cash.
        A ratio below 1.0 signals a critical liquidity situation.
        """
        if monthly_expenses == 0:
            return 999.0
        return cash_reserves / monthly_expenses

    def _altman_z_score(
        self,
        revenue: float,
        expenses: float,
        cash: float,
        debt: float,
        cogs: float,
    ) -> float:
        """
        Altman Z-Score (adapted for private/small business):

        Z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 1.0*X5

        Where:
          X1 = Working Capital / Total Assets
               (Working Capital = Cash - Current Liabilities ≈ cash - expenses)
          X2 = Retained Earnings / Total Assets
               (approximated as cumulative profit = revenue - expenses - cogs)
          X3 = EBIT / Total Assets
               (EBIT = revenue - expenses)
          X4 = Equity / Total Liabilities
               (Equity ≈ cash, Liabilities ≈ debt + expenses)
          X5 = Revenue / Total Assets

        Interpretation:
          Z > 2.99  → Safe zone
          1.81–2.99 → Grey zone
          Z ≤ 1.81  → Distress zone
        """
        total_assets = revenue + cash
        if total_assets == 0:
            return 0.0

        working_capital = cash - expenses
        retained_earnings = revenue - expenses - cogs
        ebit = revenue - expenses
        total_liabilities = debt + expenses if (debt + expenses) > 0 else 1.0

        x1 = working_capital / total_assets
        x2 = retained_earnings / total_assets
        x3 = ebit / total_assets
        x4 = cash / total_liabilities
        x5 = revenue / total_assets

        return 1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5

    def _risk_classification(
        self,
        z_score: float,
        burn_rate: float,
        cash_runway: Optional[float],
        profit_margin: float,
    ) -> tuple[float, str]:
        """
        Derive a composite risk score (0–100) and risk level label.

        Base score from Altman Z-Score zones:
          Z > 2.99  → 0–30  (safe)
          1.81–2.99 → 31–60 (moderate_risk)
          Z ≤ 1.81  → 61–100 (high_risk)

        Penalty adjustments:
          +10 if burn_rate > 0 and cash_runway < 3 months
          +5  if burn_rate > 0 and cash_runway < 6 months
          +5  if profit_margin < 0
        """
        if z_score > 2.99:
            base = 15.0
        elif z_score > 1.81:
            # Scale linearly from 31 to 60 within [1.81, 2.99]
            base = 31.0 + (2.99 - z_score) / (2.99 - 1.81) * 29.0
        else:
            # Scale from 61 to 100 below 1.81
            clamped = max(z_score, -5.0)
            base = 61.0 + (1.81 - clamped) / (1.81 + 5.0) * 39.0

        # Penalty for cash situation
        if burn_rate > 0 and cash_runway is not None:
            if cash_runway < 3:
                base += 10
            elif cash_runway < 6:
                base += 5

        # Penalty for negative profit
        if profit_margin < 0:
            base += 5

        risk_score = min(max(base, 0.0), 100.0)

        if risk_score <= 30:
            risk_level = "safe"
        elif risk_score <= 60:
            risk_level = "moderate_risk"
        else:
            risk_level = "high_risk"

        return risk_score, risk_level
