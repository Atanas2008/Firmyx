"""
Data integrity and edge-case tests.

Validates that the system handles extreme, unusual, and boundary-value
financial data without crashing or producing nonsensical results.
"""

import math
import sys

import pytest
from fastapi.testclient import TestClient


def _register_and_login(client: TestClient, email: str):
    client.post("/api/auth/register", json={
        "email": email, "password": "TestPass123", "full_name": "Edge User",
    })
    resp = client.post("/api/auth/login", json={"email": email, "password": "TestPass123"})
    token = resp.cookies.get("access_token", "")
    return {"Authorization": f"Bearer {token}"}


def _create_business(client, headers, name="Edge Corp"):
    return client.post("/api/businesses", json={
        "name": name, "industry": "Technology", "country": "BG",
        "num_employees": 5, "years_operating": 2,
    }, headers=headers).json()


def _create_record(client, headers, biz_id, **overrides):
    data = {
        "period_month": 1, "period_year": 2025,
        "monthly_revenue": 50000, "monthly_expenses": 35000,
        "payroll": 15000, "rent": 3000, "debt": 20000,
        "cash_reserves": 100000, "taxes": 5000, "cost_of_goods_sold": 10000,
    }
    data.update(overrides)
    return client.post(
        f"/api/businesses/{biz_id}/records", json=data, headers=headers
    )


# ── Zero / negative values ──────────────────────────────────────────────────

class TestZeroAndNegativeValues:
    """Financial data with zero or negative values."""

    def test_zero_revenue(self, client, db):
        headers = _register_and_login(client, "zero_rev@example.com")
        biz = _create_business(client, headers)
        _create_record(client, headers, biz["id"], monthly_revenue=0)
        r = client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
        assert r.status_code == 201
        data = r.json()
        assert data["risk_score"] is not None

    def test_zero_everything(self, client, db):
        headers = _register_and_login(client, "zero_all@example.com")
        biz = _create_business(client, headers)
        _create_record(client, headers, biz["id"],
                       monthly_revenue=0, monthly_expenses=0,
                       payroll=0, rent=0, debt=0, cash_reserves=0,
                       taxes=0, cost_of_goods_sold=0)
        r = client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
        assert r.status_code == 201
        body = r.json()
        # Should not contain NaN or Infinity
        assert body["risk_score"] is not None
        score = body["risk_score"]
        assert not (isinstance(score, float) and (math.isnan(score) or math.isinf(score)))

    def test_negative_revenue(self, client, db):
        """Negative revenue (refund-heavy month) should not crash analysis."""
        headers = _register_and_login(client, "neg_rev@example.com")
        biz = _create_business(client, headers)
        r = _create_record(client, headers, biz["id"], monthly_revenue=-5000)
        # Might be rejected by validation (422) or accepted
        if r.status_code == 201:
            analysis = client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
            assert analysis.status_code == 201

    def test_negative_debt(self, client, db):
        """Negative debt should be handled gracefully."""
        headers = _register_and_login(client, "neg_debt@example.com")
        biz = _create_business(client, headers)
        r = _create_record(client, headers, biz["id"], debt=-10000)
        if r.status_code == 201:
            analysis = client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
            assert analysis.status_code == 201


# ── Extremely large values ───────────────────────────────────────────────────

class TestExtremeValues:
    """Values at the edge of numeric ranges."""

    def test_very_large_revenue(self, client, db):
        headers = _register_and_login(client, "big_rev@example.com")
        biz = _create_business(client, headers)
        _create_record(client, headers, biz["id"], monthly_revenue=999_999_999_999)
        r = client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
        assert r.status_code == 201

    def test_very_large_debt(self, client, db):
        headers = _register_and_login(client, "big_debt@example.com")
        biz = _create_business(client, headers)
        _create_record(client, headers, biz["id"], debt=999_999_999_999)
        r = client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
        assert r.status_code == 201
        body = r.json()
        # High debt should produce high risk
        assert body["risk_score"] > 0

    def test_tiny_fractional_values(self, client, db):
        headers = _register_and_login(client, "tiny@example.com")
        biz = _create_business(client, headers)
        _create_record(client, headers, biz["id"],
                       monthly_revenue=0.01, monthly_expenses=0.01,
                       cash_reserves=0.001)
        r = client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
        assert r.status_code == 201


# ── Inconsistent / contradictory data ────────────────────────────────────────

