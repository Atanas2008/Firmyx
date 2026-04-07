"""AI Chat service — conversational financial advisor powered by Google Gemini.

The LLM never computes metrics. All financial numbers are pre-computed by the
Firmyx analysis engine and injected into the system prompt as authoritative data.
The LLM only generates narrative text, explanations, and advice grounded in that data.
"""

from __future__ import annotations

import json
import logging

from google import genai

from app.config import settings

logger = logging.getLogger(__name__)

FALLBACK_MESSAGE = (
    "AI advisor is temporarily unavailable. "
    "Your pre-computed analysis and recommendations are still available above."
)


class AIChatService:
    """Handles conversational AI queries grounded in Firmyx financial data."""

    def __init__(self) -> None:
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = "gemini-2.5-flash"

    # ------------------------------------------------------------------
    # System prompt builder
    # ------------------------------------------------------------------

    def build_system_prompt(
        self,
        business_data: dict,
        financial_data: dict,
        analysis_data: dict,
        benchmark_data: dict,
    ) -> str:
        recommendations_json = json.dumps(
            analysis_data.get("recommendations") or [], indent=2
        )
        sources_json = json.dumps(
            analysis_data.get("calculation_sources") or {}, indent=2
        )

        # Safe formatting helpers — handle None gracefully
        def _f(val, fmt=".2f"):
            if val is None:
                return "N/A"
            try:
                return f"{val:{fmt}}"
            except (TypeError, ValueError):
                return str(val)

        def _fc(val, fmt=",.2f"):
            if val is None:
                return "N/A"
            try:
                return f"${val:{fmt}}"
            except (TypeError, ValueError):
                return str(val)

        return f"""You are the Firmyx AI Financial Advisor. You help business owners understand \
their financial health using data that has already been computed by the Firmyx \
risk analysis engine.

## YOUR RULES
- You NEVER compute or recalculate financial metrics. All numbers below are \
pre-computed and authoritative. Quote them directly.
- You NEVER invent data points that aren't provided below.
- You explain metrics in plain language suitable for a non-financial audience.
- You are honest about limitations: you analyze what's provided, you don't \
have access to bank accounts, market data, or real-time information.
- You speak in a professional but approachable tone. Use specific numbers \
from the data, not vague qualifiers.
- When giving advice, tie it to specific metrics (e.g., "Your debt ratio of \
64% is above the 45% industry average, which means...").
- If asked something outside the provided data, say so clearly.
- You are NOT a licensed financial advisor. Include this disclaimer when \
giving strategic recommendations.
- Keep responses concise — aim for 2-4 paragraphs unless the user asks for more detail.

## COMPANY PROFILE
- Name: {business_data.get('name', 'Unknown')}
- Industry: {business_data.get('industry', 'Unknown')}
- Country: {business_data.get('country', 'Unknown')}
- Employees: {business_data.get('num_employees', 'N/A')}
- Years operating: {business_data.get('years_operating', 'N/A')}

## LATEST FINANCIAL DATA (Monthly)
- Revenue: {_fc(financial_data.get('monthly_revenue'))}
- Expenses: {_fc(financial_data.get('monthly_expenses'))}
- Payroll: {_fc(financial_data.get('payroll'))}
- Rent: {_fc(financial_data.get('rent'))}
- Debt: {_fc(financial_data.get('debt'))}
- Cash Reserves: {_fc(financial_data.get('cash_reserves'))}
- COGS: {_fc(financial_data.get('cost_of_goods_sold'))}
- Period: {financial_data.get('period_month', '?')}/{financial_data.get('period_year', '?')}

## COMPUTED RISK ANALYSIS (from Firmyx engine — these are authoritative)
- Risk Score: {_f(analysis_data.get('risk_score'), '.0f')}/100 ({analysis_data.get('risk_level', 'N/A')})
- Financial Health Score: {_f(analysis_data.get('financial_health_score'), '.0f')}/100
- Profit Margin: {_f(analysis_data.get('profit_margin'), '.1f')}%
- Burn Rate: {_fc(analysis_data.get('burn_rate'))}/month
- Cash Runway: {_f(analysis_data.get('cash_runway_months'), '.1f')} months
- Debt Ratio: {_f((analysis_data.get('debt_ratio') or 0) * 100, '.1f')}%
- Liquidity Ratio: {_f(analysis_data.get('liquidity_ratio'))}
- Altman Z-Score: {_f(analysis_data.get('altman_z_score'))}
- Bankruptcy Probability: {_f(analysis_data.get('bankruptcy_probability'), '.0f')}%
- Revenue Trend (MoM): {analysis_data.get('revenue_trend', 'N/A')}
- Expense Trend (MoM): {analysis_data.get('expense_trend', 'N/A')}
- Industry Risk Model Applied: {analysis_data.get('industry_model_applied', 'N/A')}

## RISK SCORE INTERPRETATION
- 0-30: Low Risk (safe) \u2014 use calm, stable language
- 30-60: Moderate Risk \u2014 use balanced, cautious language
- 60-100: High Risk \u2014 use urgent, critical language

## CONSISTENCY RULES (MANDATORY)
- If burn rate is $0.00/month: the business is cash-flow positive. NEVER describe \
cash runway as a risk. Say "not at risk" or "cash-flow positive" instead.
- If cash runway shows N/A: the business is profitable and not burning cash. \
Do NOT flag runway concerns.
- If Altman Z-score > 3: ALWAYS describe the business as financially stable \
with low bankruptcy risk. NEVER use alarming language about solvency.
- NEVER mix contradictory signals:
  \u2022 Do NOT say "safe" and "immediate action required" in the same response
  \u2022 Do NOT say "low risk" and "cash running out" together
  \u2022 Do NOT say "profitable" and "high burn" together
- Match your tone to the risk score: 0-30 = calm/stable, 30-60 = balanced/cautious, 60+ = urgent/critical

## ALTMAN Z-SCORE INTERPRETATION
- Above 3.0: Safe zone — low probability of bankruptcy
- 1.8 to 3.0: Grey zone — moderate uncertainty
- Below 1.8: Distress zone — elevated bankruptcy risk

## INDUSTRY BENCHMARKS ({benchmark_data.get('label', 'General Industry')})
- Avg Profit Margin: {benchmark_data.get('profit_margin', 'N/A')}%
- Avg Liquidity Ratio: {benchmark_data.get('liquidity_ratio', 'N/A')}
- Avg Debt Ratio: {_f((benchmark_data.get('debt_ratio') or 0) * 100, '.1f')}%
- Avg Altman Z-Score: {benchmark_data.get('altman_z_score', 'N/A')}

## EXISTING RECOMMENDATIONS (from Firmyx engine)
{recommendations_json}

## CALCULATION TRANSPARENCY
The following inputs were estimated (not provided directly by the user):
{sources_json}
If a user asks about accuracy, note which values were provided vs estimated."""

    # ------------------------------------------------------------------
    # Chat method
    # ------------------------------------------------------------------

    def chat(
        self,
        user_message: str,
        conversation_history: list[dict],
        business_data: dict,
        financial_data: dict,
        analysis_data: dict,
        benchmark_data: dict,
    ) -> tuple[str, int | None]:
        """Send a message to Gemini with full financial context.

        Returns
        -------
        tuple[str, int | None]
            (assistant_reply, total_tokens_used)
        """
        system_prompt = self.build_system_prompt(
            business_data, financial_data, analysis_data, benchmark_data
        )

        # Trim history to last 10 exchanges (20 messages)
        history = conversation_history[-20:] if len(conversation_history) > 20 else conversation_history

        # Build Gemini contents: history + current user message
        contents = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
        contents.append({"role": "user", "parts": [{"text": user_message}]})

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config={
                    "system_instruction": system_prompt,
                    "max_output_tokens": 1024,
                    "temperature": 0.7,
                },
            )
            reply = response.text or FALLBACK_MESSAGE
            tokens_used = (
                response.usage_metadata.total_token_count
                if response.usage_metadata
                else None
            )
            return reply, tokens_used
        except Exception:
            logger.exception("Gemini API call failed")
            return FALLBACK_MESSAGE, None
