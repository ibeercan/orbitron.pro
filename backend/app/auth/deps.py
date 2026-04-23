"""Authentication dependencies."""

from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import COOKIE_NAME
from app.core.security import decode_token, ACCESS_TOKEN_TYPE
from app.db.session import get_db
from app.core.config import settings
from app.models.user import User
from app.auth.crud import user as user_crud
from app.auth.schemas import TokenData


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    access_token: Annotated[str | None, Cookie()] = None,
) -> User:
    """Get current authenticated user from access token cookie."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not access_token:
        raise credentials_exception

    try:
        payload = decode_token(access_token)
        if payload.get("type") != ACCESS_TOKEN_TYPE:
            raise credentials_exception
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    user = await user_crud.get_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Verify that the current user is active."""
    if not user_crud.is_active(current_user):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return current_user