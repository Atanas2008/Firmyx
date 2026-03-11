from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.financial_record import FinancialRecordCreate, FinancialRecordRead
from app.repositories.business_repository import BusinessRepository
from app.repositories.financial_record_repository import FinancialRecordRepository
from app.services.auth_service import get_current_user
from app.services.file_parser import FileParser

router = APIRouter()


def _assert_business_owner(business_id: UUID, current_user: User, db: Session):
    """Verify the business exists and belongs to the current user."""
    business = BusinessRepository(db).get_by_id(business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found.")
    if business.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return business


@router.get("/{business_id}/records", response_model=List[FinancialRecordRead])
def list_records(
    business_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all financial records for a business, ordered by most recent period first."""
    _assert_business_owner(business_id, current_user, db)
    return FinancialRecordRepository(db).get_by_business(business_id)


@router.post("/{business_id}/records", response_model=FinancialRecordRead, status_code=status.HTTP_201_CREATED)
def create_record(
    business_id: UUID,
    data: FinancialRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually submit a financial record for a given month/year."""
    _assert_business_owner(business_id, current_user, db)
    return FinancialRecordRepository(db).create(business_id, data)


@router.delete("/{business_id}/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    business_id: UUID,
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a single financial record by ID."""
    _assert_business_owner(business_id, current_user, db)
    repo = FinancialRecordRepository(db)
    record = repo.get_by_id(record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found.")
    if record.business_id != business_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    repo.delete(record)


@router.post("/{business_id}/records/upload", response_model=List[FinancialRecordRead], status_code=status.HTTP_201_CREATED)
async def upload_records(
    business_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a CSV or Excel file containing financial records.

    **Monthly format** (one row per month):
    Required columns: month, year, revenue, expenses, payroll, rent,
    debt, cash_reserves, taxes, cogs

    **Annual format** (one row per year — omit the `month` column):
    Required columns: year, revenue, expenses, payroll, rent,
    debt, cash_reserves, taxes, cogs
    Annual totals are automatically distributed across 12 monthly records.
    Flow items (revenue, expenses, etc.) are divided by 12; balance-sheet
    items (debt, cash_reserves, etc.) are copied to every month as-is.

    Optional columns (both formats): total_assets, current_liabilities, ebit, retained_earnings

    Returns the list of created records. Row-level validation errors
    are returned in the response body under the 'errors' key via a 422 response.
    """
    _assert_business_owner(business_id, current_user, db)

    parser = FileParser()
    records, errors = await parser.parse(file)

    if errors and not records:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "All rows failed validation.", "errors": errors},
        )

    created = FinancialRecordRepository(db).create_bulk(business_id, records)

    if errors:
        # Partial success — return 207-like JSON with both results and errors
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": f"{len(created)} record(s) imported, {len(errors)} row(s) failed.",
                "errors": errors,
            },
        )

    return created
