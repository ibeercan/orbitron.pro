from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.chat import MessageRole


class ChatMessageResponse(BaseModel):
    id: int
    role: MessageRole
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionResponse(BaseModel):
    id: int
    chart_id: int
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: list[ChatMessageResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ChatSessionListItemResponse(BaseModel):
    id: int
    chart_id: int
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionListResponse(BaseModel):
    sessions: list[ChatSessionListItemResponse]


class StartChatRequest(BaseModel):
    title: Optional[str] = None


class StreamMessageRequest(BaseModel):
    content: str
    analysis_types: list[str] | None = None