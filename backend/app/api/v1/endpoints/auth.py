from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.auth.schemas import Token, UserCreate, User
from app.auth.crud import user as user_crud
from app.auth.deps import get_current_active_user

router = APIRouter()

COOKIE_NAME = "access_token"
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
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    response: Response,
) -> Any:
    """
    Register a new user.
    Optional invite_code gives Premium subscription.
    """
    user = await user_crud.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    is_premium = False
    if user_in.invite_code:
        from app.invites import crud as invite_crud
        invite = await invite_crud.invite_code.get_by_code(db, code=user_in.invite_code)
        if not invite:
            raise HTTPException(
                status_code=400,
                detail="Invalid invite code.",
            )
        if invite.used:
            raise HTTPException(
                status_code=400,
                detail="Invite code already used.",
            )
        is_premium = True
    
    user = await user_crud.create(db, obj_in=user_in, is_premium=is_premium)
    
    if is_premium and invite:
        await invite_crud.invite_code.mark_used_with_email(db, invite, user.email)
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        user.email, expires_delta=access_token_expires
    )
    create_cookie_response(access_token, response)
    
    return user


@router.post("/login", response_model=Token)
async def login(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    response: Response = None,
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = await user_crud.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный email или пароль",
        )
    elif not user_crud.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Пользователь неактивен"
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        user.email, expires_delta=access_token_expires
    )
    create_cookie_response(access_token, response)
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Refresh access token.
    """
    return {
        "access_token": create_access_token(current_user.email),
        "token_type": "bearer",
    }


@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)) -> Any:
    """
    Get current user.
    """
    return current_user


@router.post("/logout")
async def logout(response: Response) -> dict:
    """
    Logout user by clearing the cookie.
    """
    response.delete_cookie(
        key=COOKIE_NAME,
        domain=settings.COOKIE_DOMAIN,
    )
    return {"message": "Logged out successfully"}