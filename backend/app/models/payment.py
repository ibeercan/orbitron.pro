"""Payment model for Stripe integration."""

from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import Enum as SQLEnum, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin
from app.models.user import _enum_values

__all__ = ["Payment", "PaymentStatus", "PaymentMethod"]


class PaymentStatus(str, Enum):
    """Payment processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentMethod(str, Enum):
    """Payment method type."""
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"


class Payment(Base, TimestampMixin, SoftDeleteMixin):
    """Payment transaction model for Stripe integration."""
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_pay_user", "user_id"),
        Index("ix_pay_sub", "subscription_id"),
        Index("ix_pay_stripe", "stripe_payment_id"),
        Index("ix_pay_deleted", "deleted_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    subscription_id: Mapped[int | None] = mapped_column(ForeignKey("subscriptions.id"), default=None)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    stripe_payment_id: Mapped[str | None] = mapped_column(String(255), default=None)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), default=None)
    status: Mapped[str] = mapped_column(
        SQLEnum(PaymentStatus, values_callable=_enum_values, name="payment_status_enum"),
        default=PaymentStatus.PENDING.value,
    )
    payment_method: Mapped[str] = mapped_column(
        SQLEnum(PaymentMethod, values_callable=_enum_values, name="payment_method_enum"),
        default=PaymentMethod.CARD.value,
    )
    failure_message: Mapped[str | None] = mapped_column(default=None)
    refunded_at: Mapped[datetime | None] = mapped_column(default=None)

    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")

    @property
    def is_succeeded(self) -> bool:
        return self.status == PaymentStatus.SUCCEEDED.value

    @property
    def is_refunded(self) -> bool:
        return self.status == PaymentStatus.REFUNDED.value or self.refunded_at is not None

    @property
    def amount_cents(self) -> int:
        return int(Decimal(str(self.amount)) * 100)