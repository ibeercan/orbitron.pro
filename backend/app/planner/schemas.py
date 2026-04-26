"""Planner generation schemas."""

from pydantic import BaseModel, field_validator
from typing import Optional, Literal
from datetime import date


VALID_PLANNER_PRESETS = {"minimal", "standard", "full"}
VALID_PLANNER_PAGE_SIZES = {"a4", "a5", "letter"}
VALID_PLANNER_WEEK_STARTS = {"sunday", "monday"}
VALID_ZR_LOTS = {"Part of Fortune", "Part of Spirit"}
VALID_EPHEMERIS_HARMONICS = {360, 90, 45}
VALID_VOC_MODES = {"traditional", "modern"}


class PlannerGenerateRequest(BaseModel):
    chart_id: int
    year: int
    preset: str = "standard"
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    page_size: str = "a4"
    week_starts_on: str = "monday"
    binding_margin: Optional[float] = None

    front_natal: bool = True
    front_progressed: bool = False
    front_solar_return: bool = False
    front_profections: bool = False
    front_zr_timeline: bool = False
    front_zr_lot: str = "Part of Fortune"
    front_ephemeris: bool = False
    front_ephemeris_harmonic: int = 360

    include_natal_transits: bool = True
    include_natal_transits_outer_only: bool = True
    include_mundane_transits: bool = False
    include_moon_phases: bool = True
    include_voc: bool = True
    include_voc_mode: str = "traditional"
    include_ingresses: bool = False
    include_stations: bool = True

    @field_validator("preset")
    @classmethod
    def validate_preset(cls, v: str) -> str:
        if v not in VALID_PLANNER_PRESETS:
            raise ValueError(f"preset must be one of: {', '.join(sorted(VALID_PLANNER_PRESETS))}")
        return v

    @field_validator("page_size")
    @classmethod
    def validate_page_size(cls, v: str) -> str:
        if v not in VALID_PLANNER_PAGE_SIZES:
            raise ValueError(f"page_size must be one of: {', '.join(sorted(VALID_PLANNER_PAGE_SIZES))}")
        return v

    @field_validator("week_starts_on")
    @classmethod
    def validate_week_starts_on(cls, v: str) -> str:
        if v not in VALID_PLANNER_WEEK_STARTS:
            raise ValueError(f"week_starts_on must be one of: {', '.join(sorted(VALID_PLANNER_WEEK_STARTS))}")
        return v

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        current = date.today().year
        if v < current or v > current + 5:
            raise ValueError(f"year must be between {current} and {current + 5}")
        return v

    @field_validator("front_zr_lot")
    @classmethod
    def validate_zr_lot(cls, v: str) -> str:
        if v not in VALID_ZR_LOTS:
            raise ValueError(f"front_zr_lot must be one of: {', '.join(sorted(VALID_ZR_LOTS))}")
        return v

    @field_validator("front_ephemeris_harmonic")
    @classmethod
    def validate_ephemeris_harmonic(cls, v: int) -> int:
        if v not in VALID_EPHEMERIS_HARMONICS:
            raise ValueError(f"front_ephemeris_harmonic must be one of: {', '.join(str(h) for h in sorted(VALID_EPHEMERIS_HARMONICS))}")
        return v

    @field_validator("include_voc_mode")
    @classmethod
    def validate_voc_mode(cls, v: str) -> str:
        if v not in VALID_VOC_MODES:
            raise ValueError(f"include_voc_mode must be one of: {', '.join(sorted(VALID_VOC_MODES))}")
        return v

    @field_validator("binding_margin")
    @classmethod
    def validate_binding_margin(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (v < 0 or v > 2):
            raise ValueError("binding_margin must be between 0 and 2 inches")
        return v


class PlannerPollResponse(BaseModel):
    planner_id: int
    status: str
    progress: int = 0
    download_url: Optional[str] = None
    error: Optional[str] = None