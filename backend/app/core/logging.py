import logging
import structlog
from typing import Any

from app.core.config import settings


def configure_logging() -> None:
    """Configure structured logging for the application.
    
    Should be called once at application startup.
    """
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logging.basicConfig(
        level=log_level,
        format="%(message)s",
    )

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


# Configure logging on module import
configure_logging()

# Module-level logger instance
logger = structlog.get_logger()


def get_logger(*args: Any, **kwargs: Any) -> structlog.stdlib.BoundLogger:
    """Get a bound logger instance.
    
    Usage:
        log = get_logger(__name__)
        log.info("message", key="value")
    """
    return structlog.get_logger(*args, **kwargs)