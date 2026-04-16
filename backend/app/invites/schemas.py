from pydantic import BaseModel
from datetime import datetime


class InviteCodeCreate(BaseModel):
    email: str


class InviteCodeResponse(BaseModel):
    id: int
    code: str
    email: str
    used: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class InviteCodeListResponse(BaseModel):
    codes: list[InviteCodeResponse]
