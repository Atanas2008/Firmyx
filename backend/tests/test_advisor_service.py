"""Unit tests for AdvisorService."""
import pytest
from types import SimpleNamespace
from app.services.advisor import AdvisorService


def _make_result(**overrides):
    """Build a minimal AnalysisResult-like object for testing."""
    defaults = {
        "profit_margin": 15.0,
        "burn_rate": 0.0,
        "cash_runway_months": 24.0,
        "revenue_trend": 0.05,
        "expense_trend": 0.02,
        "debt_ratio": 0.3,
        "liquidity_ratio": 2.0,
        "altman_z_score": 3.5,
        "financial_health_score": 75.0,
        "bankruptcy_probability": 5.0,
        "risk_score": 25.0,
        "risk_level": "low",
        "industry_model_applied": "Technology",
        "calculation_sources": {},
        "risk_score_breakdown": {},
        "confidence_level": "High",
        "confidence_explanation": "",
        "revenue_trend_label": "Growing",
        "runway_label": "Safe",
        "bankruptcy_explanation": "",
        "drivers": [],
        "explanation": "",
        "expense_ratio": 0.7,
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestGenerateRecommendations:
    def test_low_risk_returns_recommendations(self):
        advisor = AdvisorService()
        result = _make_result(risk_score=20.0, risk_level="low")
        recs = advisor.generate_recommendations(result)
        assert isinstance(recs, list)

    def test_high_risk_returns_recommendations(self):
        advisor = AdvisorService()
        result = _make_result(
            risk_score=70.0,
            risk_level="high",
            profit_margin=-5.0,
            cash_runway_months=3.0,
            debt_ratio=0.8,
            altman_z_score=1.5,
            bankruptcy_probability=35.0,
        )
        recs = advisor.generate_recommendations(result)
        assert isinstance(recs, list)
        assert len(recs) >= 1

    def test_critical_risk_returns_recommendations(self):
        advisor = AdvisorService()
        result = _make_result(
            risk_score=90.0,
            risk_level="critical",
            profit_margin=-100.0,
            burn_rate=50000.0,
            cash_runway_months=1.0,
            debt_ratio=0.95,
            altman_z_score=0.5,
            bankruptcy_probability=60.0,
        )
        recs = advisor.generate_recommendations(result)
        assert isinstance(recs, list)
        assert len(recs) >= 1

    def test_recommendation_structure(self):
        advisor = AdvisorService()
        result = _make_result(
            risk_score=55.0,
            risk_level="medium",
            profit_margin=5.0,
            debt_ratio=0.6,
            altman_z_score=2.0,
        )
        recs = advisor.generate_recommendations(result)
        if recs:
            rec = recs[0]
            assert "title" in rec
            assert "explanation" in rec
            assert "justification" in rec
            assert "driver" in rec["justification"]
            assert "comparison" in rec["justification"]
            assert "impact" in rec["justification"]

    def test_recommendations_capped_at_7(self):
        advisor = AdvisorService()
        # Worst-case: all metrics are bad
        result = _make_result(
            risk_score=95.0,
            risk_level="critical",
            profit_margin=-50.0,
            burn_rate=80000.0,
            cash_runway_months=0.5,
            debt_ratio=0.99,
            liquidity_ratio=0.1,
            altman_z_score=-1.0,
            revenue_trend=-0.3,
            bankruptcy_probability=70.0,
        )
        recs = advisor.generate_recommendations(result)
        assert len(recs) <= 7


class TestGenerateRiskExplanation:
    def test_returns_nonempty_string(self):
        advisor = AdvisorService()
        result = _make_result(risk_score=40.0, risk_level="medium")
        explanation = advisor.generate_risk_explanation(result)
        assert isinstance(explanation, str)
        assert len(explanation) > 0

    def test_critical_explanation(self):
        advisor = AdvisorService()
        result = _make_result(risk_score=90.0, risk_level="critical")
        explanation = advisor.generate_risk_explanation(result)
        assert isinstance(explanation, str)
        assert len(explanation) > 0
