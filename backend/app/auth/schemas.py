"""Authentication schemas."""

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

__all__ = ["LoginResponse", "TokenData", "UserCreate", "UserLogin", "User",
            "RegisterResponse", "ResendVerificationRequest",
            "ForgotPasswordRequest", "ResetPasswordRequest", "ChangePasswordRequest"]


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
            raise ValueError("Пароль должен содержать хотя бы одну заглавную букву")
        if not re.search(r"[a-z]", v):
            raise ValueError("Пароль должен содержать хотя бы одну строчную букву")
        if not re.search(r"\d", v):
            raise ValueError("Пароль должен содержать хотя бы одну цифру")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    message: str
    email: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Пароль должен содержать хотя бы одну заглавную букву")
        if not re.search(r"[a-z]", v):
            raise ValueError("Пароль должен содержать хотя бы одну строчную букву")
        if not re.search(r"\d", v):
            raise ValueError("Пароль должен содержать хотя бы одну цифру")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Пароль должен содержать хотя бы одну заглавную букву")
        if not re.search(r"[a-z]", v):
            raise ValueError("Пароль должен содержать хотя бы одну строчную букву")
        if not re.search(r"\d", v):
            raise ValueError("Пароль должен содержать хотя бы одну цифру")
        return v


class User(BaseModel):
    id: int
    email: EmailStr
    subscription_type: str
    subscription_end: str | None
    is_active: bool
    is_admin: bool = False
    onboarding_completed: bool = False
    is_subscription_active: bool = False
    email_verified: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}