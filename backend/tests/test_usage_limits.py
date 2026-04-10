"""
Usage Limit / Early Access Tests
=================================
The current system allows 1 FREE analysis per user.
After that, unless ``is_unlocked`` is True, analysis endpoints return 403 FREE_LIMIT_REACHED.

Three analysis endpoints enforce the limit:
  - POST /{business_id}/analyze
  - POST /{business_id}/analyze/all-months
  - POST /{business_id}/analyze/combined

Endpoints that do NOT enforce the limit:
  - POST /{business_id}/forecast
  - POST /{business_id}/forecast/all-scenarios
  - POST /{business_id}/scenario
  - GET  /{business_id}/analysis  (listing)
"""

import pytest


# ── Helpers ──────────────────────────────────────────────────────────────────

def _register_and_login(client, email="limit@example.com"):
    client.post("/api/auth/register", json={
        "email": email, "password": "TestPass123", "full_name": "Limit User",
    })
    resp = client.post("/api/auth/login", json={"email": email, "password": "TestPass123"})
    token = resp.cookies.get("access_token", "")
    return {"Authorization": f"Bearer {token}"}


def _create_business(client, headers, name="Limit Corp"):
    resp = client.post("/api/businesses", json={
        "name": name, "industry": "Technology", "country": "BG",
        "num_employees": 5, "years_operating": 2,
    }, headers=headers)
    return resp.json()["id"]


def _add_record(client, headers, biz_id):
    client.post(f"/api/businesses/{biz_id}/records", json={
        "period_month": 1, "period_year": 2025,
        "monthly_revenue": 50000, "monthly_expenses": 35000,
        "payroll": 15000, "rent": 3000, "debt": 20000,
        "cash_reserves": 100000, "taxes": 5000, "cost_of_goods_sold": 10000,
    }, headers=headers)


# ═══════════════════════════════════════════════════════════════════════════
# 1. First analysis succeeds (analyses_count == 0)
# ═══════════════════════════════════════════════════════════════════════════

class TestFirstAnalysisFree:
    """A brand-new user should be able to run their first analysis successfully."""

    def test_first_single_analysis_succeeds(self, client):
        h = _register_and_login(client, "first-single@example.com")
        biz = _create_business(client, h, "First Single")
        _add_record(client, h, biz)

        resp = client.post(f"/api/businesses/{biz}/analyze", headers=h)
        assert resp.status_code == 201
        data = resp.json()
        assert "risk_score" in data

    def test_first_all_months_analysis_succeeds(self, client):
        h = _register_and_login(client, "first-all@example.com")
        biz = _create_business(client, h, "First All")
        _add_record(client, h, biz)

        resp = client.post(f"/api/businesses/{biz}/analyze/all-months", headers=h)
        assert resp.status_code == 201

    def test_first_combined_analysis_succeeds(self, client):
        h = _register_and_login(client, "first-combined@example.com")
        biz = _create_business(client, h, "First Combined")
        _add_record(client, h, biz)

        resp = client.post(f"/api/businesses/{biz}/analyze/combined", headers=h)
        assert resp.status_code == 201


# ═══════════════════════════════════════════════════════════════════════════
# 2. Second analysis blocked (analyses_count >= 1)
# ═══════════════════════════════════════════════════════════════════════════

