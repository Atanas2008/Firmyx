import os
import uuid
from datetime import datetime
from typing import List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from app.config import settings
from app.models.risk_analysis import RiskAnalysis, RiskLevel
from app.models.business import Business


# Risk level color mapping
RISK_COLORS = {
    RiskLevel.safe: colors.HexColor("#2ecc71"),
    RiskLevel.moderate_risk: colors.HexColor("#f39c12"),
    RiskLevel.high_risk: colors.HexColor("#e74c3c"),
}

RISK_LABELS = {
    RiskLevel.safe: "SAFE",
    RiskLevel.moderate_risk: "MODERATE RISK",
    RiskLevel.high_risk: "HIGH RISK",
}


class ReportGenerator:
    """Generates a PDF financial health report using ReportLab."""

    def generate(self, business: Business, analysis: RiskAnalysis, forecast_data=None, scenario_data=None) -> str:
        """
        Build a PDF report for the given business and risk analysis.

        Args:
            business: The business entity.
            analysis: The risk analysis entity.
            forecast_data: Optional list of monthly forecast dicts from forecasting service.
            scenario_data: Optional scenario comparison dict from scenario service.

        Returns the absolute file path of the generated PDF.
        """
        os.makedirs(settings.REPORTS_DIR, exist_ok=True)
        filename = f"report_{business.id}_{uuid.uuid4().hex[:8]}.pdf"
        filepath = os.path.join(settings.REPORTS_DIR, filename)

        doc = SimpleDocTemplate(
            filepath,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        story = []
        styles = getSampleStyleSheet()
        story += self._build_header(business, analysis, styles)
        story.append(Spacer(1, 0.5 * cm))
        story += self._build_metrics_table(analysis, styles)
        story.append(Spacer(1, 0.5 * cm))
        story += self._build_calculation_sources(analysis, styles)
        story.append(Spacer(1, 0.5 * cm))
        story += self._build_recommendations(analysis, styles)
        story.append(Spacer(1, 0.5 * cm))
        # CHANGED: Append forecast section if data is provided
        if forecast_data:
            story += self._build_forecast_section(forecast_data, styles)
            story.append(Spacer(1, 0.5 * cm))
        # CHANGED: Append scenario section if data is provided
        if scenario_data:
            story += self._build_scenario_section(scenario_data, styles)
            story.append(Spacer(1, 0.5 * cm))
        story += self._build_footer(styles)

        doc.build(story)
        return filepath

    # ------------------------------------------------------------------
    # Section builders
    # ------------------------------------------------------------------

    def _build_header(self, business: Business, analysis: RiskAnalysis, styles) -> list:
        elements = []

        title_style = ParagraphStyle(
            "Title",
            parent=styles["Title"],
            fontSize=22,
            spaceAfter=6,
            alignment=TA_CENTER,
        )
        sub_style = ParagraphStyle(
            "Sub",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.grey,
            alignment=TA_CENTER,
        )

        elements.append(Paragraph("Firmyx Financial Health Report", title_style))
        elements.append(
            Paragraph(
                f"{business.name} &nbsp;&nbsp;|&nbsp;&nbsp; "
                f"Generated: {datetime.utcnow().strftime('%B %d, %Y')}",
                sub_style,
            )
        )
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        elements.append(Spacer(1, 0.3 * cm))

        # Large risk score badge
        risk_color = RISK_COLORS.get(analysis.risk_level, colors.grey)
        risk_label = RISK_LABELS.get(analysis.risk_level, str(analysis.risk_level))

        score_style = ParagraphStyle(
            "Score",
            parent=styles["Normal"],
            fontSize=48,
            textColor=risk_color,
            alignment=TA_CENTER,
            leading=54,
        )
        label_style = ParagraphStyle(
            "Label",
            parent=styles["Normal"],
            fontSize=18,
            textColor=risk_color,
            alignment=TA_CENTER,
            spaceAfter=4,
        )

        elements.append(Paragraph(f"{analysis.risk_score:.0f}<font size='18'>/100</font>", score_style))
        elements.append(Paragraph(risk_label, label_style))

        if analysis.risk_explanation:
            explanation_style = ParagraphStyle(
                "Explanation",
                parent=styles["Normal"],
                fontSize=10,
                leading=14,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#444444"),
                spaceAfter=6,
            )
            elements.append(Paragraph(analysis.risk_explanation, explanation_style))

        return elements

    def _build_metrics_table(self, analysis: RiskAnalysis, styles) -> list:
        elements = []

        section_style = ParagraphStyle(
            "Section",
            parent=styles["Heading2"],
            fontSize=13,
            spaceAfter=6,
        )
        elements.append(Paragraph("Key Financial Metrics", section_style))

        INFINITY_DISPLAY_THRESHOLD = 999  # Values >= this are shown as infinity

        def fmt(value, suffix=""):
            if value is None:
                return "N/A"
            if abs(value) >= INFINITY_DISPLAY_THRESHOLD:
                return f"∞{suffix}"
            return f"{value:.2f}{suffix}"

        data = [
            ["Metric", "Value", "Benchmark"],
            ["Profit Margin", fmt(analysis.profit_margin, "%"), "> 10%"],
            ["Burn Rate ($/mo)", fmt(analysis.burn_rate), "0 (profitable)"],
            ["Cash Runway", fmt(analysis.cash_runway_months, " mo"), "> 6 months"],
            ["Debt Ratio", fmt(analysis.debt_ratio), "< 0.5"],
            ["Liquidity Ratio", fmt(analysis.liquidity_ratio), "> 2.0"],
            ["Altman Z-Score", fmt(analysis.altman_z_score), "> 2.99 (safe)"],
            ["Revenue Trend (MoM)", fmt(analysis.revenue_trend, "x"), "> 0"],
            ["Expense Trend (MoM)", fmt(analysis.expense_trend, "x"), "< 0.1"],
        ]

        table = Table(data, colWidths=[7 * cm, 5 * cm, 5 * cm])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 11),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f6f7")]),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                    ("FONTSIZE", (0, 1), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        elements.append(table)
        return elements

    def _build_calculation_sources(self, analysis: RiskAnalysis, styles) -> list:
        elements = []

        section_style = ParagraphStyle(
            "Section",
            parent=styles["Heading2"],
            fontSize=13,
            spaceAfter=6,
        )
        elements.append(Paragraph("Calculation Sources", section_style))

        raw_sources = analysis.calculation_sources or {}

        source_descriptions = {
            "provided": "Provided input",
            "fallback_revenue_plus_cash": "Estimated from Revenue + Cash Reserves",
            "fallback_monthly_expenses": "Estimated from Monthly Expenses",
            "fallback_revenue_minus_expenses": "Estimated from Revenue - Expenses",
            "fallback_revenue_minus_expenses_minus_cogs": "Estimated from Revenue - Expenses - COGS",
            "unknown": "Source unavailable",
        }

        def source_text(key: str) -> str:
            source = raw_sources.get(key, "unknown")
            return source_descriptions.get(source, f"Fallback ({source})")

        source_rows = [
            ["Input", "Source"],
            ["Total Assets", source_text("total_assets")],
            ["Current Liabilities", source_text("current_liabilities")],
            ["EBIT", source_text("ebit")],
            ["Retained Earnings", source_text("retained_earnings")],
        ]

        source_table = Table(source_rows, colWidths=[7 * cm, 10 * cm])
        source_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#34495e")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9f9")]),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        elements.append(source_table)
        return elements

    def _build_recommendations(self, analysis: RiskAnalysis, styles) -> list:
        elements = []

        section_style = ParagraphStyle(
            "Section",
            parent=styles["Heading2"],
            fontSize=13,
            spaceAfter=6,
        )
        bullet_style = ParagraphStyle(
            "Bullet",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            leftIndent=12,
            spaceAfter=4,
        )

        elements.append(Paragraph("Actionable Recommendations", section_style))

        recommendations: List[str] = analysis.recommendations or []
        if not recommendations:
            elements.append(Paragraph("No specific recommendations at this time.", bullet_style))
        else:
            for rec in recommendations:
                elements.append(Paragraph(f"• {rec}", bullet_style))

        return elements

    def _build_footer(self, styles) -> list:
        footer_style = ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_CENTER,
        )
        return [
            HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey),
            Spacer(1, 0.2 * cm),
            Paragraph(
                "This report is generated by Firmyx and is intended for informational purposes only. "
                "It does not constitute financial advice.",
                footer_style,
            ),
        ]

    # CHANGED: New section for 12-Month Forecast
    def _build_forecast_section(self, forecast_data: list, styles) -> list:
        elements = []

        section_style = ParagraphStyle(
            "ForecastTitle",
            parent=styles["Heading2"],
            fontSize=13,
            spaceAfter=6,
        )
        elements.append(Paragraph("12-Month Financial Forecast", section_style))

        def fmt(value):
            if value is None:
                return "N/A"
            return f"${value:,.0f}" if abs(value) >= 1 else f"{value:.2f}"

        header = ["Month", "Revenue", "Expenses", "Profit", "Cash Balance", "Risk"]
        data = [header]
        for row in forecast_data:
            data.append([
                str(row.get("month", "")),
                fmt(row.get("projected_revenue")),
                fmt(row.get("projected_expenses")),
                fmt(row.get("projected_profit")),
                fmt(row.get("projected_cash_balance")),
                f"{row.get('projected_risk_score', 0):.0f}",
            ])

        col_widths = [2 * cm, 3 * cm, 3 * cm, 3 * cm, 3.5 * cm, 2.5 * cm]
        table = Table(data, colWidths=col_widths)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a5276")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eaf2f8")]),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        elements.append(table)
        return elements

    # CHANGED: New section for Scenario Analysis
    def _build_scenario_section(self, scenario_data: dict, styles) -> list:
        elements = []

        section_style = ParagraphStyle(
            "ScenarioTitle",
            parent=styles["Heading2"],
            fontSize=13,
            spaceAfter=6,
        )
        elements.append(Paragraph("Scenario Analysis", section_style))

        comparison = scenario_data.get("comparison", {})
        if not comparison:
            note_style = ParagraphStyle("ScNote", parent=styles["Normal"], fontSize=10)
            elements.append(Paragraph("No scenario comparison data available.", note_style))
            return elements

        metric_labels = {
            "profit_margin": "Profit Margin",
            "burn_rate": "Burn Rate",
            "cash_runway_months": "Cash Runway",
            "debt_ratio": "Debt Ratio",
            "liquidity_ratio": "Liquidity Ratio",
            "altman_z_score": "Altman Z-Score",
            "risk_score": "Risk Score",
            "financial_health_score": "Health Score",
            "bankruptcy_probability": "Bankruptcy Prob.",
        }

        def fmt_val(v):
            if v is None:
                return "N/A"
            return f"{v:.2f}"

        header = ["Metric", "Original", "Simulated", "Change", "Direction"]
        data = [header]
        for key, cmp in comparison.items():
            label = metric_labels.get(key, key)
            orig = fmt_val(cmp.get("original"))
            adj = fmt_val(cmp.get("adjusted"))
            delta = fmt_val(cmp.get("delta"))
            direction = cmp.get("direction", "neutral").capitalize()
            data.append([label, orig, adj, delta, direction])

        col_widths = [4 * cm, 3 * cm, 3 * cm, 3 * cm, 4 * cm]
        table = Table(data, colWidths=col_widths)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a5276")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eaf2f8")]),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        elements.append(table)
        return elements
