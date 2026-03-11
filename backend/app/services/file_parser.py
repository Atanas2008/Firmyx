import io
from typing import List, Tuple
import pandas as pd
from fastapi import UploadFile, HTTPException, status
from app.schemas.financial_record import FinancialRecordCreate

# Required columns for per-month format (one row per month)
REQUIRED_COLUMNS = {
    "month", "year", "revenue", "expenses",
    "payroll", "rent", "debt", "cash_reserves", "taxes", "cogs",
}

# Required columns for annual format (one row per year, no month column)
REQUIRED_COLUMNS_ANNUAL = {
    "year", "revenue", "expenses",
    "payroll", "rent", "debt", "cash_reserves", "taxes", "cogs",
}

# Flow items (income statement) — divide by 12 when distributing across months
ANNUAL_FLOW_FIELDS = {"revenue", "expenses", "payroll", "rent", "taxes", "cogs", "ebit"}
# Point-in-time items (balance sheet) — same value copied to all months
ANNUAL_SNAPSHOT_FIELDS = {"debt", "cash_reserves", "total_assets", "current_liabilities", "retained_earnings"}

MONTH_NAME_MAP = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}

COLUMN_ALIASES = {
    "cash_res": "cash_reserves",
    "cash_reserve": "cash_reserves",
    "cash": "cash_reserves",
    "assets": "total_assets",
    "asset": "total_assets",
    "current_li": "current_liabilities",
    "current_liab": "current_liabilities",
    "current_liability": "current_liabilities",
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
    """Parses CSV and Excel financial data files into FinancialRecordCreate objects.

    Supports two file formats:
    - **Monthly**: one row per month; requires columns month, year, revenue, expenses, …
    - **Annual**: one row per year (no month column); annual totals are automatically
      distributed across 12 months. Flow items (revenue, expenses, etc.) are divided
      by 12; balance-sheet items (debt, cash_reserves, etc.) are copied to every month.
    """

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
        df = df.rename(columns={c: COLUMN_ALIASES.get(c, c) for c in df.columns})

        # Route to appropriate parser based on presence of "month" column
        if "month" in df.columns:
            return self._parse_monthly(df)
        else:
            return self._parse_annual(df)

    # ------------------------------------------------------------------
    # Monthly format (one row per month)
    # ------------------------------------------------------------------

    def _parse_monthly(self, df: pd.DataFrame) -> Tuple[List[FinancialRecordCreate], List[str]]:
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
                    period_month=self._parse_month(row["month"], row_num),
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

    # ------------------------------------------------------------------
    # Annual format (one row per year — no month column)
    # ------------------------------------------------------------------

    def _parse_annual(self, df: pd.DataFrame) -> Tuple[List[FinancialRecordCreate], List[str]]:
        """Parse annual-summary rows and expand each into 12 monthly records.

        Flow items (revenue, expenses, payroll, rent, taxes, cogs, ebit) are
        divided by 12. Balance-sheet items (debt, cash_reserves, total_assets,
        current_liabilities, retained_earnings) are copied to each month unchanged.
        """
        missing = REQUIRED_COLUMNS_ANNUAL - set(df.columns)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Missing required columns: {', '.join(sorted(missing))}. "
                    "For annual format omit the 'month' column and provide yearly totals."
                ),
            )

        records: List[FinancialRecordCreate] = []
        errors: List[str] = []

        for idx, row in df.iterrows():
            row_num = int(idx) + 2
            try:
                year = int(row["year"])

                # Read raw annual values
                def _get(field: str, required: bool = True):
                    val = row.get(field)
                    if required:
                        return float(self._safe_decimal(val, row_num, field))
                    return float(self._safe_optional_decimal(val, row_num, field) or 0)

                def _get_opt(field: str):
                    val = row.get(field)
                    result = self._safe_optional_decimal(val, row_num, field)
                    return float(result) if result is not None else None

                annual_revenue = _get("revenue")
                annual_expenses = _get("expenses")
                annual_payroll = _get("payroll")
                annual_rent = _get("rent")
                annual_taxes = _get("taxes")
                annual_cogs = _get("cogs")
                annual_ebit = _get_opt("ebit")

                # Balance-sheet (snapshot) values — shared across all months
                debt = _get("debt")
                cash_reserves = _get("cash_reserves")
                total_assets = _get_opt("total_assets")
                current_liabilities = _get_opt("current_liabilities")
                retained_earnings = _get_opt("retained_earnings")

                for month in range(1, 13):
                    record = FinancialRecordCreate(
                        period_month=month,
                        period_year=year,
                        monthly_revenue=str(round(annual_revenue / 12, 2)),
                        monthly_expenses=str(round(annual_expenses / 12, 2)),
                        payroll=str(round(annual_payroll / 12, 2)),
                        rent=str(round(annual_rent / 12, 2)),
                        debt=str(round(debt, 2)),
                        cash_reserves=str(round(cash_reserves, 2)),
                        taxes=str(round(annual_taxes / 12, 2)),
                        cost_of_goods_sold=str(round(annual_cogs / 12, 2)),
                        total_assets=str(round(total_assets, 2)) if total_assets is not None else None,
                        current_liabilities=str(round(current_liabilities, 2)) if current_liabilities is not None else None,
                        ebit=str(round(annual_ebit / 12, 2)) if annual_ebit is not None else None,
                        retained_earnings=str(round(retained_earnings, 2)) if retained_earnings is not None else None,
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

    def _parse_month(self, value, row_num: int) -> int:
        """Parse month from numeric value or month name."""
        if pd.isna(value):
            raise ValueError(f"Missing value for required field 'month' in row {row_num}")

        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in MONTH_NAME_MAP:
                return MONTH_NAME_MAP[normalized]

        try:
            month = int(float(value))
        except (TypeError, ValueError):
            raise ValueError(f"Invalid month '{value}' in row {row_num}")

        if not 1 <= month <= 12:
            raise ValueError(f"Invalid month '{value}' in row {row_num}. Expected 1-12")

        return month
