"""Tests for financial records API endpoints."""
import uuid
import pytest


class TestCreateRecord:
    def test_create_success(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.post(
            f"/api/businesses/{bid}/records",
            json={
                "period_month": 3,
                "period_year": 2025,
                "monthly_revenue": 60000,
                "monthly_expenses": 40000,
                "payroll": 18000,
                "rent": 3500,
                "debt": 15000,
                "cash_reserves": 120000,
                "taxes": 6000,
                "cost_of_goods_sold": 12000,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["period_month"] == 3
        assert data["period_year"] == 2025
        assert float(data["monthly_revenue"]) == 60000

    def test_create_missing_required_fields(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.post(
            f"/api/businesses/{bid}/records",
            json={"period_month": 1},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_create_invalid_month(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.post(
            f"/api/businesses/{bid}/records",
            json={
                "period_month": 13,
                "period_year": 2025,
                "monthly_revenue": 1000,
                "monthly_expenses": 500,
            },
            headers=auth_headers,
        )
        assert resp.status_code == 422


class TestListRecords:
    def test_list_records(self, client, auth_headers, test_business, test_record):
        bid = test_business["id"]
        resp = client.get(f"/api/businesses/{bid}/records", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "has_more" in data
        assert len(data["items"]) >= 1

    def test_list_records_empty(self, client, auth_headers, test_business):
        bid = test_business["id"]
        resp = client.get(f"/api/businesses/{bid}/records", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_records_pagination(self, client, auth_headers, test_business, test_record):
        bid = test_business["id"]
        resp = client.get(
            f"/api/businesses/{bid}/records?skip=0&limit=1", headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["limit"] == 1


class TestDeleteRecord:
    def test_delete_success(self, client, auth_headers, test_business, test_record):
        bid = test_business["id"]
        rid = test_record["id"]
        resp = client.delete(
            f"/api/businesses/{bid}/records/{rid}", headers=auth_headers
        )
        assert resp.status_code == 204

    def test_delete_nonexistent(self, client, auth_headers, test_business):
        bid = test_business["id"]
        fake_id = str(uuid.uuid4())
        resp = client.delete(
            f"/api/businesses/{bid}/records/{fake_id}", headers=auth_headers
        )
        assert resp.status_code == 404

    def test_delete_other_users_record(self, client, auth_headers, test_business, test_record):
        # Register a second user with their own business
        client.post(
            "/api/auth/register",
            json={
                "email": "other2@example.com",
                "password": "StrongPass1",
                "full_name": "Other User",
            },
        )
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "other2@example.com", "password": "StrongPass1"},
        )
        other_token = login_resp.json()["access_token"]
        other_headers = {"Authorization": f"Bearer {other_token}"}

        bid = test_business["id"]
        rid = test_record["id"]
        # Other user can't access this business at all → 403
        resp = client.delete(
            f"/api/businesses/{bid}/records/{rid}", headers=other_headers
        )
        assert resp.status_code == 403
