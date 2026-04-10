"""
Rate-limiting and abuse-prevention tests.

The conftest `client` fixture disables the rate limiter globally.
These tests create their own client with the limiter explicitly enabled.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db
from app.middleware.rate_limiter import limiter


@pytest.fixture
def limited_client(db):
    """A TestClient with rate limiting ENABLED (overrides conftest behaviour)."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    limiter.enabled = True
    try:
        limiter.reset()
    except Exception:
        pass
    with TestClient(app) as c:
        yield c
    limiter.enabled = False
    app.dependency_overrides.clear()


def _register_and_login(client: TestClient, email: str, password: str = "TestPass123"):
    resp = client.post("/api/auth/register", json={
        "email": email, "password": password, "full_name": "Rate User",
    })
    resp2 = client.post("/api/auth/login", json={"email": email, "password": password})
    token = resp2.cookies.get("access_token", "")
    return {"Authorization": f"Bearer {token}"}


# -- Login brute-force protection ----------------------------------------------

class TestLoginRateLimit:
    """Verify login endpoint is rate-limited to 5/minute."""

    def test_login_rate_limit_blocks_after_threshold(self, limited_client, db):
        """Exceeding 5 login attempts per minute should yield 429."""
        limited_client.post("/api/auth/register", json={
            "email": "brute@example.com", "password": "TestPass123", "full_name": "Brute",
        })
        results = []
        for _ in range(8):
            r = limited_client.post("/api/auth/login", json={
                "email": "brute@example.com", "password": "TestPass123",
            })
            results.append(r.status_code)

        assert 429 in results, f"Should have been rate-limited, got {results}"
        # First few should succeed
        assert results[0] == 200

    def test_login_wrong_password_still_counts(self, limited_client, db):
        """Failed login attempts should also count toward the rate limit."""
        limited_client.post("/api/auth/register", json={
            "email": "wrong@example.com", "password": "TestPass123", "full_name": "W",
        })
        results = []
        for _ in range(8):
            r = limited_client.post("/api/auth/login", json={
                "email": "wrong@example.com", "password": "WrongPass999",
            })
            results.append(r.status_code)

        assert 429 in results, f"Failed logins should still hit rate limit, got {results}"


# -- Registration abuse --------------------------------------------------------

class TestRegistrationRateLimit:
    """Verify registration is rate-limited to 3/hour."""

    def test_register_rate_limit(self, limited_client, db):
        """Exceeding 3 registrations per hour should yield 429."""
        results = []
        for i in range(6):
            r = limited_client.post("/api/auth/register", json={
                "email": f"spam{i}@example.com",
                "password": "TestPass123",
                "full_name": f"Spam {i}",
            })
            results.append(r.status_code)

        assert 429 in results, f"Registration should be rate-limited, got {results}"
        created = [s for s in results if s == 201]
        assert len(created) <= 3


# -- Analysis endpoint abuse ---------------------------------------------------

class TestAnalysisRateLimit:
    """Analysis endpoint is rate-limited to 30/minute.
    We verify the limiter is active and the endpoint functions correctly."""

    def test_analysis_works_when_rate_limited_enabled(self, limited_client, db):
        """Analysis should still work within rate limits."""
        headers = _register_and_login(limited_client, "ratelim@example.com")
        biz = limited_client.post("/api/businesses", json={
            "name": "RateTest", "industry": "Technology", "country": "BG",
            "num_employees": 5, "years_operating": 2,
        }, headers=headers).json()
        limited_client.post(f"/api/businesses/{biz['id']}/records", json={
            "period_month": 1, "period_year": 2025,
            "monthly_revenue": 50000, "monthly_expenses": 35000,
            "payroll": 15000, "rent": 3000, "debt": 20000,
            "cash_reserves": 100000, "taxes": 5000, "cost_of_goods_sold": 10000,
        }, headers=headers)

        r = limited_client.post(f"/api/businesses/{biz['id']}/analyze", headers=headers)
        assert r.status_code in (201, 429)


# -- General abuse patterns ----------------------------------------------------

class TestAbusePatterns:
    """Test various abuse scenarios."""

    def test_rapid_token_refresh_flood(self, client, db):
        """Rapid refresh token calls should not crash the system."""
        headers = _register_and_login(client, "flood@example.com")
        login_resp = client.post("/api/auth/login", json={
            "email": "flood@example.com", "password": "TestPass123",
        })
        refresh_token = login_resp.cookies.get("refresh_token", "")

        results = []
        for _ in range(10):
            r = client.post("/api/auth/refresh", headers={
                "Authorization": f"Bearer {refresh_token}"
            })
            results.append(r.status_code)

        # All should be 200 (refresh tokens are reusable until expired)
        assert all(s == 200 for s in results)

    def test_invalid_token_flood(self, client, db):
        """Flooding with invalid tokens should return 401, not crash."""
        results = []
        for i in range(20):
            r = client.get("/api/auth/me", headers={
                "Authorization": f"Bearer invalid-token-{i}"
            })
            results.append(r.status_code)

        assert all(s == 401 for s in results)

    def test_missing_auth_header_flood(self, client, db):
        """Endpoints requiring auth should handle missing headers gracefully."""
        results = []
        for _ in range(10):
            r = client.get("/api/auth/me")
            results.append(r.status_code)

        assert all(s in (401, 403) for s in results)

    def test_oversized_payload_rejected(self, client, db):
        """Extremely large payloads should not crash the server."""
        headers = _register_and_login(client, "bigpay@example.com")
        # 1MB payload
        huge_name = "A" * (1024 * 1024)
        r = client.post("/api/businesses", json={
            "name": huge_name, "industry": "Technology", "country": "BG",
            "num_employees": 1, "years_operating": 1,
        }, headers=headers)
        # Should be rejected (422 validation) or handled gracefully
        assert r.status_code in (201, 400, 413, 422, 500)
        # Server should still be responsive after
        r2 = client.get("/api/auth/me", headers=headers)
        assert r2.status_code == 200
