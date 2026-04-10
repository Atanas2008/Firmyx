import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.logging_config import logger
from app.middleware.rate_limiter import limiter
from app.middleware.security import SecurityHeadersMiddleware, RequestLoggingMiddleware
from app.routers import auth, businesses, financial_records, analysis, reports, translate, admin

# ─── Sentry (initialise before app creation so all errors are captured) ───────
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
            traces_sample_rate=0.2,
            send_default_pii=False,
        )
    except ImportError:
        logger.warning("sentry-sdk not installed — error tracking disabled")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.REPORTS_DIR, exist_ok=True)

    if settings.SECRET_KEY in ("change-this-secret-key-in-production", "your-very-secret-key-change-in-production"):
        logger.warning("⚠️  Using default SECRET_KEY — set a secure key in .env for production!")

    logger.info("Firmyx API starting (env=%s)", settings.ENVIRONMENT)
    yield
    logger.info("Firmyx API shutting down")


app = FastAPI(
    title="Firmyx API",
    description="Backend API for Firmyx — Financial Risk Detection Platform",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# ─── Middleware (order matters: last added = first executed) ───────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)

if settings.is_production:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Admin-Secret"],
    )
else:
    # In development, allow localhost and any private/LAN IP on common dev ports
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Admin-Secret"],
    )


# ─── Global exception handler ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )


# ─── Routes ──────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(businesses.router, prefix="/api/businesses", tags=["Businesses"])
app.include_router(financial_records.router, prefix="/api/businesses", tags=["Financial Records"])
app.include_router(analysis.router, prefix="/api/businesses", tags=["Analysis"])
app.include_router(reports.router, prefix="/api/businesses", tags=["Reports"])
app.include_router(translate.router, prefix="/api", tags=["Translation"])
app.include_router(
    admin.router,
    prefix="/api/admin",
    tags=["Admin"],
    include_in_schema=not settings.is_production,
)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "Firmyx API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
