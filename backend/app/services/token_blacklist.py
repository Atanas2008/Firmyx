"""Redis-based JWT token blacklist for server-side logout / token revocation.

Tokens are stored by their `jti` claim with a TTL matching the token's
remaining lifetime so entries auto-expire.
"""

import logging
from typing import Optional

import redis

from app.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[redis.Redis] = None


def _get_redis() -> Optional[redis.Redis]:
    """Lazy-initialise and return a Redis client.  Returns None when Redis
    is unavailable (e.g. in-memory test mode)."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    if settings.REDIS_URL.startswith("memory://"):
        return None

    try:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        _redis_client.ping()
        return _redis_client
    except Exception:
        logger.warning("Redis unavailable — token blacklist disabled")
        return None


def blacklist_token(jti: str, ttl_seconds: int) -> None:
    """Add a token's jti to the blacklist with the given TTL."""
    r = _get_redis()
    if r:
        try:
            r.setex(f"bl:{jti}", ttl_seconds, "1")
        except Exception:
            logger.exception("Failed to blacklist token %s", jti)


def is_blacklisted(jti: str) -> bool:
    """Check whether a jti has been revoked."""
    r = _get_redis()
    if r:
        try:
            return r.exists(f"bl:{jti}") > 0
        except Exception:
            logger.exception("Failed to check blacklist for %s", jti)
    return False
