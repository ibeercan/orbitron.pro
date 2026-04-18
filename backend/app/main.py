from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.db.session import engine, get_db
from app.models.base import Base
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.middleware import SubscriptionMiddleware
import structlog
import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

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


class RequestIDMiddleware:
    """Middleware to add unique request ID for tracing."""
    async def __call__(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Orbitron Backend")

    # Ensure all tables exist (create_all is idempotent / safe)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured")

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

# Request ID middleware (must be first to ensure it's on all requests)
app.add_middleware(RequestIDMiddleware)

# Subscription middleware
app.add_middleware(SubscriptionMiddleware)

# Include API router
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "orbitron-backend"}


@app.get("/health/db")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    """Database health check endpoint."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error("database_health_check_failed", error=str(e))
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected", "detail": str(e)}
        )