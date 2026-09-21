from datetime import datetime, timezone
import logging
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from jose import JWTError

from app.core.security import get_password_hash, verify_password, decode_token, create_access_token
from app.core.errors import APIError
from app.models.user import UserCreate, UserResponse

logger = logging.getLogger(__name__)


def user_doc_to_response(doc: dict) -> UserResponse:
    """Transform MongoDB user document to Pydantic UserResponse."""
    return UserResponse(
        id=str(doc["_id"]),
        name=doc.get("name", ""),
        email=doc.get("email", ""),
        is_active=doc.get("is_active", True),
        is_verified=doc.get("is_verified", False),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
    )


async def register_user(db: AsyncIOMotorDatabase, user_in: UserCreate) -> UserResponse:
    """Register a new user account with unique email validation and bcrypt hashing."""
    normalized_email = user_in.email.strip().lower()

    # Check for existing email
    existing = await db.users.find_one({"email": normalized_email})
    if existing:
        raise APIError(
            status_code=409,
            code="EMAIL_ALREADY_EXISTS",
            message="An account with this email address already exists.",
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "name": user_in.name.strip(),
        "email": normalized_email,
        "password_hash": get_password_hash(user_in.password),
        "is_active": True,
        "is_verified": False,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    logger.info("Successfully registered user id=%s email=%s", result.inserted_id, normalized_email)
    return user_doc_to_response(user_doc)


async def authenticate_user(db: AsyncIOMotorDatabase, email: str, password: str) -> UserResponse:
    """Authenticate user with email and password."""
    normalized_email = email.strip().lower()
    user = await db.users.find_one({"email": normalized_email})
    if not user:
        raise APIError(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="Invalid email or password.",
        )

    if not verify_password(password, user.get("password_hash", "")):
        raise APIError(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="Invalid email or password.",
        )

    if not user.get("is_active", True):
        raise APIError(
            status_code=403,
            code="ACCOUNT_INACTIVE",
            message="This account has been deactivated. Please contact support.",
        )

    return user_doc_to_response(user)


async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str) -> UserResponse:
    """Retrieve user by MongoDB ObjectId string."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise APIError(status_code=400, code="INVALID_USER_ID", message="Invalid user ID format.")

    user = await db.users.find_one({"_id": oid})
    if not user:
        raise APIError(status_code=404, code="USER_NOT_FOUND", message="User account not found.")

    return user_doc_to_response(user)


async def refresh_user_token(db: AsyncIOMotorDatabase, refresh_token: str) -> str:
    """Validate refresh token and issue a fresh access token."""
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise APIError(
            status_code=401,
            code="INVALID_TOKEN",
            message="Refresh token is invalid or has expired.",
        )

    token_type = payload.get("type")
    if token_type != "refresh":
        raise APIError(
            status_code=401,
            code="INVALID_TOKEN_TYPE",
            message="Invalid token type provided for refresh.",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise APIError(
            status_code=401,
            code="INVALID_TOKEN_SUBJECT",
            message="Token does not contain a valid user identity.",
        )

    # Verify user exists and is active
    user = await get_user_by_id(db, user_id)
    if not user.is_active:
        raise APIError(
            status_code=403,
            code="ACCOUNT_INACTIVE",
            message="Account is inactive.",
        )

    # Generate new access token
    new_access_token = create_access_token(subject=user.id)
    return new_access_token
