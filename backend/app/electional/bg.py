"""Background task for electional search."""

import asyncio

from app.core.logging import logger
from app.electional.search import run_electional_search
from app.db.session import AsyncSessionLocal
from app.electional.crud import el_crud


async def _update_progress(cache_id: int, pct: int) -> None:
    async with AsyncSessionLocal() as db:
        try:
            await el_crud.update_progress(db, id=cache_id, progress=pct)
            await db.commit()
        except Exception:
            await db.rollback()


async def bg_electional_and_persist(cache_id: int, request_data: dict) -> None:
    loop = asyncio.get_event_loop()

    def progress_cb(pct: int) -> None:
        asyncio.run_coroutine_threadsafe(_update_progress(cache_id, pct), loop)

    async with AsyncSessionLocal() as db:
        try:
            result = await loop.run_in_executor(
                None, run_electional_search, request_data, progress_cb
            )
            await el_crud.mark_done(db, id=cache_id, result_data=result)
            await db.commit()
            logger.info("Electional search done", cache_id=cache_id)
        except Exception as e:
            try:
                await el_crud.mark_error(db, id=cache_id, error_message=str(e))
                await db.commit()
            except Exception:
                await db.rollback()
            logger.error("Electional search failed", cache_id=cache_id, error=str(e))