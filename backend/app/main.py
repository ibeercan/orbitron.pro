from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.db.session import engine
from app.models.base import Base
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.middleware import SubscriptionMiddleware
import structlog

# Configure structured logging
import logging

# Set logging level based on config
log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
logging.basicConfig(level=log_level)

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

def _run_alembic_upgrade() -> None:
    """Run alembic migrations synchronously (called once at startup)."""
    from alembic.config import Config as AlembicConfig
    from alembic import command as alembic_command
    import os

    alembic_cfg = AlembicConfig(os.path.join(os.path.dirname(__file__), "../../alembic.ini"))
    # Override sqlalchemy.url from environment if available
    from app.core.config import settings
    db_url = (settings.DATABASE_URL or settings.computed_database_url).replace("+asyncpg", "")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    alembic_command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Orbitron Backend")

    # 1. Ensure all tables exist (create_all is idempotent / safe)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured")

    # 2. Apply pending Alembic migrations (adds svg_data column, etc.)
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _run_alembic_upgrade)
        logger.info("Alembic migrations applied")
    except Exception as e:
        # Non-fatal: log and continue (migrations may already be applied)
        logger.warning("Alembic migration warning", error=str(e))

    yield
    logger.info("Shutting down Orbitron Backend")

app = FastAPI(
    title="Orbitron Astrology API",
    description="AI-powered astrological chart analysis service",
    version="1.0.0",
    lifespan=lifespan,
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://orbitron.pro", "http://orbitron.pro"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Subscription middleware
app.add_middleware(SubscriptionMiddleware)

# Include API router
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "orbitron-backend"}