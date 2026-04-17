from pydantic import BaseModel, field_validator, computed_field
from typing import Optional
from datetime import datetime


VALID_THEMES = {
    "classic", "dark", "midnight", "celestial", "neon", "sepia", "pastel",
    "viridis", "plasma", "inferno", "magma", "cividis", "turbo",
}

VALID_PALETTES = {
    "auto",  # auto-select matching palette for theme
    "grey", "rainbow", "elemental", "cardinality",
    "rainbow_dark", "rainbow_midnight", "rainbow_celestial",
    "rainbow_neon", "rainbow_sepia",
}


class ChartCreate(BaseModel):
    datetime: str
    location: str
    theme: Optional[str] = "midnight"
    house_system: Optional[str] = "placidus"
    preset: Optional[str] = "detailed"
    zodiac_palette: Optional[str] = "auto"

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in VALID_THEMES:
            raise ValueError(f"Theme must be one of: {', '.join(sorted(VALID_THEMES))}")
        return v

    @field_validator("preset")
    @classmethod
    def validate_preset(cls, v: str) -> str:
        if v not in ["minimal", "standard", "detailed"]:
            raise ValueError("Preset must be one of: minimal, standard, detailed")
        return v

    @field_validator("zodiac_palette")
    @classmethod
    def validate_palette(cls, v: str) -> str:
        if v not in VALID_PALETTES:
            raise ValueError(f"Palette must be one of: {', '.join(sorted(VALID_PALETTES))}")
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
    svg_data: Optional[str] = None   # base64-encoded SVG (new)
    svg_path: Optional[str] = None   # legacy field, kept for backward compat
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
