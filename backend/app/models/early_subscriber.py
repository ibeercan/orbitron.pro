"""Early subscriber model with soft delete support."""

from datetime import datetime

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin

__all__ = ["EarlySubscriber"]


class EarlySubscriber(Base, TimestampMixin, SoftDeleteMixin):
    """Early subscriber for landing page sign-ups.
    
    Tracks users who signed up for early access before launch.
    """
    __tablename__ = "early_subscribers"
    __table_args__ = (
        Index("ix_es_email", "email"),
        Index("ix_es_deleted", "deleted_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    source: Mapped[str | None] = mapped_column(String(100), default=None)
    ip_address: Mapped[str | None] = mapped_column(String(45), default=None)
    invited_by: Mapped[int | None] = mapped_column(default=None)

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "email": self.email,
            "source": self.source,
            "subscribed_at": (
                self.created_at.isoformat() if self.created_at else None
            ),
        }