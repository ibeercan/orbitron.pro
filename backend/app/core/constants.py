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

REGISTRATION_OPEN_KEY = "registration_open"
AI_COST_PER_1M_INPUT_RUB_KEY = "ai_cost_per_1m_input_rub"
AI_COST_PER_1M_OUTPUT_RUB_KEY = "ai_cost_per_1m_output_rub"
SMTP_HOST_KEY = "smtp_host"
SMTP_PORT_KEY = "smtp_port"
SMTP_USER_KEY = "smtp_user"
SMTP_PASSWORD_KEY = "smtp_password"
SMTP_FROM_KEY = "smtp_from"
FRONTEND_URL_KEY = "frontend_url"

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
