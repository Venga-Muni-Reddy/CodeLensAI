from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import redis.asyncio as aioredis
from app.core.database import get_database
from app.core.redis import get_redis
from app.core.errors import APIError


async def get_db() -> AsyncIOMotorDatabase:
    """Dependency that provides the active MongoDB database."""
    db = get_database()
    if db is None:
        raise APIError(
            status_code=503,
            code="DATABASE_UNAVAILABLE",
            message="Database connection is not available.",
        )
    return db


async def get_redis_client() -> Optional[aioredis.Redis]:
    """Dependency that provides the active Redis client (optional)."""
    return get_redis()
