"""Core application modules."""

from app.core.config import settings
from app.core.constants import (
    COOKIE_NAME,
    OAUTH2_SCHEME,
    DEFAULT_RATE_LIMIT,
    AUTH_RATE_LIMIT,
    DB_POOL_SIZE,
    DB_MAX_OVERFLOW,
    DB_POOL_RECYCLE,
    DEFAULT_PAGE_LIMIT,
    MAX_PAGE_LIMIT,
)
from app.core.logging import logger, get_logger

__all__ = [
    "settings",
    "logger",
    "get_logger",
    "COOKIE_NAME",
    "OAUTH2_SCHEME",
    "DEFAULT_RATE_LIMIT",
    "AUTH_RATE_LIMIT",
    "DB_POOL_SIZE",
    "DB_MAX_OVERFLOW",
    "DB_POOL_RECYCLE",
    "DEFAULT_PAGE_LIMIT",
    "MAX_PAGE_LIMIT",
]