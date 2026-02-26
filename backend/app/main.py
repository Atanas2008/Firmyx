import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.middleware.rate_limiter import limiter
from app.routers import auth, businesses, financial_records, analysis, reports

app = FastAPI(
    title="FirmShield API",
    description="Backend API for FirmShield - Financial Risk Detection Platform",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(businesses.router, prefix="/api/businesses", tags=["Businesses"])
app.include_router(financial_records.router, prefix="/api/businesses", tags=["Financial Records"])
app.include_router(analysis.router, prefix="/api/businesses", tags=["Analysis"])
app.include_router(reports.router, prefix="/api/businesses", tags=["Reports"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "FirmShield API"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
