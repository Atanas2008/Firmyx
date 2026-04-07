"""Shared FastAPI dependencies for cross-cutting concerns like ownership checks."""

from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.repositories.business_repository import BusinessRepository
from app.services.auth_service import get_current_user


def get_owned_business(
    business_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """FastAPI dependency that resolves a business and enforces ownership.

    Raises 404 if business not found, 403 if the authenticated user is not the owner.
    Returns the Business ORM object so downstream endpoints don't need to re-query.
    """
    business = BusinessRepository(db).get_by_id(business_id)
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )
    if business.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )
    return business
