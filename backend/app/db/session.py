"""Database session management."""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.constants import DB_POOL_SIZE, DB_MAX_OVERFLOW, DB_POOL_RECYCLE


def get_engine():
    """Create async engine based on database URL.
    
    Supports both PostgreSQL and SQLite for local development.
    """
    db_url = settings.computed_database_url

    if db_url.startswith("sqlite"):
        async_database_url = db_url.replace("sqlite://", "sqlite+aiosqlite://")
        return create_async_engine(
            async_database_url,
            connect_args={"check_same_thread": False},
            poolclass=NullPool,
            echo=False,
        )

    async_database_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    return create_async_engine(
        async_database_url,
        pool_size=DB_POOL_SIZE,
        max_overflow=DB_MAX_OVERFLOW,
        pool_pre_ping=True,
        pool_recycle=DB_POOL_RECYCLE,
        echo=False,
    )


engine = get_engine()

AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Database session dependency for FastAPI."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()