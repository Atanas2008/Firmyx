import io
from typing import List, Tuple
import pandas as pd
from fastapi import UploadFile, HTTPException, status
from app.schemas.financial_record import FinancialRecordCreate

REQUIRED_COLUMNS = {
    "month", "year", "revenue", "expenses",
    "payroll", "rent", "debt", "cash_reserves", "taxes", "cogs",
}

COLUMN_MAP = {
    "month": "period_month",
    "year": "period_year",
    "revenue": "monthly_revenue",
    "expenses": "monthly_expenses",
    "payroll": "payroll",
    "rent": "rent",
    "debt": "debt",
    "cash_reserves": "cash_reserves",
    "taxes": "taxes",
    "cogs": "cost_of_goods_sold",
    "total_assets": "total_assets",
    "current_liabilities": "current_liabilities",
    "ebit": "ebit",
    "retained_earnings": "retained_earnings",
}


class FileParser:
    """Parses CSV and Excel financial data files into FinancialRecordCreate objects."""

    async def parse(self, file: UploadFile) -> Tuple[List[FinancialRecordCreate], List[str]]:
        """
        Read an uploaded CSV or Excel file and return a tuple of:
          - A list of validated FinancialRecordCreate objects
          - A list of row-level validation error messages (if any)

        Supported MIME types / extensions: .csv, .xlsx
        """
        content = await file.read()
        filename = (file.filename or "").lower()

        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(content))
            elif filename.endswith(".xlsx") or filename.endswith(".xls"):
                df = pd.read_excel(io.BytesIO(content))
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unsupported file type. Please upload a .csv or .xlsx file.",
                )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not parse file: {exc}",
            )

        # Normalize column names
        df.columns = [c.strip().lower() for c in df.columns]

        missing = REQUIRED_COLUMNS - set(df.columns)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Missing required columns: {', '.join(sorted(missing))}",
            )

        records: List[FinancialRecordCreate] = []
        errors: List[str] = []

        for idx, row in df.iterrows():
            row_num = int(idx) + 2  # 1-based, accounting for header row
            try:
                record = FinancialRecordCreate(
                    period_month=int(row["month"]),
                    period_year=int(row["year"]),
                    monthly_revenue=self._safe_decimal(row["revenue"], row_num, "revenue"),
                    monthly_expenses=self._safe_decimal(row["expenses"], row_num, "expenses"),
                    payroll=self._safe_decimal(row.get("payroll", 0), row_num, "payroll"),
                    rent=self._safe_decimal(row.get("rent", 0), row_num, "rent"),
                    debt=self._safe_decimal(row.get("debt", 0), row_num, "debt"),
                    cash_reserves=self._safe_decimal(row.get("cash_reserves", 0), row_num, "cash_reserves"),
                    taxes=self._safe_decimal(row.get("taxes", 0), row_num, "taxes"),
                    cost_of_goods_sold=self._safe_decimal(row.get("cogs", 0), row_num, "cogs"),
                    total_assets=self._safe_optional_decimal(row.get("total_assets"), row_num, "total_assets"),
                    current_liabilities=self._safe_optional_decimal(
                        row.get("current_liabilities"), row_num, "current_liabilities"
                    ),
                    ebit=self._safe_optional_decimal(row.get("ebit"), row_num, "ebit"),
                    retained_earnings=self._safe_optional_decimal(
                        row.get("retained_earnings"), row_num, "retained_earnings"
                    ),
                )
                records.append(record)
            except HTTPException:
                raise
            except Exception as exc:
                errors.append(f"Row {row_num}: {exc}")

        return records, errors

    def _safe_decimal(self, value, row_num: int, field: str):
        """Convert a cell value to a decimal string, raising a clear error on failure."""
        if pd.isna(value):
            raise ValueError(f"Missing value for required field '{field}' in row {row_num}")
        try:
            return str(float(value))
        except (TypeError, ValueError):
            raise ValueError(f"Invalid value '{value}' for field '{field}' in row {row_num}")

    def _safe_optional_decimal(self, value, row_num: int, field: str):
        """Convert an optional cell value to decimal string or return None for empty cells."""
        if value is None or pd.isna(value):
            return None
        try:
            return str(float(value))
        except (TypeError, ValueError):
            raise ValueError(f"Invalid value '{value}' for field '{field}' in row {row_num}")
