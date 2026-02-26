from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.business import BusinessCreate, BusinessRead, BusinessUpdate
from app.repositories.business_repository import BusinessRepository
from app.services.auth_service import get_current_user

router = APIRouter()


def _get_owned_business(business_id: UUID, current_user: User, db: Session):
    """Fetch a business by ID and verify that it belongs to the current user."""
    repo = BusinessRepository(db)
    business = repo.get_by_id(business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found.")
    if business.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return business


@router.get("", response_model=List[BusinessRead])
def list_businesses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all businesses owned by the authenticated user."""
    return BusinessRepository(db).get_by_owner(current_user.id)


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
    business_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single business by ID (must be owned by the authenticated user)."""
    return _get_owned_business(business_id, current_user, db)


@router.put("/{business_id}", response_model=BusinessRead)
def update_business(
    business_id: UUID,
    data: BusinessUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update business details."""
    business = _get_owned_business(business_id, current_user, db)
    return BusinessRepository(db).update(business, data)


@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_business(
    business_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete a business and all its associated data."""
    business = _get_owned_business(business_id, current_user, db)
    BusinessRepository(db).delete(business)
