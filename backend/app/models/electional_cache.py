"""Electional cache model — persists background electional search results."""

from enum import Enum

from sqlalchemy import Enum as SQLEnum, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin
from app.models.user import _enum_values

__all__ = ["ElectionalCache", "ElectionalStatus"]


class ElectionalStatus(str, Enum):
    COMPUTING = "computing"
    DONE = "done"
    ERROR = "error"


class ElectionalCache(Base, TimestampMixin):
    __tablename__ = "electional_cache"
    __table_args__ = (
        Index("ix_el_user_hash", "user_id", "input_hash", unique=True),
        Index("ix_el_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    input_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(
        SQLEnum(ElectionalStatus, values_callable=_enum_values, name="electional_status_enum"),
        default=ElectionalStatus.COMPUTING.value,
    )
    progress: Mapped[int] = mapped_column(Integer, default=0)
    request_data: Mapped[dict] = mapped_column(JSON)
    result_data: Mapped[dict | None] = mapped_column(JSON, default=None)
    error_message: Mapped[str | None] = mapped_column(Text, default=None)

    user = relationship("User")