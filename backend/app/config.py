from pydantic_settings import BaseSettings
from pydantic import model_validator
from functools import lru_cache
from typing import List


INSECURE_SECRET_KEYS = {
    "change-this-secret-key-in-production",
    "your-very-secret-key-change-in-production",
    "secret",
    "password",
    "",
}


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://firmyx:password@db:5432/firmyx"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "./uploads"
    REPORTS_DIR: str = "./reports"
    GEMINI_API_KEY: str = ""  # Set in .env; empty string = feature disabled
    REDIS_URL: str = "redis://redis:6379/0"
    ADMIN_SECRET: str = ""  # Required for admin panel access. Set in .env
    SENTRY_DSN: str = ""  # Set in .env to enable Sentry error tracking

    # ─── Application ──────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    MAX_UPLOAD_SIZE_MB: int = 10

    @model_validator(mode="after")
    def _enforce_secure_secret_key(self):
        if self.ENVIRONMENT == "production" and self.SECRET_KEY in INSECURE_SECRET_KEYS:
            raise ValueError(
                "FATAL: SECRET_KEY must be changed from its default value in production. "
                "Set a strong random key via the SECRET_KEY environment variable."
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
