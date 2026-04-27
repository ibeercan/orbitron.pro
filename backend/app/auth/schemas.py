"""Authentication schemas."""

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

__all__ = ["LoginResponse", "TokenData", "UserCreate", "UserLogin", "User"]


class LoginResponse(BaseModel):
    message: str = "Login successful"
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: str | None = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    invite_code: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    id: int
    email: EmailStr
    subscription_type: str
    subscription_end: str | None
    is_active: bool
    is_admin: bool = False
    onboarding_completed: bool = False
    is_subscription_active: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}