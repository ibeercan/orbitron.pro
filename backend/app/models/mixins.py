"""SQLAlchemy mixins for common model behaviors."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Index, func
from sqlalchemy.orm import Mapped, mapped_column

if TYPE_CHECKING:
    pass

__all__ = ["TimestampMixin", "SoftDeleteMixin", "AuditMixin"]


class TimestampMixin:
    """Mixin for automatic created_at and updated_at timestamps.
    
    Auto-updates updated_at on every save.
    Uses naive UTC datetime for cross-database compatibility.
    """
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
    )


class SoftDeleteMixin:
    """Mixin for soft delete pattern.
    
    Instead of hard DELETE, sets deleted_at timestamp.
    Queries should filter WHERE deleted_at IS NULL.
    """
    deleted_at: Mapped[datetime | None] = mapped_column(
        default=None,
    )

    def soft_delete(self) -> None:
        """Mark the record as deleted."""
        self.deleted_at = datetime.now(timezone.utc)

    def restore(self) -> None:
        """Restore a soft-deleted record."""
        self.deleted_at = None

    @classmethod
    def query_active(cls, *args: Any, **kwargs: Any) -> Any:
        """Query only non-deleted records.
        
        Usage:
            User.query_active(db).filter(...)
        """
        from sqlalchemy import select
        return select(cls).where(cls.deleted_at == None)


class AuditMixin:
    """Mixin for audit trail support.
    
    Stores reference to creator/updater.
    """
    created_by_id: Mapped[int | None] = mapped_column(default=None)
    updated_by_id: Mapped[int | None] = mapped_column(default=None)


# Combined indexes for common patterns
SOFT_DELETE_INDEX = Index("ix_soft_delete", "deleted_at")
ACTIVE_INDEX = Index("ix_active", "is_active", "deleted_at")