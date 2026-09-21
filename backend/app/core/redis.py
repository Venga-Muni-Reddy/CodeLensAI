import logging
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisManager:
    client: Optional[aioredis.Redis] = None


redis_manager = RedisManager()


async def connect_to_redis() -> None:
    """Initialize Redis connection pool."""
    try:
        logger.info("Connecting to Redis at %s...", settings.REDIS_URL)
        redis_manager.client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
        )
        await redis_manager.client.ping()
        logger.info("Successfully connected to Redis.")
    except Exception as e:
        logger.warning("Redis connection check failed (is Redis running?): %s", e)


async def close_redis_connection() -> None:
    """Close Redis connection."""
    if redis_manager.client is not None:
        logger.info("Closing Redis connection...")
        await redis_manager.client.aclose()
        redis_manager.client = None
        logger.info("Redis connection closed.")


def get_redis() -> Optional[aioredis.Redis]:
    """Get active Redis client reference."""
    return redis_manager.client


async def ping_redis() -> bool:
    """Check if Redis is reachable."""
    if redis_manager.client is None:
        return False
    try:
        return bool(await redis_manager.client.ping())
    except Exception:
        return False
