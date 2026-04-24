from enum import Enum

from sqlalchemy import Enum as SQLEnum, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin
from app.models.user import _enum_values

__all__ = ["InsightCache", "InsightType", "InsightStatus"]


class InsightType(str, Enum):
    ASTRO_TWINS = "astro_twins"
    HISTORICAL_PARALLELS = "historical_parallels"


class InsightStatus(str, Enum):
    COMPUTING = "computing"
    DONE = "done"
    ERROR = "error"


class InsightCache(Base, TimestampMixin):
    __tablename__ = "insight_cache"
    __table_args__ = (
        Index("ix_insight_natal_type", "natal_chart_id", "insight_type", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    natal_chart_id: Mapped[int] = mapped_column(ForeignKey("charts.id"))
    insight_type: Mapped[str] = mapped_column(
        SQLEnum(InsightType, values_callable=_enum_values, name="insight_type_enum"),
    )
    status: Mapped[str] = mapped_column(
        SQLEnum(InsightStatus, values_callable=_enum_values, name="insight_status_enum"),
        default=InsightStatus.COMPUTING.value,
    )
    result_data: Mapped[dict | None] = mapped_column(JSON, default=None)
    error_message: Mapped[str | None] = mapped_column(Text, default=None)

    natal_chart = relationship("Chart")
