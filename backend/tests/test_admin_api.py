"""
Admin Endpoint Tests — Triple-Gated Security
==============================================
Admin endpoints require:
  1. Valid JWT (Bearer token)
  2. User role == admin
  3. X-Admin-Secret header matches ADMIN_SECRET env var

Endpoints under /api/admin:
  GET    /users               — list users
  DELETE /users/{id}          — cascade delete user + data
  PUT    /users/{id}/email    — change email
  POST   /users/{id}/reset-password
  PUT    /users/{id}/deactivate
  PUT    /users/{id}/activate
  PUT    /users/{id}/unlock   — remove free-tier limit
  PUT    /users/{id}/lock     — re-enable free-tier limit
"""

import pytest
from uuid import uuid4


# ── Helpers ──────────────────────────────────────────────────────────────────

ADMIN_SECRET = "test-admin-secret"


def _register_and_login(client, email, password="TestPass123", name="Test User"):
    client.post("/api/auth/register", json={
        "email": email, "password": password, "full_name": name,
    })
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    token = resp.cookies.get("access_token", "")
    return {"Authorization": f"Bearer {token}"}


def _make_admin(db, email):
    """Promote a user to admin (simulates direct DB SQL)."""
    from app.repositories.user_repository import UserRepository
    from app.models.user import UserRole
    user = UserRepository(db).get_by_email(email)
    user.role = UserRole.admin
    db.commit()
    return user


def _admin_headers(client, db, email="admin@example.com"):
    """Register, promote, and return headers with both JWT and X-Admin-Secret."""
    h = _register_and_login(client, email)
    _make_admin(db, email)
    h["X-Admin-Secret"] = ADMIN_SECRET
    return h


@pytest.fixture(autouse=True)
def _set_admin_secret(monkeypatch):
    """Set the ADMIN_SECRET for all tests in this module."""
    monkeypatch.setattr("app.config.settings.ADMIN_SECRET", ADMIN_SECRET)


# ═══════════════════════════════════════════════════════════════════════════
# 1. Triple Gate: Missing any gate → forbidden
# ═══════════════════════════════════════════════════════════════════════════

class TestTripleGate:
    """All three security gates must pass."""

    def test_no_auth_at_all(self, client):
        resp = client.get("/api/admin/users")
        assert resp.status_code in (401, 403)  # No bearer token

    def test_valid_token_but_not_admin_role(self, client):
        h = _register_and_login(client, "nonadmin@example.com")
        h["X-Admin-Secret"] = ADMIN_SECRET
        resp = client.get("/api/admin/users", headers=h)
        assert resp.status_code == 403

    def test_admin_role_but_no_secret(self, client, db):
        h = _register_and_login(client, "admin-nosec@example.com")
        _make_admin(db, "admin-nosec@example.com")
        # No X-Admin-Secret header
        resp = client.get("/api/admin/users", headers=h)
        assert resp.status_code == 422  # Missing required header

    def test_admin_role_with_wrong_secret(self, client, db):
        h = _register_and_login(client, "admin-wrongsec@example.com")
        _make_admin(db, "admin-wrongsec@example.com")
        h["X-Admin-Secret"] = "wrong-secret"
        resp = client.get("/api/admin/users", headers=h)
        assert resp.status_code == 403

    def test_all_three_gates_pass(self, client, db):
        h = _admin_headers(client, db, "admin-pass@example.com")
        resp = client.get("/api/admin/users", headers=h)
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# 2. Admin: List Users
# ═══════════════════════════════════════════════════════════════════════════

class TestAdminListUsers:

    def test_list_users_returns_all(self, client, db):
        _register_and_login(client, "list-user1@example.com")
        _register_and_login(client, "list-user2@example.com")
        h = _admin_headers(client, db, "list-admin@example.com")

        resp = client.get("/api/admin/users", headers=h)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 3  # 2 regular + 1 admin
        emails = [u["email"] for u in data["users"]]
        assert "list-user1@example.com" in emails

    def test_list_users_search(self, client, db):
        _register_and_login(client, "searchme@example.com")
        h = _admin_headers(client, db, "search-admin@example.com")

        resp = client.get("/api/admin/users?search=searchme", headers=h)
        data = resp.json()
        assert data["total"] >= 1
        assert any(u["email"] == "searchme@example.com" for u in data["users"])

    def test_list_users_pagination(self, client, db):
        h = _admin_headers(client, db, "page-admin@example.com")
        resp = client.get("/api/admin/users?skip=0&limit=1", headers=h)
        data = resp.json()
        assert len(data["users"]) == 1


