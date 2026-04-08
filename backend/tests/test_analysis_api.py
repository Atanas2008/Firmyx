"""Tests for analysis API endpoints."""
import pytest


class TestRunAnalysis:
    def test_analyze_no_records(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.post(f"/api/businesses/{bid}/analyze", headers=auth_headers)
        assert resp.status_code == 404

    def test_analyze_success(self, client, auth_headers, test_business, test_record):
        bid = test_business["id"]
        resp = client.post(f"/api/businesses/{bid}/analyze", headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert "risk_score" in data
        assert "risk_level" in data
        assert "recommendations" in data
        assert data["risk_level"] in ("low", "medium", "high", "critical")
        assert 0 <= data["risk_score"] <= 100


class TestRunAllMonthsAnalysis:
    def test_all_months_no_records(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.post(
            f"/api/businesses/{bid}/analyze/all-months", headers=auth_headers
        )
        assert resp.status_code == 404

    def test_all_months_success(self, client, auth_headers, test_business, test_record):
        bid = test_business["id"]
        # Add a second record for multi-month analysis
        client.post(
            f"/api/businesses/{bid}/records",
            json={
                "period_month": 2,
                "period_year": 2025,
                "monthly_revenue": 55000,
                "monthly_expenses": 36000,
                "payroll": 15500,
                "rent": 3000,
                "debt": 19000,
                "cash_reserves": 110000,
                "taxes": 5500,
                "cost_of_goods_sold": 11000,
            },
            headers=auth_headers,
        )
        resp = client.post(
            f"/api/businesses/{bid}/analyze/all-months", headers=auth_headers
        )
        assert resp.status_code == 201
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2


class TestRunCombinedAnalysis:
    def test_combined_no_records(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.post(
            f"/api/businesses/{bid}/analyze/combined", headers=auth_headers
        )
        assert resp.status_code == 404

    def test_combined_success(self, client, auth_headers, test_business, test_record):
        bid = test_business["id"]
        resp = client.post(
            f"/api/businesses/{bid}/analyze/combined", headers=auth_headers
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["analysis_scope"] == "combined"
        assert "risk_score" in data


class TestListAnalyses:
    def test_list_empty(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.get(f"/api/businesses/{bid}/analysis", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_after_analysis(self, client, auth_headers, test_business, test_record):
        bid = test_business["id"]
        # Run an analysis first
        client.post(f"/api/businesses/{bid}/analyze", headers=auth_headers)
        resp = client.get(f"/api/businesses/{bid}/analysis", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) >= 1
        assert data["total"] >= 1


class TestForecast:
    def test_forecast_no_records(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.post(
            f"/api/businesses/{bid}/forecast",
            json={"months": 6, "scenario": "baseline"},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_forecast_success(self, client, auth_headers, test_business, test_record):
        bid = test_business["id"]
        resp = client.post(
            f"/api/businesses/{bid}/forecast",
            json={"months": 6, "scenario": "baseline"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "projections" in data
        assert len(data["projections"]) == 6


class TestScenario:
    def test_scenario_no_records(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.post(
            f"/api/businesses/{bid}/scenario",
            json={"revenue_change_pct": 10},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_scenario_success(self, client, auth_headers, test_business, test_record):
        bid = test_business["id"]
        resp = client.post(
            f"/api/businesses/{bid}/scenario",
            json={"revenue_change_pct": 10.0},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "original" in data
        assert "adjusted" in data
        assert "comparison" in data
