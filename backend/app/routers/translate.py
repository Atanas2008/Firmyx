from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator

from app.services.auth_service import get_current_user
from app.services.translator import TranslationService
from app.middleware.rate_limiter import limiter
from app.config import settings
from app.models.user import User

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────


class TranslateRequest(BaseModel):
    texts: list[str]
    target_language: str

    @field_validator("texts")
    @classmethod
    def validate_texts(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("texts list cannot be empty")
        if len(v) > 50:
            raise ValueError("Maximum 50 texts per request")
        total_chars = sum(len(t) for t in v)
        if total_chars > 50_000:
            raise ValueError("Total text length exceeds 50,000 characters")
        return v

    @field_validator("target_language")
    @classmethod
    def validate_target_language(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in ("en", "bg"):
            raise ValueError("Supported languages: en, bg")
        return v


class TranslateResponse(BaseModel):
    translations: list[str]


# ── Endpoint ───────────────────────────────────────────────


@router.post("/translate", response_model=TranslateResponse)
@limiter.limit("30/minute")
async def translate_texts(
    body: TranslateRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Translate dynamic content (analysis summaries, recommendations, etc.)."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Translation service is not configured.",
        )

    if body.target_language == "en":
        return TranslateResponse(translations=body.texts)

    svc = TranslationService()
    translated = await svc.translate_batch(body.texts, body.target_language)
    return TranslateResponse(translations=translated)
