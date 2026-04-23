"""Audit log model for tracking entity changes."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import JSON, String, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.mixins import TimestampMixin

__all__ = ["AuditLog", "AuditAction"]

AuditAction = str
AUDIT_ACTIONS = {
    "create": "create",
    "update": "update",
    "delete": "delete",
}


class AuditLog(Base, TimestampMixin):
    """Audit log for tracking changes to critical entities.
    
    Records all CREATE, UPDATE, DELETE operations on:
    - users
    - subscriptions
    - payments
    
    Stores both old and new values for UPDATE operations.
    """
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id"),
        Index("ix_audit_user_action", "user_id", "action"),
        Index("ix_audit_timestamp", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(50), index=True)
    entity_id: Mapped[int] = mapped_column(index=True)
    action: Mapped[str] = mapped_column(String(20), index=True)
    old_values: Mapped[dict | None] = mapped_column(JSON, default=None)
    new_values: Mapped[dict | None] = mapped_column(JSON, default=None)
    user_id: Mapped[int | None] = mapped_column(default=None, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), default=None)
    user_agent: Mapped[str | None] = mapped_column(String(500), default=None)

    @classmethod
    def log_create(
        cls,
        entity_type: str,
        entity_id: int,
        new_values: dict,
        user_id: int | None = None,
        ip_address: str | None = None,
    ) -> "AuditLog":
        """Create audit log for entity creation."""
        return cls(
            entity_type=entity_type,
            entity_id=entity_id,
            action="create",
            old_values=None,
            new_values=new_values,
            user_id=user_id,
            ip_address=ip_address,
        )

    @classmethod
    def log_update(
        cls,
        entity_type: str,
        entity_id: int,
        old_values: dict,
        new_values: dict,
        user_id: int | None = None,
        ip_address: str | None = None,
    ) -> "AuditLog":
        """Create audit log for entity update."""
        return cls(
            entity_type=entity_type,
            entity_id=entity_id,
            action="update",
            old_values=old_values,
            new_values=new_values,
            user_id=user_id,
            ip_address=ip_address,
        )

    @classmethod
    def log_delete(
        cls,
        entity_type: str,
        entity_id: int,
        old_values: dict,
        user_id: int | None = None,
        ip_address: str | None = None,
    ) -> "AuditLog":
        """Create audit log for entity deletion."""
        return cls(
            entity_type=entity_type,
            entity_id=entity_id,
            action="delete",
            old_values=old_values,
            new_values=None,
            user_id=user_id,
            ip_address=ip_address,
        )

    def to_dict(self) -> dict:
        """Convert audit log to dictionary."""
        return {
            "id": self.id,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "action": self.action,
            "old_values": self.old_values,
            "new_values": self.new_values,
            "user_id": self.user_id,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def serialize_for_audit(obj: Any) -> dict:
    """Serialize an SQLAlchemy model for audit storage.
    
    Converts to dict, handling special types like Decimal, datetime, enums.
    """
    result = {}
    for key, value in obj.__dict__.items():
        if key.startswith("_"):
            continue
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, Decimal):
            result[key] = float(value)
        elif hasattr(value, "__str__"):
            result[key] = str(value)
        else:
            result[key] = value
    return result