class TestSecondAnalysisBlocked:
    """After one analysis, subsequent attempts must return 403 FREE_LIMIT_REACHED."""

    def test_second_single_analysis_blocked(self, client):
        h = _register_and_login(client, "block-single@example.com")
        biz = _create_business(client, h, "Block Single")
        _add_record(client, h, biz)

        assert client.post(f"/api/businesses/{biz}/analyze", headers=h).status_code == 201

        resp = client.post(f"/api/businesses/{biz}/analyze", headers=h)
        assert resp.status_code == 403
        assert resp.json()["detail"] == "FREE_LIMIT_REACHED"

    def test_second_all_months_blocked(self, client):
        h = _register_and_login(client, "block-all@example.com")
        biz = _create_business(client, h, "Block All")
        _add_record(client, h, biz)

        assert client.post(f"/api/businesses/{biz}/analyze/all-months", headers=h).status_code == 201

        resp = client.post(f"/api/businesses/{biz}/analyze/all-months", headers=h)
        assert resp.status_code == 403
        assert resp.json()["detail"] == "FREE_LIMIT_REACHED"

    def test_second_combined_blocked(self, client):
        h = _register_and_login(client, "block-comb@example.com")
        biz = _create_business(client, h, "Block Comb")
        _add_record(client, h, biz)

        assert client.post(f"/api/businesses/{biz}/analyze/combined", headers=h).status_code == 201

        resp = client.post(f"/api/businesses/{biz}/analyze/combined", headers=h)
        assert resp.status_code == 403
        assert resp.json()["detail"] == "FREE_LIMIT_REACHED"

    def test_mixed_endpoints_blocked_after_one(self, client):
        """Using a single-analysis first, then trying all-months should also be blocked."""
        h = _register_and_login(client, "block-mix@example.com")
        biz = _create_business(client, h, "Block Mix")
        _add_record(client, h, biz)

        assert client.post(f"/api/businesses/{biz}/analyze", headers=h).status_code == 201

        resp = client.post(f"/api/businesses/{biz}/analyze/all-months", headers=h)
        assert resp.status_code == 403
        assert resp.json()["detail"] == "FREE_LIMIT_REACHED"

        resp = client.post(f"/api/businesses/{biz}/analyze/combined", headers=h)
        assert resp.status_code == 403
        assert resp.json()["detail"] == "FREE_LIMIT_REACHED"


# ═══════════════════════════════════════════════════════════════════════════
# 3. analyses_count increments correctly
# ═══════════════════════════════════════════════════════════════════════════

class TestAnalysesCountIncrement:
    """Verify the user.analyses_count field increments on each successful analysis."""

    def test_count_starts_at_zero(self, client, db):
        from app.repositories.user_repository import UserRepository
        h = _register_and_login(client, "count-zero@example.com")
        user = UserRepository(db).get_by_email("count-zero@example.com")
        assert user.analyses_count == 0

    def test_count_increments_after_analysis(self, client, db):
        from app.repositories.user_repository import UserRepository
        h = _register_and_login(client, "count-inc@example.com")
        biz = _create_business(client, h, "Count Inc")
        _add_record(client, h, biz)

        client.post(f"/api/businesses/{biz}/analyze", headers=h)

        db.expire_all()
        user = UserRepository(db).get_by_email("count-inc@example.com")
        assert user.analyses_count == 1


# ═══════════════════════════════════════════════════════════════════════════
# 4. is_unlocked bypasses limit
# ═══════════════════════════════════════════════════════════════════════════

class TestUnlockedBypassesLimit:
    """Users with is_unlocked=True should be able to run unlimited analyses."""

    def test_unlocked_user_runs_multiple_analyses(self, client, db):
        from app.repositories.user_repository import UserRepository
        h = _register_and_login(client, "unlocked@example.com")
        biz = _create_business(client, h, "Unlocked Corp")
        _add_record(client, h, biz)

        # Manually unlock
        user = UserRepository(db).get_by_email("unlocked@example.com")
        user.is_unlocked = True
        db.commit()

        for i in range(3):
            resp = client.post(f"/api/businesses/{biz}/analyze", headers=h)
            assert resp.status_code == 201, f"Analysis {i+1} failed: {resp.json()}"

    def test_unlocked_user_after_prior_analysis(self, client, db):
        """Even if the user already ran 1 analysis while locked, unlocking should
        let them run more."""
        from app.repositories.user_repository import UserRepository
        h = _register_and_login(client, "unlock-after@example.com")
        biz = _create_business(client, h, "Unlock After")
        _add_record(client, h, biz)

        # First analysis (while locked) succeeds
        assert client.post(f"/api/businesses/{biz}/analyze", headers=h).status_code == 201

        # Second analysis should fail
        assert client.post(f"/api/businesses/{biz}/analyze", headers=h).status_code == 403

        # Unlock
        user = UserRepository(db).get_by_email("unlock-after@example.com")
        user.is_unlocked = True
        db.commit()

        # Now should succeed
        assert client.post(f"/api/businesses/{biz}/analyze", headers=h).status_code == 201


