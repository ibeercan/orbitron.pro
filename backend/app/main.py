import uuid
import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.db.session import engine, get_db
from app.middleware.proxy_headers import get_real_ip
from app.middleware.security_headers import SecurityHeadersMiddleware
import app.models  # noqa: F401
from app.api.v1.api import api_router

cors_origins = list(settings.allowed_origins)


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


limiter = Limiter(key_func=get_real_ip, default_limits=["100/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Orbitron Backend", environment=settings.ENVIRONMENT)
    from app.db.session import AsyncSessionLocal
    from app.admin.settings import set_setting
    from app.core.constants import REGISTRATION_OPEN_KEY
    from sqlalchemy import select
    from app.models.app_settings import AppSettings

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AppSettings).where(AppSettings.key == REGISTRATION_OPEN_KEY))
        if not result.scalars().first():
            await set_setting(db, REGISTRATION_OPEN_KEY, "true")
            await db.commit()
            logger.info("Initialized app_settings", key=REGISTRATION_OPEN_KEY, value="true")
    yield
    logger.info("Shutting down Orbitron Backend")


is_production = settings.ENVIRONMENT == "production"

app = FastAPI(
    title="Orbitron Astrology API",
    description="AI-powered astrological chart analysis service",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
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

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "service": "orbitron-backend"}
    except Exception:
        logger.error("Health check failed: database unreachable")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "service": "orbitron-backend"},
        )


if not is_production:

    @app.get("/")
    async def root():
        return {
            "service": "orbitron-backend",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "docs": "/docs",
        }