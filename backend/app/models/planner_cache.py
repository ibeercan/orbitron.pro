"""Planner cache model — persists background planner PDF generation results."""

from enum import Enum

from sqlalchemy import Enum as SQLEnum, ForeignKey, Index, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin
from app.models.user import _enum_values

__all__ = ["PlannerCache", "PlannerStatus"]


class PlannerStatus(str, Enum):
    COMPUTING = "computing"
    DONE = "done"
    ERROR = "error"


class PlannerCache(Base, TimestampMixin):
    __tablename__ = "planner_cache"
    __table_args__ = (
        Index("ix_pl_user_hash", "user_id", "input_hash", unique=True),
        Index("ix_pl_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    chart_id: Mapped[int] = mapped_column(ForeignKey("charts.id"))
    input_hash: Mapped[str] = mapped_column(String(64))
    year: Mapped[int] = mapped_column(Integer)
    preset: Mapped[str] = mapped_column(String(20), default="standard")
    status: Mapped[str] = mapped_column(
        SQLEnum(PlannerStatus, values_callable=_enum_values, name="planner_status_enum"),
        default=PlannerStatus.COMPUTING.value,
    )
    progress: Mapped[int] = mapped_column(Integer, default=0)
    request_data: Mapped[dict] = mapped_column(LargeBinary)
    pdf_data: Mapped[bytes | None] = mapped_column(LargeBinary, default=None)
    error_message: Mapped[str | None] = mapped_column(Text, default=None)

    user = relationship("User")