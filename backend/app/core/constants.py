"""Application constants."""

COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"
OAUTH2_SCHEME = "Bearer"

DEFAULT_RATE_LIMIT = "100/minute"
AUTH_RATE_LIMIT = "20/minute"

DB_POOL_SIZE = 20
DB_MAX_OVERFLOW = 30
DB_POOL_RECYCLE = 1800
DB_POOL_PRE_PING = True

DEFAULT_PAGE_LIMIT = 100
MAX_PAGE_LIMIT = 1000

FREE_CHARTS_LIMIT = 1
PREMIUM_CHARTS_LIMIT = None

PREMIUM_FEATURES = {
    "synastry_ai",
    "transit_custom_date",
    "solar_return",
    "lunar_return",
    "profection",
    "pdf_report",
    "horary",
    "electional",
    "planetary_return",
    "solar_arc",
    "progression",
    "composite",
    "astro_twins",
    "historical_parallels",
    "rectification",
    "planner",
}
