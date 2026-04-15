from pydantic_settings import BaseSettings
from typing import List, Optional
import structlog
import logging

log_level = getattr(logging, "INFO", logging.INFO)
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


class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str = "user"
    POSTGRES_PASSWORD: str = ""
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/astrology"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI
    AI_API_KEY: str = ""
    AI_BASE_URL: Optional[str] = None
    AI_MODEL: str = "gpt-4"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Security
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "https://orbitron.pro"]

    # Subscription limits
    FREE_AI_REQUESTS_PER_MONTH: int = 5

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"

settings = Settings()