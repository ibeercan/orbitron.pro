from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base

class Chart(Base):
    __tablename__ = "charts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    native_data = Column(JSON, nullable=False)  # {datetime, location}
    result_data = Column(JSON, nullable=False)  # Chart data from Stellium
    svg_path = Column(String, nullable=True)  # Path to generated SVG
    prompt_text = Column(Text, nullable=True)  # Prompt text for AI
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")