# ═══════════════════════════════════════════════════════════════════════════
# 3. Admin: Delete User (cascade)
# ═══════════════════════════════════════════════════════════════════════════

class TestAdminDeleteUser:

    def test_delete_user_cascades(self, client, db):
        target_h = _register_and_login(client, "del-target@example.com")
        # Create business + record for this user
        biz_resp = client.post("/api/businesses", json={
            "name": "Doomed Corp", "industry": "Technology",
        }, headers=target_h)
        biz_id = biz_resp.json()["id"]
        client.post(f"/api/businesses/{biz_id}/records", json={
            "period_month": 1, "period_year": 2025,
            "monthly_revenue": 50000, "monthly_expenses": 35000,
            "payroll": 15000, "rent": 3000, "debt": 20000,
            "cash_reserves": 100000, "taxes": 5000, "cost_of_goods_sold": 10000,
        }, headers=target_h)

        from app.repositories.user_repository import UserRepository
        user = UserRepository(db).get_by_email("del-target@example.com")

        h = _admin_headers(client, db, "del-admin@example.com")
        resp = client.delete(f"/api/admin/users/{user.id}", headers=h)
        assert resp.status_code == 204

        # User should no longer exist
        assert UserRepository(db).get_by_email("del-target@example.com") is None

    def test_admin_cannot_delete_self(self, client, db):
        h = _admin_headers(client, db, "del-self@example.com")
        from app.repositories.user_repository import UserRepository
        admin = UserRepository(db).get_by_email("del-self@example.com")

        resp = client.delete(f"/api/admin/users/{admin.id}", headers=h)
        assert resp.status_code == 400

    def test_delete_nonexistent_user(self, client, db):
        h = _admin_headers(client, db, "del-none@example.com")
        resp = client.delete(f"/api/admin/users/{uuid4()}", headers=h)
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# 4. Admin: Change Email
# ═══════════════════════════════════════════════════════════════════════════

class TestAdminChangeEmail:

    def test_change_email(self, client, db):
        _register_and_login(client, "email-old@example.com")
        from app.repositories.user_repository import UserRepository
        user = UserRepository(db).get_by_email("email-old@example.com")

        h = _admin_headers(client, db, "email-admin@example.com")
        resp = client.put(f"/api/admin/users/{user.id}/email", json={
            "new_email": "email-new@example.com",
        }, headers=h)
        assert resp.status_code == 200

        db.expire_all()
        assert UserRepository(db).get_by_email("email-new@example.com") is not None

    def test_change_email_to_existing_fails(self, client, db):
        _register_and_login(client, "em-exist-1@example.com")
        _register_and_login(client, "em-exist-2@example.com")
        from app.repositories.user_repository import UserRepository
        user = UserRepository(db).get_by_email("em-exist-1@example.com")

        h = _admin_headers(client, db, "em-admin@example.com")
        resp = client.put(f"/api/admin/users/{user.id}/email", json={
            "new_email": "em-exist-2@example.com",
        }, headers=h)
        assert resp.status_code == 409


# ═══════════════════════════════════════════════════════════════════════════
# 5. Admin: Reset Password
# ═══════════════════════════════════════════════════════════════════════════

class TestAdminResetPassword:

    def test_reset_password(self, client, db):
        _register_and_login(client, "pwd-reset@example.com")
        from app.repositories.user_repository import UserRepository
        user = UserRepository(db).get_by_email("pwd-reset@example.com")

        h = _admin_headers(client, db, "pwd-admin@example.com")
        resp = client.post(f"/api/admin/users/{user.id}/reset-password", json={
            "new_password": "NewSecure123",
        }, headers=h)
        assert resp.status_code == 200

        # Old password should no longer work
        resp = client.post("/api/auth/login", json={
            "email": "pwd-reset@example.com", "password": "TestPass123",
        })
        assert resp.status_code == 401

        # New password should work
        resp = client.post("/api/auth/login", json={
            "email": "pwd-reset@example.com", "password": "NewSecure123",
        })
        assert resp.status_code == 200

    def test_reset_password_too_short(self, client, db):
        _register_and_login(client, "pwd-short@example.com")
        from app.repositories.user_repository import UserRepository
        user = UserRepository(db).get_by_email("pwd-short@example.com")

        h = _admin_headers(client, db, "pwd-short-admin@example.com")
        resp = client.post(f"/api/admin/users/{user.id}/reset-password", json={
            "new_password": "abc",
        }, headers=h)
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════
# 6. Admin: Activate / Deactivate
# ═══════════════════════════════════════════════════════════════════════════

