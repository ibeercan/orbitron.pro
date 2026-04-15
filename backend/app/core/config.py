from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Database
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