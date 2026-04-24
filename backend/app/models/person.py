"""Person model for storing birth data of friends/partners for synastry."""

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.mixins import TimestampMixin

__all__ = ["Person"]


class Person(Base, TimestampMixin):
    __tablename__ = "persons"
    __table_args__ = (
        Index("ix_person_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    datetime: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(500))

    user = relationship("User", back_populates="persons")
