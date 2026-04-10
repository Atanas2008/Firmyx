"""
Data Privacy / GDPR-aligned Tests
===================================
Verifies data isolation between users, sensitive data not leaked,
and account deletion cascading properly.
"""

import pytest
from uuid import uuid4


# ── Helpers ──────────────────────────────────────────────────────────────────

def _register_and_login(client, email, password="TestPass123", name="Privacy User"):
    client.post("/api/auth/register", json={
        "email": email, "password": password, "full_name": name,
    })
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    token = resp.cookies.get("access_token", "")
    return {"Authorization": f"Bearer {token}"}


def _create_business(client, headers, name="Privacy Corp"):
    resp = client.post("/api/businesses", json={
        "name": name, "industry": "Technology", "country": "BG",
        "num_employees": 5, "years_operating": 2,
    }, headers=headers)
    return resp.json()["id"]


def _add_record(client, headers, biz_id):
    resp = client.post(f"/api/businesses/{biz_id}/records", json={
        "period_month": 1, "period_year": 2025,
        "monthly_revenue": 50000, "monthly_expenses": 35000,
        "payroll": 15000, "rent": 3000, "debt": 20000,
        "cash_reserves": 100000, "taxes": 5000, "cost_of_goods_sold": 10000,
    }, headers=headers)
    return resp.json()["id"]


# ═══════════════════════════════════════════════════════════════════════════
# 1. Data Isolation
# ═══════════════════════════════════════════════════════════════════════════

class TestDataIsolation:
    """Each user's data must be completely invisible to other users."""

    def test_business_list_only_shows_own(self, client):
        h1 = _register_and_login(client, "iso-1@example.com")
        h2 = _register_and_login(client, "iso-2@example.com")

        _create_business(client, h1, "User1 Biz")
        _create_business(client, h2, "User2 Biz")

        resp1 = client.get("/api/businesses", headers=h1)
        resp2 = client.get("/api/businesses", headers=h2)

        names1 = [b["name"] for b in resp1.json()["items"]]
        names2 = [b["name"] for b in resp2.json()["items"]]

        assert "User1 Biz" in names1
        assert "User2 Biz" not in names1
        assert "User2 Biz" in names2
        assert "User1 Biz" not in names2

    def test_analysis_list_only_shows_own(self, client):
        h1 = _register_and_login(client, "iso-anal-1@example.com")
        h2 = _register_and_login(client, "iso-anal-2@example.com")

        biz1 = _create_business(client, h1, "Anal Biz 1")
        biz2 = _create_business(client, h2, "Anal Biz 2")
        _add_record(client, h1, biz1)
        _add_record(client, h2, biz2)

        client.post(f"/api/businesses/{biz1}/analyze", headers=h1)
        client.post(f"/api/businesses/{biz2}/analyze", headers=h2)

        # User 1 can't see user 2's analyses
        resp = client.get(f"/api/businesses/{biz2}/analysis", headers=h1)
        assert resp.status_code == 403

    def test_records_only_show_own(self, client):
        h1 = _register_and_login(client, "iso-rec-1@example.com")
        h2 = _register_and_login(client, "iso-rec-2@example.com")

        biz1 = _create_business(client, h1, "Rec Biz 1")
        _add_record(client, h1, biz1)

        resp = client.get(f"/api/businesses/{biz1}/records", headers=h2)
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════
# 2. Sensitive Data Not Leaked
# ═══════════════════════════════════════════════════════════════════════════

