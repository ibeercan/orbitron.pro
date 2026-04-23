"""Token usage tracking for AI billing."""

from datetime import datetime

from sqlalchemy import ForeignKey, Index, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin

__all__ = ["TokenUsage"]


class TokenUsage(Base, TimestampMixin):
    """Token usage tracking for AI API calls.
    
    Stores usage data for billing analytics and cost optimization.
    """
    __tablename__ = "ai_token_usage"
    __table_args__ = (
        Index("ix_token_user", "user_id"),
        Index("ix_token_model", "model"),
        Index("ix_token_created", "created_at"),
        Index("ix_token_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    model: Mapped[str] = mapped_column(String(50), index=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)

    @property
    def cost_per_1k_tokens(self) -> float:
        """Calculate cost per 1k tokens."""
        if self.total_tokens == 0:
            return 0.0
        return (self.cost_usd / self.total_tokens) * 1000

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "model": self.model,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "cost_usd": self.cost_usd,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TokenUsageCRUD:
    """CRUD operations for TokenUsage."""

    async def get_user_usage(
        self, db, user_id: int, start_date: datetime = None, end_date: datetime = None
    ) -> list[TokenUsage]:
        """Get token usage for a user within date range."""
        from sqlalchemy import select

        query = select(TokenUsage).where(TokenUsage.user_id == user_id)

        if start_date:
            query = query.where(TokenUsage.created_at >= start_date)
        if end_date:
            query = query.where(TokenUsage.created_at <= end_date)

        query = query.order_by(TokenUsage.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_total_cost(self, db, user_id: int) -> float:
        """Get total cost for a user."""
        from sqlalchemy import select, func

        result = await db.execute(
            select(func.sum(TokenUsage.cost_usd)).where(
                TokenUsage.user_id == user_id
            )
        )
        return result.scalar() or 0.0


token_usage_crud = TokenUsageCRUD()
