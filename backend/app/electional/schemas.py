"""Electional searches — find auspicious moments for activities."""

from pydantic import BaseModel, field_validator
from typing import Optional, Literal
from datetime import datetime


VALID_PRESETS = {
    "general", "business", "relationship", "contracts", "competition", "expansion",
}

VALID_CONDITIONS = {
    "moon_waxing", "moon_not_voc", "moon_not_combust",
    "moon_not_in_difficult_signs", "mercury_not_rx", "venus_not_rx",
    "jupiter_not_rx", "mars_not_rx", "no_malefic_to_moon",
    "no_hard_to_moon", "moon_applying_benefics",
    "jupiter_well_placed", "mars_not_debilitated",
}

VALID_STEPS = {"minute", "hour", "4hour", "day"}


class ElectionalSearchRequest(BaseModel):
    location: str
    start_date: str
    end_date: str
    preset: str = "general"
    conditions: list[str] = []
    step: str = "4hour"
    house_system: str = "regiomontanus"

    @field_validator("preset")
    @classmethod
    def validate_preset(cls, v: str) -> str:
        if v not in VALID_PRESETS:
            raise ValueError(f"preset must be one of: {', '.join(sorted(VALID_PRESETS))}")
        return v

    @field_validator("conditions")
    @classmethod
    def validate_conditions(cls, v: list[str]) -> list[str]:
        for c in v:
            if c not in VALID_CONDITIONS:
                raise ValueError(f"Unknown condition: {c}")
        return v

    @field_validator("step")
    @classmethod
    def validate_step(cls, v: str) -> str:
        if v not in VALID_STEPS:
            raise ValueError(f"step must be one of: {', '.join(sorted(VALID_STEPS))}")
        return v

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError("start_date must be in ISO format (e.g., 2026-05-01)")
        return v

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError("end_date must be in ISO format (e.g., 2026-06-30)")
        return v


class ElectionalMomentResult(BaseModel):
    datetime: str
    moon_sign: str | None = None
    moon_phase: str | None = None
    conditions_met: list[str] = []
    conditions_missed: list[str] = []
    score: int = 0
    description: str = ""


class ElectionalSearchResponse(BaseModel):
    search_id: int
    status: str = "computing"
    progress: int = 0
    result: list[ElectionalMomentResult] | None = None
    error: str | None = None


class ElectionalSelectRequest(BaseModel):
    search_id: int
    moment_index: int
    name: Optional[str] = None
    theme: str = "midnight"
    house_system: str = "regiomontanus"