class TestAdminActivateDeactivate:

    def test_deactivate_user(self, client, db):
        _register_and_login(client, "deact-target@example.com")
        from app.repositories.user_repository import UserRepository
        user = UserRepository(db).get_by_email("deact-target@example.com")

        h = _admin_headers(client, db, "deact-admin@example.com")
        resp = client.put(f"/api/admin/users/{user.id}/deactivate", headers=h)
        assert resp.status_code == 200

        # User can no longer log in
        resp = client.post("/api/auth/login", json={
            "email": "deact-target@example.com", "password": "TestPass123",
        })
        assert resp.status_code == 403

    def test_activate_user(self, client, db):
        _register_and_login(client, "react-target@example.com")
        from app.repositories.user_repository import UserRepository
        user = UserRepository(db).get_by_email("react-target@example.com")
        user.is_active = False
        db.commit()

        h = _admin_headers(client, db, "react-admin@example.com")
        resp = client.put(f"/api/admin/users/{user.id}/activate", headers=h)
        assert resp.status_code == 200

        resp = client.post("/api/auth/login", json={
            "email": "react-target@example.com", "password": "TestPass123",
        })
        assert resp.status_code == 200

    def test_cannot_deactivate_self(self, client, db):
        h = _admin_headers(client, db, "deact-self@example.com")
        from app.repositories.user_repository import UserRepository
        admin = UserRepository(db).get_by_email("deact-self@example.com")

        resp = client.put(f"/api/admin/users/{admin.id}/deactivate", headers=h)
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════
# 7. Admin: Unlock / Lock (Free-Tier Management)
# ═══════════════════════════════════════════════════════════════════════════

class TestAdminUnlockLock:

    def test_unlock_user(self, client, db):
        _register_and_login(client, "unlock-target@example.com")
        from app.repositories.user_repository import UserRepository
        user = UserRepository(db).get_by_email("unlock-target@example.com")

        h = _admin_headers(client, db, "unlock-admin@example.com")
        resp = client.put(f"/api/admin/users/{user.id}/unlock", headers=h)
        assert resp.status_code == 200

        db.expire_all()
        user = UserRepository(db).get_by_email("unlock-target@example.com")
        assert user.is_unlocked is True

    def test_lock_user(self, client, db):
        _register_and_login(client, "lock-target@example.com")
        from app.repositories.user_repository import UserRepository
        user = UserRepository(db).get_by_email("lock-target@example.com")
        user.is_unlocked = True
        db.commit()

        h = _admin_headers(client, db, "lock-admin@example.com")
        resp = client.put(f"/api/admin/users/{user.id}/lock", headers=h)
        assert resp.status_code == 200

        db.expire_all()
        user = UserRepository(db).get_by_email("lock-target@example.com")
        assert user.is_unlocked is False

    def test_unlock_then_analysis_succeeds(self, client, db):
        """Integration: unlock a user, verify they can run analyses past the limit."""
        target_h = _register_and_login(client, "unlock-int@example.com")
        biz_resp = client.post("/api/businesses", json={
            "name": "Unlock Int Corp", "industry": "Technology",
        }, headers=target_h)
        biz_id = biz_resp.json()["id"]
        client.post(f"/api/businesses/{biz_id}/records", json={
            "period_month": 1, "period_year": 2025,
            "monthly_revenue": 50000, "monthly_expenses": 35000,
            "payroll": 15000, "rent": 3000, "debt": 20000,
            "cash_reserves": 100000, "taxes": 5000, "cost_of_goods_sold": 10000,
        }, headers=target_h)

        # First analysis (free)
        assert client.post(f"/api/businesses/{biz_id}/analyze", headers=target_h).status_code == 201
        # Second blocked
        assert client.post(f"/api/businesses/{biz_id}/analyze", headers=target_h).status_code == 403

        # Admin unlocks
        from app.repositories.user_repository import UserRepository
        user = UserRepository(db).get_by_email("unlock-int@example.com")
        h = _admin_headers(client, db, "unlock-int-admin@example.com")
        client.put(f"/api/admin/users/{user.id}/unlock", headers=h)

        # Now should succeed
        assert client.post(f"/api/businesses/{biz_id}/analyze", headers=target_h).status_code == 201
