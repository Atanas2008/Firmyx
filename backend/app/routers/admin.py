"""Admin endpoints — user management (triple-gated: JWT + admin role + ADMIN_SECRET).

To promote a user to admin, run this SQL against the database:
    UPDATE users SET role = 'admin' WHERE email = 'your@email.com';

Then set ADMIN_SECRET in backend/.env:
    python -c "import secrets; print(secrets.token_hex(32))"
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.logging_config import logger
from app.middleware.rate_limiter import limiter
from app.models.user import User
from app.models.business import Business
from app.models.financial_record import FinancialRecord
from app.models.risk_analysis import RiskAnalysis
from app.models.report import Report
from app.services.auth_service import get_admin_user, hash_password

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class AdminUserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    analyses_count: int = 0
    is_unlocked: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedUsers(BaseModel):
    users: list[AdminUserOut]
    total: int


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr


class ResetPasswordRequest(BaseModel):
    new_password: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/users", response_model=PaginatedUsers)
@limiter.limit("10/minute")
def list_users(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=200),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """List all users with optional search and pagination."""
    query = db.query(User)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            User.email.ilike(pattern) | User.full_name.ilike(pattern)
        )
    total = query.count()
    items = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return PaginatedUsers(users=items, total=total)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
def delete_user(
    request: Request,
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Delete a user and all associated data (cascade)."""
    if user_id == _admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.warning("Admin %s deleted user %s (%s)", _admin.email, user.email, user.id)
    for biz in db.query(Business).filter(Business.owner_id == user_id).all():
        db.query(Report).filter(Report.business_id == biz.id).delete()
        db.query(RiskAnalysis).filter(RiskAnalysis.business_id == biz.id).delete()
        db.query(FinancialRecord).filter(FinancialRecord.business_id == biz.id).delete()
        db.delete(biz)
    db.delete(user)
    db.commit()


@router.put("/users/{user_id}/email")
@limiter.limit("10/minute")
def change_user_email(
    request: Request,
    user_id: UUID,
    body: ChangeEmailRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Change a user's email address."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(User).filter(User.email == body.new_email).first()
    if existing and existing.id != user_id:
        raise HTTPException(status_code=409, detail="Email already in use")
    logger.warning("Admin %s changed email for user %s: %s -> %s", _admin.email, user.id, user.email, body.new_email)
    user.email = body.new_email
    db.commit()
    return {"detail": "Email updated"}


@router.post("/users/{user_id}/reset-password")
@limiter.limit("5/minute")
def reset_user_password(
    request: Request,
    user_id: UUID,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Reset a user's password and invalidate existing tokens."""
    if len(body.new_password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.warning("Admin %s reset password for user %s (%s)", _admin.email, user.email, user.id)
    user.hashed_password = hash_password(body.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    db.commit()
    return {"detail": "Password reset"}


@router.put("/users/{user_id}/deactivate")
@limiter.limit("10/minute")
def deactivate_user(
    request: Request,
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Deactivate a user account."""
    if user_id == _admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.warning("Admin %s deactivated user %s (%s)", _admin.email, user.email, user.id)
    user.is_active = False
    db.commit()
    return {"detail": "User deactivated"}


@router.put("/users/{user_id}/activate")
@limiter.limit("10/minute")
def activate_user(
    request: Request,
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Activate a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.warning("Admin %s activated user %s (%s)", _admin.email, user.email, user.id)
    user.is_active = True
    db.commit()
    return {"detail": "User activated"}


@router.put("/users/{user_id}/unlock")
@limiter.limit("10/minute")
def unlock_user(
    request: Request,
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Unlock a user account (remove free-tier analysis limit)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.warning("Admin %s unlocked user %s (%s)", _admin.email, user.email, user.id)
    user.is_unlocked = True
    db.commit()
    return {"detail": "User unlocked"}


@router.put("/users/{user_id}/lock")
@limiter.limit("10/minute")
def lock_user(
    request: Request,
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    """Lock a user account (re-enable free-tier analysis limit)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logger.warning("Admin %s locked user %s (%s)", _admin.email, user.email, user.id)
    user.is_unlocked = False
    db.commit()
    return {"detail": "User locked"}
