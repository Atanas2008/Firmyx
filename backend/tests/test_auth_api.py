"""Tests for authentication API endpoints."""
import pytest


class TestRegister:
    def test_register_success(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "new@example.com",
                "password": "StrongPass1",
                "full_name": "New User",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "new@example.com"
        assert data["full_name"] == "New User"
        assert "id" in data
        assert "hashed_password" not in data

    def test_register_duplicate_email(self, client):
        payload = {
            "email": "dupe@example.com",
            "password": "StrongPass1",
            "full_name": "First User",
        }
        client.post("/api/auth/register", json=payload)
        resp = client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409

    def test_register_weak_password_no_uppercase(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "weak@example.com",
                "password": "alllowercase1",
                "full_name": "Weak Pass",
            },
        )
        assert resp.status_code == 422

    def test_register_weak_password_too_short(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "short@example.com",
                "password": "Ab1",
                "full_name": "Short Pass",
            },
        )
        assert resp.status_code == 422

    def test_register_weak_password_no_digit(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "nodigit@example.com",
                "password": "NoDigitHere",
                "full_name": "No Digit",
            },
        )
        assert resp.status_code == 422


class TestLogin:
    def test_login_success(self, client):
        client.post(
            "/api/auth/register",
            json={
                "email": "login@example.com",
                "password": "StrongPass1",
                "full_name": "Login User",
            },
        )
        resp = client.post(
            "/api/auth/login",
            json={"email": "login@example.com", "password": "StrongPass1"},
        )
        assert resp.status_code == 200
        data = resp.json()
        # Login now returns UserRead — check for user fields
        assert data["email"] == "login@example.com"
        assert "id" in data
        # Tokens must be set as httpOnly cookies (not exposed in body)
        assert "access_token" in resp.cookies
        assert "refresh_token" in resp.cookies
        assert "access_token" not in data
        assert "refresh_token" not in data

    def test_login_wrong_password(self, client):
        client.post(
            "/api/auth/register",
            json={
                "email": "wrongpw@example.com",
                "password": "StrongPass1",
                "full_name": "Wrong PW",
            },
        )
        resp = client.post(
            "/api/auth/login",
            json={"email": "wrongpw@example.com", "password": "WrongPass1"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_email(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"email": "ghost@example.com", "password": "StrongPass1"},
        )
        assert resp.status_code == 401


class TestRefreshToken:
    def test_refresh_success(self, client):
        client.post(
            "/api/auth/register",
            json={
                "email": "refresh@example.com",
                "password": "StrongPass1",
                "full_name": "Refresh User",
            },
        )
        # Login sets cookies on the TestClient session
        client.post(
            "/api/auth/login",
            json={"email": "refresh@example.com", "password": "StrongPass1"},
        )
        # Refresh uses the cookie set by login (TestClient sends cookies automatically)
        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 200
        data = resp.json()
        # Refresh now returns UserRead and sets new cookies
        assert "id" in data
        assert "access_token" in resp.cookies

    def test_refresh_with_access_token_as_bearer_fails(self, client):
        """Sending an access token via Bearer to /refresh should fail."""
        client.post(
            "/api/auth/register",
            json={
                "email": "accref@example.com",
                "password": "StrongPass1",
                "full_name": "Acc Ref User",
            },
        )
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "accref@example.com", "password": "StrongPass1"},
        )
        access_token = login_resp.cookies.get("access_token")
        resp = client.post(
            "/api/auth/refresh",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert resp.status_code == 401

    def test_refresh_invalid_token(self, client):
        resp = client.post(
            "/api/auth/refresh",
            headers={"Authorization": "Bearer invalidtoken"},
        )
        assert resp.status_code == 401


class TestMe:
    def test_me_authenticated(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"

    def test_me_no_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code in (401, 403)

