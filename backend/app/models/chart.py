"""Chart model with chart type classification and soft delete support."""

from datetime import datetime
from enum import Enum

from sqlalchemy import Enum as SQLEnum, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin
from app.models.user import _enum_values

__all__ = ["Chart", "ChartType"]


class ChartType(str, Enum):
    NATAL = "natal"
    SYNASTRY = "synastry"
    TRANSIT = "transit"
    SOLAR_RETURN = "solar_return"
    LUNAR_RETURN = "lunar_return"
    PROFECTION = "profection"
    SOLAR_ARC = "solar_arc"
    PROGRESSION = "progression"
    COMPOSITE = "composite"
    DAVISON = "davison"
    HORARY = "horary"


class Chart(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "charts"
    __table_args__ = (
        Index("ix_chart_user", "user_id"),
        Index("ix_chart_deleted", "deleted_at"),
        Index("ix_chart_user_created", "user_id", "created_at"),
        Index("ix_chart_type", "chart_type"),
        Index("ix_chart_parent", "parent_chart_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str | None] = mapped_column(String(255), default=None)
    chart_type: Mapped[str] = mapped_column(
        SQLEnum(ChartType, values_callable=_enum_values, name="chart_type_enum"),
        default=ChartType.NATAL.value,
    )
    parent_chart_id: Mapped[int | None] = mapped_column(
        ForeignKey("charts.id"), default=None,
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("persons.id"), default=None,
    )
    native_data: Mapped[dict] = mapped_column(JSON)
    result_data: Mapped[dict] = mapped_column(JSON)
    svg_data: Mapped[str | None] = mapped_column(Text, default=None)
    svg_path: Mapped[str | None] = mapped_column(String(500), default=None)
    prompt_text: Mapped[str | None] = mapped_column(Text, default=None)

    user = relationship("User", back_populates="charts")
    parent_chart = relationship("Chart", remote_side=[id], foreign_keys=[parent_chart_id])
    person = relationship("Person", foreign_keys=[person_id])
    chat_sessions = relationship(
        "ChatSession",
        back_populates="chart",
        primaryjoin="and_(Chart.id == ChatSession.chart_id, ChatSession.deleted_at.is_(None))",
        viewonly=True,
    )

    def to_dict(self, include_svg: bool = False) -> dict:
        result = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "chart_type": self.chart_type,
            "parent_chart_id": self.parent_chart_id,
            "person_id": self.person_id,
            "native_data": self.native_data,
            "result_data": self.result_data,
            "svg_data": self.svg_data if include_svg else None,
            "prompt_text": self.prompt_text,
            "created_at": (
                self.created_at.isoformat() if self.created_at else None
            ),
        }
        return result
