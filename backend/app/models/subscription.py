"""Subscription model with soft delete and audit support."""

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import AuditMixin, SoftDeleteMixin, TimestampMixin
from app.models.user import _enum_values

__all__ = ["Subscription", "SubscriptionPlan", "SubscriptionStatus"]


class SubscriptionPlan(str, Enum):
    """Subscription billing period."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class SubscriptionStatus(str, Enum):
    """Subscription payment status."""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PENDING = "pending"
    FAILED = "failed"


class Subscription(Base, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """Subscription model for tracking user subscriptions.

    Tracks billing period, payment status, and validity.
    """
    __tablename__ = "subscriptions"
    __table_args__ = (
        Index("ix_subs_user", "user_id"),
        Index("ix_subs_deleted", "deleted_at"),
        Index("ix_subs_user_status", "user_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    plan: Mapped[str] = mapped_column(
        SQLEnum(SubscriptionPlan, values_callable=_enum_values, name="subscription_plan_enum"),
    )
    status: Mapped[str] = mapped_column(
        SQLEnum(SubscriptionStatus, values_callable=_enum_values, name="subscription_status_enum"),
        default=SubscriptionStatus.ACTIVE.value,
    )
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    user = relationship("User", back_populates="subscriptions")
    payments = relationship(
        "Payment",
        back_populates="subscription",
        primaryjoin="and_(Subscription.id == Payment.subscription_id, Payment.deleted_at.is_(None))",
        viewonly=True,
    )

    @property
    def is_active(self) -> bool:
        """Check if subscription is currently active."""
        return self.status == SubscriptionStatus.ACTIVE.value

    @property
    def is_expired(self) -> bool:
        """Check if subscription has expired."""
        if self.end_date is None:
            return False
        return datetime.now(timezone.utc) >= self.end_date