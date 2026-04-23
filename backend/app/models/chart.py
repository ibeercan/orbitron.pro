"""Natal chart model with soft delete support."""

from datetime import datetime

from sqlalchemy import ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin

__all__ = ["Chart"]


class Chart(Base, TimestampMixin, SoftDeleteMixin):
    """Natal astrology chart model.
    
    Stores chart data, SVG, and prompt text for AI interpretation.
    """
    __tablename__ = "charts"
    __table_args__ = (
        Index("ix_chart_user", "user_id"),
        Index("ix_chart_deleted", "deleted_at"),
        Index("ix_chart_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    native_data: Mapped[dict] = mapped_column(JSON)
    result_data: Mapped[dict] = mapped_column(JSON)
    svg_data: Mapped[str | None] = mapped_column(Text, default=None)
    svg_path: Mapped[str | None] = mapped_column(String(500), default=None)
    prompt_text: Mapped[str | None] = mapped_column(Text, default=None)

    user = relationship("User", back_populates="charts")
    chat_sessions = relationship(
        "ChatSession",
        back_populates="chart",
        primaryjoin="and_(Chart.id == ChatSession.chart_id, ChatSession.deleted_at.is_(None))",
        viewonly=True,
    )

    def to_dict(self, include_svg: bool = False) -> dict:
        """Convert to dictionary.
        
        Args:
            include_svg: Include SVG data (large payload).
        """
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "native_data": self.native_data,
            "result_data": self.result_data,
            "svg_data": self.svg_data if include_svg else None,
            "prompt_text": self.prompt_text,
            "created_at": (
                self.created_at.isoformat() if self.created_at else None
            ),
        }
        return result