class TestSensitiveDataNotLeaked:
    """Ensure hashed passwords and internal state never appear in API responses."""

    def test_register_response_no_password(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "leak-reg@example.com",
            "password": "TestPass123",
            "full_name": "Leak Test",
        })
        data = resp.json()
        assert "password" not in data
        assert "hashed_password" not in data

    def test_me_response_no_password(self, client):
        h = _register_and_login(client, "leak-me@example.com")
        resp = client.get("/api/auth/me", headers=h)
        data = resp.json()
        assert "password" not in data
        assert "hashed_password" not in data

    def test_login_response_only_tokens(self, client):
        client.post("/api/auth/register", json={
            "email": "leak-login@example.com",
            "password": "TestPass123",
            "full_name": "Login Leak",
        })
        resp = client.post("/api/auth/login", json={
            "email": "leak-login@example.com",
            "password": "TestPass123",
        })
        data = resp.json()
        # Login now returns UserRead (user profile), not tokens in body
        assert "email" in data
        assert "access_token" not in data
        assert "refresh_token" not in data
        # Tokens are in httpOnly cookies
        assert "access_token" in resp.cookies

    def test_error_messages_generic(self, client):
        """Login errors should not reveal whether the email exists."""
        resp = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "TestPass123",
        })
        assert resp.status_code == 401
        assert "invalid email or password" in resp.json()["detail"].lower()

        # Same message for wrong password on existing account
        client.post("/api/auth/register", json={
            "email": "exists@example.com",
            "password": "TestPass123",
            "full_name": "Exists",
        })
        resp = client.post("/api/auth/login", json={
            "email": "exists@example.com",
            "password": "WrongPassword",
        })
        assert resp.status_code == 401
        assert "invalid email or password" in resp.json()["detail"].lower()


# ═══════════════════════════════════════════════════════════════════════════
# 3. Admin Deletion Cascades All User Data
# ═══════════════════════════════════════════════════════════════════════════

class TestDeletionCascade:
    """When a user is deleted via admin, all associated data must be removed."""

    @pytest.fixture(autouse=True)
    def _set_admin_secret(self, monkeypatch):
        monkeypatch.setattr("app.config.settings.ADMIN_SECRET", "test-secret")

    def test_admin_delete_cascades_all(self, client, db):
        from app.repositories.user_repository import UserRepository
        from app.models.user import UserRole
        from app.models.business import Business
        from app.models.financial_record import FinancialRecord

        # Create target user with data
        target_h = _register_and_login(client, "cascade-target@example.com")
        biz_id = _create_business(client, target_h, "Cascade Corp")
        _add_record(client, target_h, biz_id)

        target = UserRepository(db).get_by_email("cascade-target@example.com")
        target_id = target.id

        # Create admin
        admin_h = _register_and_login(client, "cascade-admin@example.com")
        admin = UserRepository(db).get_by_email("cascade-admin@example.com")
        admin.role = UserRole.admin
        db.commit()
        admin_h["X-Admin-Secret"] = "test-secret"

        # Delete target
        resp = client.delete(f"/api/admin/users/{target_id}", headers=admin_h)
        assert resp.status_code == 204

        db.expire_all()

        # Verify user gone
        assert UserRepository(db).get_by_email("cascade-target@example.com") is None

        # Verify business gone
        biz = db.query(Business).filter(Business.owner_id == target_id).first()
        assert biz is None

        # Verify records gone
        from sqlalchemy import text
        count = db.execute(
            text("SELECT COUNT(*) FROM financial_records WHERE business_id = :bid"),
            {"bid": str(biz_id)},
        ).scalar()
        assert count == 0


# ═══════════════════════════════════════════════════════════════════════════
# 4. Global Exception Handler Does Not Leak Stack Traces
# ═══════════════════════════════════════════════════════════════════════════

class TestNoStackTraceLeaks:
    """Internal errors should return generic messages, never stack traces."""

    def test_500_response_is_generic(self, client):
        """A request with an invalid UUID path param triggers a 422,
        not a 500 with a traceback."""
        h = _register_and_login(client, "trace-test@example.com")
        resp = client.get("/api/businesses/not-a-uuid", headers=h)
        # Should be 422 (validation) not 500
        assert resp.status_code == 422
        body = resp.text
        assert "Traceback" not in body
        assert "File " not in body
