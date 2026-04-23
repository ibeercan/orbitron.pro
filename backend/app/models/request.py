"""Request log model for analytics."""

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin

__all__ = ["RequestLog"]


class RequestLog(Base, TimestampMixin):
    """Request log for analytics and rate limiting.
    
    Tracks API endpoint usage per user for rate limiting and analytics.
    """
    __tablename__ = "request_logs"
    __table_args__ = (
        Index("ix_request_logs_user", "user_id"),
        Index("ix_request_logs_chart", "chart_id"),
        Index("ix_request_logs_endpoint", "endpoint"),
        Index("ix_request_logs_timestamp", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    chart_id: Mapped[int | None] = mapped_column(
        ForeignKey("charts.id"), index=True, default=None
    )
    endpoint: Mapped[str] = mapped_column(String(255), index=True)
    method: Mapped[str] = mapped_column(String(10), default="GET")