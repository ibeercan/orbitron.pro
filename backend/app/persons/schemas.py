"""Person schemas."""

from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class PersonCreate(BaseModel):
    name: str
    datetime: str
    location: str

    @field_validator("datetime")
    @classmethod
    def validate_datetime(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError("Datetime must be in ISO format (e.g., 2000-01-01T12:00:00)")
        return v


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    datetime: Optional[str] = None
    location: Optional[str] = None

    @field_validator("datetime")
    @classmethod
    def validate_datetime(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError("Datetime must be in ISO format (e.g., 2000-01-01T12:00:00)")
        return v


class PersonResponse(BaseModel):
    id: int
    name: str
    datetime: str
    location: str
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def parse_datetime(cls, v):
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v

    model_config = {"from_attributes": True}
