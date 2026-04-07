from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

# Use Redis as the rate-limit storage backend so limits are shared across
# multiple Gunicorn workers.  Falls back to in-memory if Redis is unavailable.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
    storage_uri=settings.REDIS_URL,
)
