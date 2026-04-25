from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


EVENT_TYPES = {
    "career", "relationship", "relocation", "health", "family",
    "education", "financial", "spiritual", "legal", "travel", "other",
}


class RectificationEvent(BaseModel):
    date: str
    event_type: str
    description: Optional[str] = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError("Date must be in ISO format (e.g., 2000-06-15)")
        return v

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if v not in EVENT_TYPES:
            raise ValueError(f"event_type must be one of: {', '.join(sorted(EVENT_TYPES))}")
        return v


class RectificationRequest(BaseModel):
    birth_date: str
    location: str
    events: list[RectificationEvent]
    house_system: Optional[str] = "placidus"
    step_minutes: Optional[int] = 4

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError("birth_date must be in ISO format (e.g., 1990-03-15)")
        return v

    @field_validator("events")
    @classmethod
    def validate_events(cls, v: list) -> list:
        if len(v) < 1:
            raise ValueError("At least one event is required")
        if len(v) > 20:
            raise ValueError("Maximum 20 events allowed")
        return v

    @field_validator("step_minutes")
    @classmethod
    def validate_step(cls, v: int) -> int:
        if v < 1 or v > 30:
            raise ValueError("step_minutes must be between 1 and 30")
        return v


class MatchedAspect(BaseModel):
    planet: str
    natal_point: str
    aspect: str
    orb: float
    technique: str


class MatchedEvent(BaseModel):
    event_date: str
    event_type: str
    event_description: Optional[str] = None
    score: float
    matched_aspects: list[MatchedAspect] = []


class RectificationCandidate(BaseModel):
    birth_time: str
    asc_degree: float
    mc_degree: float
    asc_sign: str
    mc_sign: str
    total_score: float
    matched_events: list[MatchedEvent]


class RectificationResponse(BaseModel):
    candidates: list[RectificationCandidate]
    event_count: int
    step_minutes: int
    computation_time_ms: float


class RectificationPollResponse(BaseModel):
    status: str
    progress: int = 0
    result: Optional[dict] = None
    error: Optional[str] = None
