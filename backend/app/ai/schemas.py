from pydantic import BaseModel
from typing import Optional


class AIInterpretRequest(BaseModel):
    question: Optional[str] = None
    request_type: str = "personality"  # personality, prognosis, compatibility


class AIInterpretResponse(BaseModel):
    interpretation: str
    request_type: str