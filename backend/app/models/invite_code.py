from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func

from app.models.base import Base


class InviteCode(Base):
    __tablename__ = "invite_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True)
    used = Column(Boolean, default=False)
    used_email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())