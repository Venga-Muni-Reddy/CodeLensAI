from typing import Optional
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from motor.motor_asyncio import AsyncIOMotorDatabase
import redis.asyncio as aioredis

from app.core.database import get_database
from app.core.redis import get_redis
from app.core.security import decode_token
from app.core.errors import APIError
from app.models.user import UserResponse
from app.modules.auth.service import get_user_by_id

security_scheme = HTTPBearer(auto_error=False)


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


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UserResponse:
    """Extract and validate JWT Bearer token and retrieve the current authenticated user."""
    if not credentials or not credentials.credentials:
        raise APIError(
            status_code=401,
            code="NOT_AUTHENTICATED",
            message="Authentication credentials were not provided.",
        )

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except JWTError:
        raise APIError(
            status_code=401,
            code="INVALID_TOKEN",
            message="Token is invalid or has expired.",
        )

    if payload.get("type") != "access":
        raise APIError(
            status_code=401,
            code="INVALID_TOKEN_TYPE",
            message="Invalid token type provided for authentication.",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise APIError(
            status_code=401,
            code="INVALID_TOKEN_SUBJECT",
            message="Token payload is missing user identity.",
        )

    user = await get_user_by_id(db, user_id)
    if not user.is_active:
        raise APIError(
            status_code=403,
            code="ACCOUNT_INACTIVE",
            message="User account is deactivated.",
        )

    return user
