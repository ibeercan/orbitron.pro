import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.db.session import engine, get_db
from app.models.base import Base
import app.models  # noqa: F401 — ensure all models registered for create_all
from app.api.v1.api import api_router

cors_origins = list(settings.ALLOWED_ORIGINS)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to add unique request ID for tracing."""
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Orbitron Backend")

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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

app.add_middleware(RequestIDMiddleware)

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