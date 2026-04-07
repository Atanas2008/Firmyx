from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.business import Business
from app.schemas.financial_record import FinancialRecordCreate, FinancialRecordRead
from app.repositories.financial_record_repository import FinancialRecordRepository
from app.services.file_parser import FileParser
from app.dependencies import get_owned_business
from app.middleware.rate_limiter import limiter

router = APIRouter()


@router.get("/{business_id}/records", response_model=List[FinancialRecordRead])
def list_records(
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """List all financial records for a business, ordered by most recent period first."""
    return FinancialRecordRepository(db).get_by_business(business.id)


@router.post("/{business_id}/records", response_model=FinancialRecordRead, status_code=status.HTTP_201_CREATED)
def create_record(
    data: FinancialRecordCreate,
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """Manually submit a financial record for a given month/year."""
    return FinancialRecordRepository(db).create(business.id, data)


@router.delete("/{business_id}/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    record_id: UUID,
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
):
    """Delete a single financial record by ID."""
    repo = FinancialRecordRepository(db)
    record = repo.get_by_id(record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found.")
    if record.business_id != business.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    repo.delete(record)


@router.post("/{business_id}/records/upload", response_model=List[FinancialRecordRead], status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def upload_records(
    request: Request,
    file: UploadFile = File(...),
    business: Business = Depends(get_owned_business),
    db: Session = Depends(get_db),
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
    # Validate file type — only allow explicit CSV/Excel MIME types
    allowed_types = {
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    }
    # Also validate by file extension as a defense-in-depth measure
    filename = (file.filename or "").lower()
    allowed_extensions = {".csv", ".xlsx", ".xls"}
    ext = "." + filename.rsplit(".", 1)[-1] if "." in filename else ""

    if file.content_type not in allowed_types or ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel files are supported.",
        )

    # Validate file size
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )
    await file.seek(0)

    parser = FileParser()
    records, errors = await parser.parse(file)

    if errors and not records:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "All rows failed validation.", "errors": errors},
        )

    created = FinancialRecordRepository(db).create_bulk(business.id, records)

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
