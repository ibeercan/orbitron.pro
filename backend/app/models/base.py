"""SQLAlchemy 2.0 Declarative Base."""

from sqlalchemy.orm import DeclarativeBase

__all__ = ["Base"]


class Base(DeclarativeBase):
    """Base class for all database models.
    
    Uses SQLAlchemy 2.0 DeclarativeBase for modern API.
    """
    pass