# ═══════════════════════════════════════════════════════════════════════════
# 5. Non-analysis endpoints are not limited
# ═══════════════════════════════════════════════════════════════════════════

class TestNonAnalysisEndpointsNotLimited:
    """Forecast, scenario, and listing endpoints should work regardless of limit."""

    def test_forecast_works_after_limit_reached(self, client):
        h = _register_and_login(client, "forecast-ok@example.com")
        biz = _create_business(client, h, "Forecast OK")
        _add_record(client, h, biz)

        # Use up the free analysis
        assert client.post(f"/api/businesses/{biz}/analyze", headers=h).status_code == 201

        # Forecast should still work
        resp = client.post(f"/api/businesses/{biz}/forecast", headers=h)
        assert resp.status_code == 200

    def test_scenario_works_after_limit_reached(self, client):
        h = _register_and_login(client, "scenario-ok@example.com")
        biz = _create_business(client, h, "Scenario OK")
        _add_record(client, h, biz)

        assert client.post(f"/api/businesses/{biz}/analyze", headers=h).status_code == 201

        resp = client.post(f"/api/businesses/{biz}/scenario", headers=h, json={
            "revenue_change": 10.0, "expense_change": -5.0,
        })
        assert resp.status_code == 200

    def test_list_analyses_works_after_limit_reached(self, client):
        h = _register_and_login(client, "list-ok@example.com")
        biz = _create_business(client, h, "List OK")
        _add_record(client, h, biz)

        assert client.post(f"/api/businesses/{biz}/analyze", headers=h).status_code == 201

        resp = client.get(f"/api/businesses/{biz}/analysis", headers=h)
        assert resp.status_code == 200

    def test_all_scenarios_forecast_works_after_limit(self, client):
        h = _register_and_login(client, "allsc-ok@example.com")
        biz = _create_business(client, h, "AllSc OK")
        _add_record(client, h, biz)

        assert client.post(f"/api/businesses/{biz}/analyze", headers=h).status_code == 201

        resp = client.post(f"/api/businesses/{biz}/forecast/all-scenarios", headers=h)
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# 6. Limit is per-user, not per-business
# ═══════════════════════════════════════════════════════════════════════════

class TestLimitIsPerUser:
    """A user's limit applies across all their businesses."""

    def test_different_business_still_blocked(self, client):
        h = _register_and_login(client, "per-user@example.com")
        biz1 = _create_business(client, h, "Biz One")
        biz2 = _create_business(client, h, "Biz Two")
        _add_record(client, h, biz1)
        _add_record(client, h, biz2)

        # First analysis on biz1 succeeds
        assert client.post(f"/api/businesses/{biz1}/analyze", headers=h).status_code == 201

        # Second analysis on biz2 is blocked
        resp = client.post(f"/api/businesses/{biz2}/analyze", headers=h)
        assert resp.status_code == 403
        assert resp.json()["detail"] == "FREE_LIMIT_REACHED"

    def test_different_users_have_independent_limits(self, client):
        h1 = _register_and_login(client, "user-a@example.com")
        h2 = _register_and_login(client, "user-b@example.com")

        biz1 = _create_business(client, h1, "Biz A")
        biz2 = _create_business(client, h2, "Biz B")
        _add_record(client, h1, biz1)
        _add_record(client, h2, biz2)

        # Both users can run their first analysis
        assert client.post(f"/api/businesses/{biz1}/analyze", headers=h1).status_code == 201
        assert client.post(f"/api/businesses/{biz2}/analyze", headers=h2).status_code == 201
