from pydantic import BaseModel, validator
from typing import Optional


class ChartCreate(BaseModel):
    datetime: str
    location: str
    theme: Optional[str] = "classic"
    house_system: Optional[str] = "placidus"
    preset: Optional[str] = "detailed"
    zodiac_palette: Optional[str] = "rainbow"

    @validator("preset")
    def validate_preset(cls, v):
        if v not in ["minimal", "standard", "detailed"]:
            raise ValueError("Preset must be one of: minimal, standard, detailed")
        return v

    @validator("zodiac_palette")
    def validate_palette(cls, v):
        if v not in ["rainbow", "elemental", "cardinality", "grey"]:
            raise ValueError("Palette must be one of: rainbow, elemental, cardinality, grey")
        return v

    @validator("datetime")
    def validate_datetime(cls, v):
        # Basic ISO format validation
        try:
            from datetime import datetime
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError("Datetime must be in ISO format (e.g., 2000-01-01T12:00:00)")
        return v


class Chart(BaseModel):
    id: str
    native_data: dict
    result_data: dict
    svg_path: str
    prompt_text: str

    class Config:
        from_attributes = True