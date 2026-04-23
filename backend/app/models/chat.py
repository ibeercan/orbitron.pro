"""Chat models with soft delete support."""

from datetime import datetime
from enum import Enum

from sqlalchemy import Enum as SQLEnum, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin
from app.models.user import _enum_values

__all__ = ["ChatSession", "ChatMessage", "MessageRole"]


class MessageRole(str, Enum):
    """Message sender role."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatSession(Base, TimestampMixin, SoftDeleteMixin):
    """Chat session for AI conversation about a chart."""
    __tablename__ = "chat_sessions"
    __table_args__ = (
        Index("ix_cs_user", "user_id"),
        Index("ix_cs_chart", "chart_id"),
        Index("ix_cs_deleted", "deleted_at"),
        Index("ix_cs_user_chart", "user_id", "chart_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    chart_id: Mapped[int] = mapped_column(ForeignKey("charts.id"))
    title: Mapped[str | None] = mapped_column(String(255), default=None)

    user = relationship("User", back_populates="chat_sessions")
    chart = relationship("Chart", back_populates="chat_sessions")
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        passive_deletes=True,
        order_by="ChatMessage.created_at",
    )


class ChatMessage(Base, TimestampMixin):
    """Individual message in a chat session."""
    __tablename__ = "chat_messages"
    __table_args__ = (
        Index("ix_cm_session", "session_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE")
    )
    role: Mapped[str] = mapped_column(
        SQLEnum(MessageRole, values_callable=_enum_values, name="message_role_enum"),
    )
    content: Mapped[str] = mapped_column(Text)

    session = relationship("ChatSession", back_populates="messages")