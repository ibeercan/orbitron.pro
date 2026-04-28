from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import REGISTRATION_OPEN_KEY
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


async def get_all_settings(db: AsyncSession) -> list[AppSettings]:
    result = await db.execute(select(AppSettings))
    return list(result.scalars().all())


async def is_registration_open(db: AsyncSession) -> bool:
    value = await get_setting(db, REGISTRATION_OPEN_KEY)
    return value != "false"