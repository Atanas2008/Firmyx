"""
Advanced concurrency and race-condition tests.

SQLite + StaticPool uses a single connection, so true threading is not
possible without session state conflicts.  These tests use *sequential*
requests to verify that the application logic correctly enforces limits
and data integrity after each step.  Real race conditions would manifest
under PostgreSQL with concurrent workers.
"""

import pytest
from fastapi.testclient import TestClient

from app.models.user import User


# -- helpers -------------------------------------------------------------------

def _register_and_login(client: TestClient, email: str, password: str = "TestPass123"):
    """Register a user and return auth headers."""
    client.post("/api/auth/register", json={
        "email": email, "password": password, "full_name": "Conc User",
    })
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    token = resp.cookies.get("access_token", "")
    return {"Authorization": f"Bearer {token}"}


def _setup_business_and_record(client: TestClient, headers: dict):
    """Create a business + financial record; return business id."""
    biz = client.post("/api/businesses", json={
        "name": "Race Corp", "industry": "Technology", "country": "BG",
        "num_employees": 5, "years_operating": 2,
    }, headers=headers).json()

    client.post(f"/api/businesses/{biz['id']}/records", json={
        "period_month": 1, "period_year": 2025,
        "monthly_revenue": 50000, "monthly_expenses": 35000,
        "payroll": 15000, "rent": 3000, "debt": 20000,
        "cash_reserves": 100000, "taxes": 5000, "cost_of_goods_sold": 10000,
    }, headers=headers)
    return biz["id"]


# -- tests ---------------------------------------------------------------------


class TestAnalysisLimitEnforcement:
    """Sequential tests verifying the free-tier analysis limit is enforced."""

    def test_first_analysis_succeeds_second_blocked(self, client, db):
        """Free-tier: first analysis succeeds, second is rejected."""
        headers = _register_and_login(client, "race1@example.com")
        biz_id = _setup_business_and_record(client, headers)

        r1 = client.post(f"/api/businesses/{biz_id}/analyze", headers=headers)
        assert r1.status_code == 201

        r2 = client.post(f"/api/businesses/{biz_id}/analyze", headers=headers)
        assert r2.status_code == 403
        assert r2.json()["detail"] == "FREE_LIMIT_REACHED"

    def test_analysis_count_increments_exactly_once(self, client, db):
        """analyses_count should be exactly 1 after a single successful analysis."""
        headers = _register_and_login(client, "race2@example.com")
        biz_id = _setup_business_and_record(client, headers)

        client.post(f"/api/businesses/{biz_id}/analyze", headers=headers)

        user = db.query(User).filter(User.email == "race2@example.com").first()
        assert user.analyses_count == 1

    def test_repeated_blocked_requests_dont_change_count(self, client, db):
        """Blocked analysis requests should not increment analyses_count."""
        headers = _register_and_login(client, "race2b@example.com")
        biz_id = _setup_business_and_record(client, headers)

        client.post(f"/api/businesses/{biz_id}/analyze", headers=headers)

        # Fire 10 more requests (all should be 403)
        for _ in range(10):
            r = client.post(f"/api/businesses/{biz_id}/analyze", headers=headers)
            assert r.status_code == 403

        user = db.query(User).filter(User.email == "race2b@example.com").first()
        assert user.analyses_count == 1

    def test_all_analysis_endpoints_enforce_limit(self, client, db):
        """After limit is hit on one endpoint, all analysis endpoints reject."""
        headers = _register_and_login(client, "race3@example.com")
        biz_id = _setup_business_and_record(client, headers)

        # Use up the free analysis on the basic endpoint
        r = client.post(f"/api/businesses/{biz_id}/analyze", headers=headers)
        assert r.status_code == 201

        # All three endpoints should now be blocked
        for ep in ["analyze", "analyze/all-months", "analyze/combined"]:
            r = client.post(f"/api/businesses/{biz_id}/{ep}", headers=headers)
            assert r.status_code == 403, f"Endpoint {ep} should be blocked"

    def test_duplicate_registration_rejected(self, client, db):
        """Registering the same email twice should return 409."""
        payload = {
            "email": "dupe@example.com",
            "password": "TestPass123",
            "full_name": "Dupe User",
        }
        r1 = client.post("/api/auth/register", json=payload)
        assert r1.status_code == 201

        r2 = client.post("/api/auth/register", json=payload)
        assert r2.status_code == 409


class TestSequentialBusinessOperations:
    """Verify data integrity with rapid sequential operations."""

    def test_rapid_record_creation(self, client, db):
        """Creating multiple records in quick succession should not corrupt data."""
        headers = _register_and_login(client, "conc_rec@example.com")
        biz_id = _setup_business_and_record(client, headers)

        for month in range(2, 7):
            r = client.post(f"/api/businesses/{biz_id}/records", json={
                "period_month": month, "period_year": 2025,
                "monthly_revenue": 10000 * month, "monthly_expenses": 5000 * month,
                "payroll": 2000, "rent": 1000, "debt": 5000,
                "cash_reserves": 50000, "taxes": 1000, "cost_of_goods_sold": 3000,
            }, headers=headers)
            assert r.status_code == 201

    def test_rapid_business_creation_unique_ids(self, client, db):
        """Creating businesses in quick succession should produce unique IDs."""
        headers = _register_and_login(client, "conc_biz@example.com")
        ids = set()

        for i in range(5):
            r = client.post("/api/businesses", json={
                "name": f"Biz {i}", "industry": "Technology", "country": "BG",
                "num_employees": i + 1, "years_operating": 1,
            }, headers=headers)
            assert r.status_code == 201
            ids.add(r.json()["id"])

        assert len(ids) == 5  # all unique

    def test_multiple_login_sessions(self, client, db):
        """Multiple logins for the same user should all produce valid tokens."""
        client.post("/api/auth/register", json={
            "email": "parallel@example.com", "password": "TestPass123", "full_name": "P User"
        })

        tokens = []
        for _ in range(5):
            r = client.post("/api/auth/login", json={
                "email": "parallel@example.com", "password": "TestPass123"
            })
            assert r.status_code == 200
            tokens.append(r.cookies.get("access_token", ""))

        # All tokens should be valid (uniqueness not guaranteed within same second)
        for token in tokens:
            r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 200
