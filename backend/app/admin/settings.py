from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    REGISTRATION_OPEN_KEY,
    AI_COST_PER_1M_INPUT_RUB_KEY,
    AI_COST_PER_1M_OUTPUT_RUB_KEY,
    SMTP_HOST_KEY,
    SMTP_PORT_KEY,
    SMTP_USER_KEY,
    SMTP_PASSWORD_KEY,
    SMTP_FROM_KEY,
    FRONTEND_URL_KEY,
)
from app.core.config import settings
from app.core.logging import logger
from app.models.app_settings import AppSettings

_cache: dict[str, tuple[float, str]] = {}
_CACHE_TTL = 60.0


async def get_setting(db: AsyncSession, key: str) -> Optional[str]:
    import time

    now = time.time()
    if key in _cache:
        expires_at, value = _cache[key]
        if now < expires_at:
            return value

    result = await db.execute(select(AppSettings).where(AppSettings.key == key))
    row = result.scalars().first()
    if row:
        _cache[key] = (now + _CACHE_TTL, row.value)
        return row.value
    return None


async def set_setting(db: AsyncSession, key: str, value: str) -> AppSettings:
    import time

    result = await db.execute(select(AppSettings).where(AppSettings.key == key))
    row = result.scalars().first()
    if row:
        row.value = value
        await db.flush()
    else:
        row = AppSettings(key=key, value=value)
        db.add(row)
        await db.flush()
    _cache[key] = (time.time() + _CACHE_TTL, value)
    logger.info("app_setting_updated", key=key, value=value)
    return row


SETTINGS_DEFAULTS: dict[str, str] = {
    REGISTRATION_OPEN_KEY: "true",
    AI_COST_PER_1M_INPUT_RUB_KEY: str(settings.AI_COST_PER_1M_INPUT_RUB),
    AI_COST_PER_1M_OUTPUT_RUB_KEY: str(settings.AI_COST_PER_1M_OUTPUT_RUB),
    SMTP_HOST_KEY: settings.SMTP_HOST,
    SMTP_PORT_KEY: str(settings.SMTP_PORT),
    SMTP_USER_KEY: settings.SMTP_USER,
    SMTP_PASSWORD_KEY: settings.SMTP_PASSWORD,
    SMTP_FROM_KEY: settings.SMTP_FROM,
    FRONTEND_URL_KEY: settings.FRONTEND_URL,
}


async def get_all_settings(db: AsyncSession) -> list[AppSettings]:
    result = await db.execute(select(AppSettings))
    return list(result.scalars().all())


async def get_all_settings_with_defaults(db: AsyncSession) -> list[AppSettings]:
    db_rows = await get_all_settings(db)
    db_map = {s.key: s for s in db_rows}

    result: list[AppSettings] = []
    for key, default_value in SETTINGS_DEFAULTS.items():
        if key in db_map:
            result.append(db_map[key])
        else:
            row = AppSettings(key=key, value=default_value)
            result.append(row)
    return result


async def is_registration_open(db: AsyncSession) -> bool:
    value = await get_setting(db, REGISTRATION_OPEN_KEY)
    return value != "false"


async def get_cost_input_rub(db: AsyncSession) -> float:
    value = await get_setting(db, AI_COST_PER_1M_INPUT_RUB_KEY)
    if value is not None:
        try:
            return float(value)
        except (ValueError, TypeError):
            pass
    return settings.AI_COST_PER_1M_INPUT_RUB


async def get_cost_output_rub(db: AsyncSession) -> float:
    value = await get_setting(db, AI_COST_PER_1M_OUTPUT_RUB_KEY)
    if value is not None:
        try:
            return float(value)
        except (ValueError, TypeError):
            pass
    return settings.AI_COST_PER_1M_OUTPUT_RUB


async def get_smtp_config(db: AsyncSession) -> dict:
    host = await get_setting(db, SMTP_HOST_KEY)
    port = await get_setting(db, SMTP_PORT_KEY)
    user = await get_setting(db, SMTP_USER_KEY)
    password = await get_setting(db, SMTP_PASSWORD_KEY)
    from_addr = await get_setting(db, SMTP_FROM_KEY)
    frontend_url = await get_setting(db, FRONTEND_URL_KEY)

    return {
        "host": host if host is not None else settings.SMTP_HOST,
        "port": int(port) if port is not None else settings.SMTP_PORT,
        "user": user if user is not None else settings.SMTP_USER,
        "password": password if password is not None else settings.SMTP_PASSWORD,
        "from_addr": from_addr if from_addr is not None else settings.SMTP_FROM,
        "frontend_url": frontend_url if frontend_url is not None else settings.FRONTEND_URL,
    }