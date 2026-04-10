"""Unit tests for input validation (Pydantic schemas)."""

import pytest
from pydantic import ValidationError
from app.schemas.user import UserCreate
from app.schemas.business import BusinessCreate


class TestUserCreateValidation:
    def test_valid_user(self):
        user = UserCreate(
            email="test@example.com",
            password="SecurePass1",
            full_name="John Doe",
        )
        assert user.email == "test@example.com"

    def test_short_password_rejected(self):
        with pytest.raises(ValidationError, match="at least 8 characters"):
            UserCreate(email="a@b.com", password="Short1", full_name="Test")

    def test_password_without_uppercase(self):
        with pytest.raises(ValidationError, match="uppercase"):
            UserCreate(email="a@b.com", password="lowercase1", full_name="Test")

    def test_password_without_lowercase(self):
        with pytest.raises(ValidationError, match="lowercase"):
            UserCreate(email="a@b.com", password="UPPERCASE1", full_name="Test")

    def test_password_without_digit(self):
        with pytest.raises(ValidationError, match="digit"):
            UserCreate(email="a@b.com", password="NoDigits!", full_name="Test")

    def test_overly_long_password(self):
        with pytest.raises(ValidationError, match="at most 128"):
            UserCreate(email="a@b.com", password="A" * 129, full_name="Test")

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError, match="at least 2"):
            UserCreate(email="a@b.com", password="Secret123", full_name=" ")

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            UserCreate(email="not-an-email", password="Secret123", full_name="Test")


class TestBusinessCreateValidation:
    def test_valid_business(self):
        biz = BusinessCreate(name="Acme Corp", industry="Technology", country="US")
        assert biz.name == "Acme Corp"

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            BusinessCreate(name="")

    def test_negative_employees_rejected(self):
        with pytest.raises(ValidationError, match="must be between 0"):
            BusinessCreate(name="Test", num_employees=-5)

    def test_negative_years_rejected(self):
        with pytest.raises(ValidationError, match="must be between 0"):
            BusinessCreate(name="Test", years_operating=-1)

    def test_name_trimmed(self):
        biz = BusinessCreate(name="  Acme Corp  ")
        assert biz.name == "Acme Corp"
