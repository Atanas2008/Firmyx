"""Tests for the FileParser service."""
import io
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import UploadFile
from app.services.file_parser import FileParser


def _make_upload(content: str, filename: str = "test.csv") -> UploadFile:
    """Create a mock UploadFile from a CSV string."""
    file_bytes = content.encode("utf-8")
    return UploadFile(
        filename=filename,
        file=io.BytesIO(file_bytes),
    )


class TestFileParser:
    @pytest.mark.asyncio
    async def test_parse_valid_csv(self):
        csv = (
            "month,year,revenue,expenses,payroll,rent,debt,cash_reserves,taxes,cogs\n"
            "1,2025,50000,35000,15000,3000,20000,100000,5000,10000\n"
            "2,2025,55000,36000,15500,3000,19000,110000,5500,11000\n"
        )
        parser = FileParser()
        upload = _make_upload(csv)
        records, errors = await parser.parse(upload)
        assert len(records) == 2
        assert len(errors) == 0
        assert records[0].period_month == 1
        assert records[1].period_month == 2

    @pytest.mark.asyncio
    async def test_parse_missing_columns(self):
        csv = "month,year,revenue\n1,2025,50000\n"
        parser = FileParser()
        upload = _make_upload(csv)
        with pytest.raises(Exception):
            await parser.parse(upload)

    @pytest.mark.asyncio
    async def test_parse_empty_csv(self):
        csv = ""
        parser = FileParser()
        upload = _make_upload(csv)
        with pytest.raises(Exception):
            await parser.parse(upload)

    @pytest.mark.asyncio
    async def test_parse_unsupported_format(self):
        parser = FileParser()
        upload = _make_upload("some data", filename="test.txt")
        with pytest.raises(Exception):
            await parser.parse(upload)

    @pytest.mark.asyncio
    async def test_parse_annual_format(self):
        csv = (
            "year,revenue,expenses,payroll,rent,debt,cash_reserves,taxes,cogs\n"
            "2025,600000,420000,180000,36000,20000,100000,60000,120000\n"
        )
        parser = FileParser()
        upload = _make_upload(csv)
        records, errors = await parser.parse(upload)
        # Annual format should expand to 12 monthly records
        assert len(records) == 12
        assert len(errors) == 0
        # Flow items should be divided by 12
        assert float(records[0].monthly_revenue) == pytest.approx(50000.0)

    @pytest.mark.asyncio
    async def test_parse_invalid_values(self):
        csv = (
            "month,year,revenue,expenses,payroll,rent,debt,cash_reserves,taxes,cogs\n"
            "1,2025,not_a_number,35000,15000,3000,20000,100000,5000,10000\n"
        )
        parser = FileParser()
        upload = _make_upload(csv)
        records, errors = await parser.parse(upload)
        # Should have an error for the bad row
        assert len(errors) >= 1 or len(records) == 0