class TestInconsistentData:
    """Data that doesn't make logical sense but shouldn't crash the system."""

    def test_expenses_exceed_revenue_by_large_margin(self, client, db):
        headers = _register_and_login(client, "loss@example.com")
        biz = _create_business(client, headers)
        _create_record(client, headers, biz["id"],
                       monthly_revenue=1000, monthly_expenses=1_000_000)
        r = client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
        assert r.status_code == 201
        body = r.json()
        # Should indicate high risk
        assert body["risk_score"] >= 50

    def test_payroll_exceeds_revenue(self, client, db):
        headers = _register_and_login(client, "bigpay@example.com")
        biz = _create_business(client, headers)
        _create_record(client, headers, biz["id"],
                       monthly_revenue=10000, payroll=50000)
        r = client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
        assert r.status_code == 201

    def test_zero_cash_with_high_debt(self, client, db):
        headers = _register_and_login(client, "broke@example.com")
        biz = _create_business(client, headers)
        _create_record(client, headers, biz["id"],
                       cash_reserves=0, debt=1_000_000, monthly_revenue=1000)
        r = client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
        assert r.status_code == 201
        body = r.json()
        assert body["risk_score"] >= 50


# ── Business field edge cases ────────────────────────────────────────────────

class TestBusinessFieldEdgeCases:
    """Edge cases in business creation fields."""

    def test_empty_industry(self, client, db):
        headers = _register_and_login(client, "empty_ind@example.com")
        r = client.post("/api/businesses", json={
            "name": "NoIndustry", "industry": "", "country": "BG",
            "num_employees": 1, "years_operating": 1,
        }, headers=headers)
        assert r.status_code in (201, 422)

    def test_very_long_business_name(self, client, db):
        headers = _register_and_login(client, "longname@example.com")
        r = client.post("/api/businesses", json={
            "name": "X" * 500, "industry": "Technology", "country": "BG",
            "num_employees": 1, "years_operating": 1,
        }, headers=headers)
        assert r.status_code in (201, 422)

    def test_zero_employees(self, client, db):
        headers = _register_and_login(client, "noemp@example.com")
        r = client.post("/api/businesses", json={
            "name": "Solo", "industry": "Technology", "country": "BG",
            "num_employees": 0, "years_operating": 1,
        }, headers=headers)
        assert r.status_code in (201, 422)

    def test_unicode_business_name(self, client, db):
        headers = _register_and_login(client, "unicode@example.com")
        name = "\u0424\u0438\u0440\u043c\u0430 \u0411\u044a\u043b\u0433\u0430\u0440\u0438\u044f"
        r = client.post("/api/businesses", json={
            "name": name,
            "industry": "Technology", "country": "BG",
            "num_employees": 5, "years_operating": 2,
        }, headers=headers)
        assert r.status_code == 201
        assert r.json()["name"] == name

    def test_special_chars_in_name(self, client, db):
        headers = _register_and_login(client, "special@example.com")
        r = client.post("/api/businesses", json={
            "name": "O'Reilly & Sons <script>alert(1)</script>",
            "industry": "Retail", "country": "US",
            "num_employees": 10, "years_operating": 5,
        }, headers=headers)
        if r.status_code == 201:
            # Name should be stored as-is (output encoding is the frontend's job)
            assert "<script>" in r.json()["name"]

    def test_period_month_boundary_values(self, client, db):
        """Month 0, 13 should be rejected; 1 and 12 accepted."""
        headers = _register_and_login(client, "month@example.com")
        biz = _create_business(client, headers)

        r0 = _create_record(client, headers, biz["id"], period_month=0)
        r13 = _create_record(client, headers, biz["id"], period_month=13)
        r1 = _create_record(client, headers, biz["id"], period_month=1)
        r12 = _create_record(client, headers, biz["id"], period_month=12, period_year=2024)

        assert r0.status_code == 422
        assert r13.status_code == 422
        assert r1.status_code == 201
        assert r12.status_code == 201


# ── Duplicate data ───────────────────────────────────────────────────────────

class TestDuplicateData:
    """Duplicate record handling."""

    def test_duplicate_period_record(self, client, db):
        """Two records for the same month/year — should be rejected or handled."""
        headers = _register_and_login(client, "duprec@example.com")
        biz = _create_business(client, headers)
        r1 = _create_record(client, headers, biz["id"])
        r2 = _create_record(client, headers, biz["id"])
        # Either reject duplicate or handle gracefully
        assert r1.status_code == 201
        assert r2.status_code in (201, 409, 422)

    def test_duplicate_business_name_same_owner(self, client, db):
        """Same user creating businesses with identical names."""
        headers = _register_and_login(client, "dupbiz@example.com")
        r1 = client.post("/api/businesses", json={
            "name": "Same Name", "industry": "Technology", "country": "BG",
            "num_employees": 1, "years_operating": 1,
        }, headers=headers)
        r2 = client.post("/api/businesses", json={
            "name": "Same Name", "industry": "Technology", "country": "BG",
            "num_employees": 1, "years_operating": 1,
        }, headers=headers)
        assert r1.status_code == 201
        # Second may be allowed (different IDs) or rejected
        assert r2.status_code in (201, 409)
