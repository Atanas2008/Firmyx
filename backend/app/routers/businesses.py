from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.business import Business
from app.models.user import User
from app.schemas.business import BusinessCreate, BusinessRead, BusinessUpdate
from app.repositories.business_repository import BusinessRepository
from app.services.auth_service import get_current_user
from app.dependencies import get_owned_business

router = APIRouter()


@router.get("", response_model=List[BusinessRead])
def list_businesses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all businesses owned by the authenticated user (paginated)."""
    limit = min(limit, 100)  # Cap at 100 per page
    return BusinessRepository(db).get_by_owner(current_user.id, skip=skip, limit=limit)


@router.post("", response_model=BusinessRead, status_code=status.HTTP_201_CREATED)
def create_business(
    data: BusinessCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new business for the authenticated user."""
    return BusinessRepository(db).create(current_user.id, data)


@router.get("/{business_id}", response_model=BusinessRead)
def get_business(
    business: Business = Depends(get_owned_business),
):
    """Get a single business by ID (must be owned by the authenticated user)."""
    return business


@router.put("/{business_id}", response_model=BusinessRead)
def update_business(
    data: BusinessUpdate,
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """Update business details."""
    return BusinessRepository(db).update(business, data)


@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business(
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """Permanently delete a business and all its associated data."""
    BusinessRepository(db).delete(business)
