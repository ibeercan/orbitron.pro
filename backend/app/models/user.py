"""User model with soft delete and audit support."""

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Enum as SQLEnum, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import AuditMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["User", "SubscriptionType"]


def _enum_values(enum_class):
    """Return lowercase enum values for SQLAlchemy SQLEnum (PostgreSQL & SQLite compatible)."""
    return [e.value for e in enum_class]


class SubscriptionType(str, Enum):
    """User subscription tier."""
    FREE = "free"
    PREMIUM = "premium"


class User(Base, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """User account model.

    Supports soft delete for GDPR compliance and audit trail.
    """
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_deleted", "deleted_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(default=False)
    subscription_type: Mapped[str] = mapped_column(
        SQLEnum(SubscriptionType, values_callable=_enum_values, name="subscription_type_enum"),
        default=SubscriptionType.FREE.value,
    )
    subscription_end: Mapped[datetime | None] = mapped_column(default=None)
    is_active: Mapped[bool] = mapped_column(default=True)
    onboarding_completed: Mapped[bool] = mapped_column(default=False)
    email_verified: Mapped[bool] = mapped_column(default=False)
    verification_token: Mapped[str | None] = mapped_column(String(255), default=None, index=True)
    verification_token_expires: Mapped[datetime | None] = mapped_column(default=None)

    subscriptions = relationship(
        "Subscription",
        back_populates="user",
        primaryjoin="and_(User.id == Subscription.user_id, Subscription.deleted_at.is_(None))",
        viewonly=True,
    )
    payments = relationship(
        "Payment",
        back_populates="user",
        primaryjoin="and_(User.id == Payment.user_id, Payment.deleted_at.is_(None))",
        viewonly=True,
    )
    charts = relationship(
        "Chart",
        back_populates="user",
        primaryjoin="and_(User.id == Chart.user_id, Chart.deleted_at.is_(None))",
        viewonly=True,
    )
    chat_sessions = relationship(
        "ChatSession",
        back_populates="user",
        primaryjoin="and_(User.id == ChatSession.user_id, ChatSession.deleted_at.is_(None))",
        viewonly=True,
    )
    persons = relationship(
        "Person",
        back_populates="user",
        primaryjoin="and_(User.id == Person.user_id, Person.deleted_at.is_(None))",
        viewonly=True,
    )

    @property
    def is_premium(self) -> bool:
        """Check if user has premium subscription."""
        return self.subscription_type == SubscriptionType.PREMIUM.value

    @property
    def is_subscription_active(self) -> bool:
        """Check if premium subscription is still valid (timezone-aware)."""
        if self.subscription_type != SubscriptionType.PREMIUM.value:
            return False
        if self.subscription_end is None:
            return True
        end_utc = (
            self.subscription_end.replace(tzinfo=timezone.utc)
            if self.subscription_end.tzinfo is None
            else self.subscription_end
        )
        return datetime.now(timezone.utc) < end_utc