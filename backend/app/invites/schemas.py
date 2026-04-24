from pydantic import BaseModel
from datetime import datetime


class InviteCodeCreate(BaseModel):
    pass


class InviteCodeResponse(BaseModel):
    id: int
    code: str
    used: bool
    used_email: str | None = None
    created_at: datetime
    
    class Config:
        from_attributes = True


InviteCodeOut = InviteCodeResponse


class InviteCodeListResponse(BaseModel):
    codes: list[InviteCodeResponse]
