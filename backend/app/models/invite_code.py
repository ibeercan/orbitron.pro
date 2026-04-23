"""Invite code model with soft delete support."""

from datetime import datetime, timezone

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin

__all__ = ["InviteCode"]


class InviteCode(Base, TimestampMixin, SoftDeleteMixin):
    """Invite code for premium user registration."""
    __tablename__ = "invite_codes"
    __table_args__ = (
        Index("ix_ic_deleted", "deleted_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(10), unique=True)
    used: Mapped[bool] = mapped_column(default=False)
    used_email: Mapped[str | None] = mapped_column(String(255), default=None)
    used_at: Mapped[datetime | None] = mapped_column(default=None)

    @property
    def is_used(self) -> bool:
        return self.used or self.used_email is not None

    def mark_used(self, email: str) -> None:
        self.used = True
        self.used_email = email.lower()
        self.used_at = datetime.now(timezone.utc)