from pydantic import BaseModel, EmailStr
from typing import Optional


class SubscribeRequest(BaseModel):
    email: EmailStr
    invite_code: Optional[str] = None


class SubscribeResponse(BaseModel):
    message: str
    success: bool