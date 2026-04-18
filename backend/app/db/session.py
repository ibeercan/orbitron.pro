from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from sqlalchemy import event

from app.core.config import settings
import structlog

# Convert to async URL
async_database_url = settings.computed_database_url.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    async_database_url,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=1800,  # 30 minutes
    echo=False,  # Set to False in production
)

AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Database connection pool monitoring
logger = structlog.get_logger()


@event.listens_for(engine, "connect")
def receive_connect(dbapi_connection, connection_record):
    logger.debug("database_connection_established")


@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    logger.debug("database_connection_checked_out_from_pool")


@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    logger.debug("database_connection_returned_to_pool")