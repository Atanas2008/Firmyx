import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings

logger = logging.getLogger("firmyx.security")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add production security headers to all responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent XSS and clickjacking
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        # Prevent caching of API responses containing sensitive data
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"

        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; "
                "base-uri 'self'; form-action 'self'"
            )

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log request method, path, status, and duration for observability."""

    # Paths that may contain sensitive data — log at reduced detail
    _SENSITIVE_PATHS = {"/api/auth/login", "/api/auth/register", "/api/auth/refresh"}

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        path = request.url.path

        # Skip health checks from logs
        if path not in ("/", "/health"):
            # Log security-relevant events at higher level
            if response.status_code in (401, 403):
                logger.warning(
                    "SECURITY %s %s → %d (%.1fms) client=%s",
                    request.method,
                    path,
                    response.status_code,
                    duration_ms,
                    request.client.host if request.client else "unknown",
                )
            else:
                logger.info(
                    "%s %s → %d (%.1fms)",
                    request.method,
                    path,
                    response.status_code,
                    duration_ms,
                )

        return response
