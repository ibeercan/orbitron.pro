"""Authentication endpoints."""

from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.config import settings
from app.core.constants import COOKIE_NAME
from app.core.security import create_access_token
from app.auth.schemas import Token, UserCreate, User
from app.auth.crud import user as user_crud
from app.auth.deps import get_current_active_user

router = APIRouter()

COOKIE_MAX_AGE = 60 * settings.ACCESS_TOKEN_EXPIRE_MINUTES


def create_cookie_response(token: str, response: Response) -> Response:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        domain=settings.COOKIE_DOMAIN,
    )
    return response


@router.post("/register", response_model=User)
async def register(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    user_in: UserCreate,
    response: Response,
) -> User:
    """Register a new user. Optional invite_code gives Premium subscription."""
    user = await user_crud.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    is_premium = False
    invite = None
    if user_in.invite_code:
        from app.invites.crud import invite_code_crud

        invite = await invite_code_crud.get_by_code(db, code=user_in.invite_code)
        if not invite:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid invite code.",
            )
        if invite.used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite code already used.",
            )
        is_premium = True

    user = await user_crud.create(db, obj_in=user_in, is_premium=is_premium)

    if is_premium and invite:
        await invite_code_crud.mark_used_with_email(db, invite, user.email)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(user.email, expires_delta=access_token_expires)
    create_cookie_response(token, response)

    return user


@router.post("/login", response_model=Token)
async def login(
    db: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    response: Response,
) -> Token:
    """OAuth2 compatible token login."""
    user = await user_crud.authenticate(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user_crud.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(user.email, expires_delta=access_token_expires)
    create_cookie_response(token, response)
    return Token(access_token=token, token_type="bearer")


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> Token:
    """Refresh access token."""
    token = create_access_token(current_user.email)
    return Token(access_token=token, token_type="bearer")


@router.get("/me", response_model=User)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """Get current user."""
    return current_user


@router.post("/logout")
async def logout(response: Response) -> dict:
    """Logout user by clearing the cookie."""
    response.delete_cookie(
        key=COOKIE_NAME,
        domain=settings.COOKIE_DOMAIN,
    )
    return {"message": "Logged out successfully"}