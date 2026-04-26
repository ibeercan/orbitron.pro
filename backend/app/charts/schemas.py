import re
from pydantic import BaseModel, field_validator, computed_field
from typing import Optional
from datetime import datetime

VALID_THEMES = {
    "classic", "dark", "midnight", "celestial", "neon", "sepia", "pastel",
    "viridis", "plasma", "inferno", "magma", "cividis", "turbo",
}

VALID_PALETTES = {
    "auto",
    "grey", "rainbow", "elemental", "cardinality",
    "rainbow_dark", "rainbow_midnight", "rainbow_celestial",
    "rainbow_neon", "rainbow_sepia",
}

VALID_HOUSE_SYSTEMS = {"placidus", "whole_sign", "regiomontanus"}


class ChartCreate(BaseModel):
    datetime: str
    location: str
    name: Optional[str] = None
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

    @field_validator("house_system")
    @classmethod
    def validate_house_system(cls, v: str) -> str:
        if v not in VALID_HOUSE_SYSTEMS:
            raise ValueError(f"house_system must be one of: {', '.join(sorted(VALID_HOUSE_SYSTEMS))}")
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


class SynastryCreate(BaseModel):
    natal_chart_id: int
    person_id: Optional[int] = None
    person2_datetime: Optional[str] = None
    person2_location: Optional[str] = None
    person2_name: Optional[str] = None
    theme: Optional[str] = "midnight"

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in VALID_THEMES:
            raise ValueError(f"Theme must be one of: {', '.join(sorted(VALID_THEMES))}")
        return v

    @field_validator("person2_datetime")
    @classmethod
    def validate_datetime(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError("Datetime must be in ISO format (e.g., 2000-01-01T12:00:00)")
        return v


class TransitCreate(BaseModel):
    natal_chart_id: int
    transit_datetime: Optional[str] = None
    theme: Optional[str] = "midnight"

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in VALID_THEMES:
            raise ValueError(f"Theme must be one of: {', '.join(sorted(VALID_THEMES))}")
        return v

    @field_validator("transit_datetime")
    @classmethod
    def validate_datetime(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError("Datetime must be in ISO format (e.g., 2000-01-01T12:00:00)")
        return v


class SolarReturnCreate(BaseModel):
    natal_chart_id: int
    year: Optional[int] = None
    location_override: Optional[str] = None
    theme: Optional[str] = "midnight"

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in VALID_THEMES:
            raise ValueError(f"Theme must be one of: {', '.join(sorted(VALID_THEMES))}")
        return v


class LunarReturnCreate(BaseModel):
    natal_chart_id: int
    near_date: Optional[str] = None
    theme: Optional[str] = "midnight"

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in VALID_THEMES:
            raise ValueError(f"Theme must be one of: {', '.join(sorted(VALID_THEMES))}")
        return v

    @field_validator("near_date")
    @classmethod
    def validate_date(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError("Date must be in ISO format")
        return v


class SolarArcCreate(BaseModel):
    natal_chart_id: int
    target_date: Optional[str] = None
    age: Optional[int] = None
    theme: Optional[str] = "midnight"

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in VALID_THEMES:
            raise ValueError(f"Theme must be one of: {', '.join(sorted(VALID_THEMES))}")
        return v

    @field_validator("target_date")
    @classmethod
    def validate_date(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError("Date must be in ISO format")
        return v


class ProgressionCreate(BaseModel):
    natal_chart_id: int
    target_date: Optional[str] = None
    age: Optional[int] = None
    theme: Optional[str] = "midnight"

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in VALID_THEMES:
            raise ValueError(f"Theme must be one of: {', '.join(sorted(VALID_THEMES))}")
        return v

    @field_validator("target_date")
    @classmethod
    def validate_date(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError("Date must be in ISO format")
        return v


class CompositeCreate(BaseModel):
    natal_chart_id: int
    person_id: Optional[int] = None
    person2_datetime: Optional[str] = None
    person2_location: Optional[str] = None
    person2_name: Optional[str] = None
    synthesis_type: Optional[str] = "composite"
    theme: Optional[str] = "midnight"

    @field_validator("synthesis_type")
    @classmethod
    def validate_synthesis_type(cls, v: str) -> str:
        if v not in ("composite", "davison"):
            raise ValueError("synthesis_type must be 'composite' or 'davison'")
        return v

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in VALID_THEMES:
            raise ValueError(f"Theme must be one of: {', '.join(sorted(VALID_THEMES))}")
        return v

    @field_validator("person2_datetime")
    @classmethod
    def validate_datetime(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError("Datetime must be in ISO format (e.g., 2000-01-01T12:00:00)")
        return v


class HoraryCreate(BaseModel):
    datetime: str
    location: str
    question: str
    name: Optional[str] = None
    theme: Optional[str] = "midnight"
    house_system: Optional[str] = "regiomontanus"
    preset: Optional[str] = "detailed"
    zodiac_palette: Optional[str] = "auto"

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in VALID_THEMES:
            raise ValueError(f"Theme must be one of: {', '.join(sorted(VALID_THEMES))}")
        return v

    @field_validator("house_system")
    @classmethod
    def validate_house_system(cls, v: str) -> str:
        if v not in VALID_HOUSE_SYSTEMS:
            raise ValueError(f"house_system must be one of: {', '.join(sorted(VALID_HOUSE_SYSTEMS))}")
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


class ProfectionCreate(BaseModel):
    natal_chart_id: int
    target_date: Optional[str] = None
    age: Optional[int] = None
    rulership: Optional[str] = "traditional"

    @field_validator("rulership")
    @classmethod
    def validate_rulership(cls, v: str) -> str:
        if v not in ("traditional", "modern"):
            raise ValueError("rulership must be 'traditional' or 'modern'")
        return v


class Chart(BaseModel):
    id: int
    name: Optional[str] = None
    chart_type: str = "natal"
    parent_chart_id: Optional[int] = None
    person_id: Optional[int] = None
    native_data: dict
    result_data: dict
    svg_data: Optional[str] = None
    svg_path: Optional[str] = None
    prompt_text: Optional[str] = None
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def parse_datetime(cls, v):
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

    model_config = {"from_attributes": True}


class ProfectionResponse(BaseModel):
    chart: Chart
    profected_house: int
    profected_sign: str
    ruler: str
    ruler_house: int | None = None
    ruler_position: dict | None = None
    planets_in_house: list[str] = []


class TransitTimelineEntry(BaseModel):
    transit_planet: str
    natal_planet: str
    aspect_name: str
    exact_dates: list[str] = []
    is_multi_pass: bool = False
    duration_days: float | None = None


class TransitTimelineResponse(BaseModel):
    entries: list[TransitTimelineEntry]


class AstroTwinResult(BaseModel):
    name: str
    category: str
    category_ru: str
    notable_for: str
    score: float
    year: int
    shared_features: list[str] = []
    key_aspects: list[str] = []


class AstroTwinsResponse(BaseModel):
    status: str
    results: list[AstroTwinResult] = []
    error: Optional[str] = None


class HistoricalParallelResult(BaseModel):
    name: str
    year: int
    notable_for: str
    score: float
    key_aspects: list[str] = []


class HistoricalParallelsResponse(BaseModel):
    status: str
    results: list[HistoricalParallelResult] = []
    error: Optional[str] = None


class NotableEventInfo(BaseModel):
    name: str
    year: int
    subcategories: list[str] = []
    notable_for: str
    location_name: str


class NotableEventsResponse(BaseModel):
    events: list[NotableEventInfo]
