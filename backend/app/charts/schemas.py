from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class ChartCreate(BaseModel):
    datetime: str
    location: str
    theme: Optional[str] = "classic"
    house_system: Optional[str] = "placidus"
    preset: Optional[str] = "detailed"
    zodiac_palette: Optional[str] = "rainbow"

    @field_validator("preset")
    @classmethod
    def validate_preset(cls, v: str) -> str:
        if v not in ["minimal", "standard", "detailed"]:
            raise ValueError("Preset must be one of: minimal, standard, detailed")
        return v

    @field_validator("zodiac_palette")
    @classmethod
    def validate_palette(cls, v: str) -> str:
        if v not in ["rainbow", "elemental", "cardinality", "grey"]:
            raise ValueError("Palette must be one of: rainbow, elemental, cardinality, grey")
        return v

    @field_validator("datetime")
    @classmethod
    def validate_datetime(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError("Datetime must be in ISO format (e.g., 2000-01-01T12:00:00)")
        return v


class Chart(BaseModel):
    id: int
    native_data: dict
    result_data: dict
    svg_path: str
    prompt_text: str
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def parse_datetime(cls, v):
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

    class Config:
        from_attributes = True