from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.core.errors import APIError, success_response
from app.core.security import create_access_token, create_refresh_token
from app.models.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenRefreshRequest,
)
from app.modules.auth import service as auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED, summary="Register user account")
async def register(user_in: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Create a new user account."""
    user = await auth_service.register_user(db, user_in)
    return success_response(
        data={"user": user.model_dump(mode="json")},
        message="User account created successfully.",
    )


@router.post("/login", summary="User login")
async def login(
    user_in: UserLogin,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Authenticate user with email and password, returning JWT access and refresh tokens."""
    user = await auth_service.authenticate_user(db, email=user_in.email, password=user_in.password)

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    # Deliver refresh token in a secure HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return success_response(
        data={
            "user": user.model_dump(mode="json"),
            "access_token": access_token,
            "token_type": "bearer",
            "refresh_token": refresh_token,
        },
        message="Login successful.",
    )


@router.post("/refresh", summary="Refresh access token")
async def refresh_token(
    request: Request,
    payload: Optional[TokenRefreshRequest] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Obtain a new access token using a valid refresh token from cookie or request body."""
    token = request.cookies.get("refresh_token")
    if not token and payload and payload.refresh_token:
        token = payload.refresh_token

    if not token:
        raise APIError(
            status_code=401,
            code="MISSING_REFRESH_TOKEN",
            message="No refresh token provided in cookies or request body.",
        )

    new_access_token = await auth_service.refresh_user_token(db, token)
    return success_response(
        data={
            "access_token": new_access_token,
            "token_type": "bearer",
        }
    )


@router.post("/logout", summary="Logout user")
async def logout(response: Response):
    """Clear user session cookies."""
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )
    return success_response(
        data={"message": "Logged out successfully"},
        message="User logged out.",
    )


@router.get("/me", summary="Get current user profile")
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve profile of the currently authenticated user."""
    return success_response(data=current_user.model_dump(mode="json"))
