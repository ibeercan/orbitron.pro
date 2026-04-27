"""Authentication endpoints."""

import hashlib
from datetime import timedelta, timezone, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.config import settings
from app.core.constants import COOKIE_NAME, REFRESH_COOKIE_NAME
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.auth.schemas import LoginResponse, UserCreate, User
from app.auth.crud import user as user_crud
from app.auth.deps import get_current_active_user
from app.models.refresh_token import RefreshToken
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)

ACCESS_COOKIE_MAX_AGE = 60 * settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * settings.REFRESH_TOKEN_EXPIRE_DAYS


def _set_access_cookie(token: str, response: Response) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=ACCESS_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )


def _set_refresh_cookie(token: str, response: Response) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        domain=settings.COOKIE_DOMAIN,
        path="/api/v1/auth",
    )


def _clear_cookies(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, domain=settings.COOKIE_DOMAIN, path="/")
    response.delete_cookie(key=REFRESH_COOKIE_NAME, domain=settings.COOKIE_DOMAIN, path="/api/v1/auth")


async def _create_tokens_and_cookies(user_email: str, response: Response, db: AsyncSession) -> LoginResponse:
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(user_email, expires_delta=access_token_expires)
    refresh_token_str = create_refresh_token(user_email)

    token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()
    user_obj = await user_crud.get_by_email(db, email=user_email)
    refresh_token = RefreshToken(
        user_id=user_obj.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token)
    await db.flush()

    _set_access_cookie(access_token, response)
    _set_refresh_cookie(refresh_token_str, response)

    return LoginResponse(message="Login successful")


@router.post("/register", response_model=User)
@limiter.limit("5/minute")
async def register(
    request: Request,
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

    await _create_tokens_and_cookies(user.email, response, db)
    await db.commit()

    return user


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    response: Response,
) -> LoginResponse:
    """OAuth2 compatible token login. Sets httpOnly cookies for access and refresh tokens."""
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

    result = await _create_tokens_and_cookies(user.email, response, db)
    await db.commit()
    return result


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    response: Response,
) -> LoginResponse:
    """Refresh access token using refresh token cookie."""
    refresh_token_str = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    try:
        payload = decode_token(refresh_token_str)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        email = payload.get("sub")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
        )
    )
    stored_token = result.scalar_one_or_none()

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked",
        )

    now = datetime.now(timezone.utc)
    if stored_token.expires_at.replace(tzinfo=timezone.utc) < now:
        stored_token.revoked_at = now
        await db.flush()
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    stored_token.revoked_at = now
    await db.flush()

    user = await user_crud.get_by_email(db, email=email)
    if not user or not user_crud.is_active(user):
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    result = await _create_tokens_and_cookies(user.email, response, db)
    await db.commit()
    return result


@router.get("/me", response_model=User)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """Get current user."""
    return current_user


@router.post("/onboarding-complete", response_model=User)
async def complete_onboarding(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """Mark onboarding as completed for the current user."""
    if not current_user.onboarding_completed:
        current_user.onboarding_completed = True
        await db.commit()
        await db.refresh(current_user)
    return current_user


@router.post("/logout")
async def logout(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    response: Response,
) -> dict:
    """Logout user by clearing cookies and revoking refresh token."""
    refresh_token_str = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token_str:
        token_hash = hashlib.sha256(refresh_token_str.encode()).hexdigest()
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        stored_token = result.scalar_one_or_none()
        if stored_token and stored_token.revoked_at is None:
            stored_token.revoked_at = datetime.now(timezone.utc)
            await db.commit()

    _clear_cookies(response)
    return {"message": "Logged out successfully"}