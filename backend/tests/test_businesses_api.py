"""Tests for business CRUD API endpoints."""
import pytest


class TestCreateBusiness:
    def test_create_success(self, client, auth_headers):
        resp = client.post(
            "/api/businesses",
            json={
                "name": "New Biz",
                "industry": "Technology",
                "country": "US",
                "num_employees": 5,
                "years_operating": 1,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "New Biz"
        assert data["industry"] == "Technology"
        assert "id" in data

    def test_create_no_auth(self, client):
        resp = client.post(
            "/api/businesses",
            json={"name": "No Auth Biz", "industry": "Technology"},
        )
        assert resp.status_code in (401, 403)


class TestListBusinesses:
    def test_list_own_businesses(self, client, auth_headers, test_business):
        resp = client.get("/api/businesses", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert any(b["name"] == "Test Corp" for b in data)

    def test_list_empty_for_new_user(self, client):
        # Register a new user with no businesses
        client.post(
            "/api/auth/register",
            json={
                "email": "empty@example.com",
                "password": "StrongPass1",
                "full_name": "Empty User",
            },
        )
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "empty@example.com", "password": "StrongPass1"},
        )
        token = login_resp.json()["access_token"]
        resp = client.get(
            "/api/businesses",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json() == []


class TestGetBusiness:
    def test_get_own_business(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.get(f"/api/businesses/{bid}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Test Corp"

    def test_get_nonexistent_business(self, client, auth_headers):
        import uuid

        fake_id = str(uuid.uuid4())
        resp = client.get(f"/api/businesses/{fake_id}", headers=auth_headers)
        assert resp.status_code == 404

    def test_get_other_users_business(self, client, auth_headers, test_business):
        # Register a second user
        client.post(
            "/api/auth/register",
            json={
                "email": "other@example.com",
                "password": "StrongPass1",
                "full_name": "Other User",
            },
        )
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "other@example.com", "password": "StrongPass1"},
        )
        other_token = login_resp.json()["access_token"]
        other_headers = {"Authorization": f"Bearer {other_token}"}

        bid = test_business["id"]
        resp = client.get(f"/api/businesses/{bid}", headers=other_headers)
        assert resp.status_code == 403


class TestUpdateBusiness:
    def test_update_name(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.put(
            f"/api/businesses/{bid}",
            json={"name": "Updated Corp"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Corp"

    def test_partial_update(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.put(
            f"/api/businesses/{bid}",
            json={"industry": "Retail"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["industry"] == "Retail"
        assert resp.json()["name"] == "Test Corp"  # unchanged


class TestDeleteBusiness:
    def test_delete_success(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.delete(f"/api/businesses/{bid}", headers=auth_headers)
        assert resp.status_code == 204

        # Verify it's gone
        resp = client.get(f"/api/businesses/{bid}", headers=auth_headers)
        assert resp.status_code == 404
