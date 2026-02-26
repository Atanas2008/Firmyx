from typing import List
from app.services.financial_analysis import AnalysisResult
from app.models.risk_analysis import RiskLevel


class AdvisorService:
    """Generates actionable recommendations and a human-readable risk explanation
    based on the computed financial metrics."""

    def generate_recommendations(self, result: AnalysisResult) -> List[str]:
        """
        Evaluate each financial metric against predefined thresholds and return
        a list of 3–7 specific, actionable recommendations for the business owner.
        """
        recommendations: List[str] = []

        # Profit margin check
        if result.profit_margin < 10:
            recommendations.append(
                "Increase pricing or reduce cost of goods sold (COGS) to improve your profit margin above 10%."
            )

        # Cash runway / burn rate
        if result.burn_rate > 0 and result.cash_runway_months is not None:
            if result.cash_runway_months < 3:
                recommendations.append(
                    "CRITICAL: Cash runway is below 3 months. Immediately cut all non-essential expenses "
                    "and seek emergency financing or revenue acceleration."
                )
            elif result.cash_runway_months < 6:
                recommendations.append(
                    "Cash runway is below 6 months. Reduce discretionary expenses and explore bridging "
                    "finance or new revenue channels before reserves run out."
                )

        # Debt ratio
        if result.debt_ratio > 0.7:
            recommendations.append(
                "Debt ratio is dangerously high (above 70%). Prioritize debt refinancing, negotiate "
                "extended repayment terms, or seek equity to reduce leverage."
            )
        elif result.debt_ratio > 0.5:
            recommendations.append(
                "Debt ratio is elevated. Avoid taking on additional debt and create a structured "
                "repayment plan to bring the ratio below 50%."
            )

        # Liquidity ratio
        if result.liquidity_ratio < 1.0:
            recommendations.append(
                "Liquidity is critical — cash reserves do not cover one month of expenses. "
                "Build a cash buffer of at least 3 months' worth of operating expenses."
            )
        elif result.liquidity_ratio < 2.0:
            recommendations.append(
                "Cash reserves cover less than 2 months of expenses. Work toward maintaining "
                "at least 3 months of operating expenses in reserve."
            )

        # Expense trend (growing faster than revenue)
        if result.expense_trend > 0.1:
            recommendations.append(
                "Expenses are growing faster than 10% month-over-month. Review and cut "
                "discretionary spending, renegotiate supplier contracts, and track cost drivers weekly."
            )

        # Altman Z-Score distress zone
        if result.altman_z_score <= 1.81:
            recommendations.append(
                "Altman Z-Score indicates financial distress. Consider engaging a financial advisor "
                "or turnaround specialist and review your business model viability."
            )

        # Revenue trend negative
        if result.revenue_trend < -0.05:
            recommendations.append(
                "Revenue is declining. Analyze your customer churn rate, re-evaluate your pricing "
                "strategy, and invest in targeted sales and marketing efforts."
            )

        # Ensure at least 3 recommendations
        if len(recommendations) < 3:
            self._add_general_recommendations(recommendations, result)

        return recommendations[:7]

    def _add_general_recommendations(self, recommendations: List[str], result: AnalysisResult) -> None:
        """Pad the recommendations list with general best-practice advice."""
        general = [
            "Review your pricing strategy annually to ensure alignment with market rates and cost increases.",
            "Diversify your revenue streams to reduce dependence on a single product, service, or client.",
            "Establish a rolling 12-month financial forecast and review it monthly to stay ahead of risks.",
            "Automate recurring expense tracking to gain real-time visibility into cash flow.",
            "Negotiate improved payment terms with suppliers (longer payables) and customers (shorter receivables).",
        ]
        for tip in general:
            if tip not in recommendations:
                recommendations.append(tip)
            if len(recommendations) >= 3:
                break

    def generate_risk_explanation(self, result: AnalysisResult) -> str:
        """
        Compose a 2–3 sentence plain-English explanation of WHY the business
        has been assigned its current risk level.
        """
        level_label = {
            "safe": "a safe financial position",
            "moderate_risk": "a moderate-risk financial position",
            "high_risk": "a high-risk financial position",
        }.get(result.risk_level, "an undetermined risk level")

        sentences: List[str] = []

        # Opening sentence: overall verdict
        sentences.append(
            f"Based on the submitted financial data, this business is currently in {level_label} "
            f"with a risk score of {result.risk_score:.0f}/100."
        )

        # Middle sentence: key driving factors
        drivers: List[str] = []
        if result.altman_z_score <= 1.81:
            drivers.append(f"an Altman Z-Score of {result.altman_z_score:.2f} (distress zone)")
        elif result.altman_z_score <= 2.99:
            drivers.append(f"an Altman Z-Score of {result.altman_z_score:.2f} (grey zone)")
        if result.burn_rate > 0 and result.cash_runway_months is not None and result.cash_runway_months < 6:
            drivers.append(f"a cash runway of only {result.cash_runway_months:.1f} months")
        if result.profit_margin < 10:
            drivers.append(f"a profit margin of {result.profit_margin:.1f}%")
        if result.debt_ratio > 0.5:
            drivers.append(f"a high debt ratio of {result.debt_ratio:.2f}")
        if result.liquidity_ratio < 2.0:
            drivers.append(f"a low liquidity ratio of {result.liquidity_ratio:.2f}")

        if drivers:
            sentences.append("The main contributing factors are: " + ", ".join(drivers) + ".")

        # Closing sentence: directional guidance
        if result.risk_level == RiskLevel.high_risk:
            sentences.append(
                "Immediate corrective action is required to stabilize finances and avoid insolvency."
            )
        elif result.risk_level == RiskLevel.moderate_risk:
            sentences.append(
                "Proactive monitoring and targeted cost control measures are recommended to improve the financial outlook."
            )
        else:
            sentences.append(
                "Continue maintaining strong financial discipline to sustain this healthy position."
            )

        return " ".join(sentences)
