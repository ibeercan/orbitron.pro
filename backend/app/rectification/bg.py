import asyncio

from app.core.logging import logger
from app.charts.rectification import rectify
from app.charts.rectification_schemas import RectificationRequest
from app.db.session import AsyncSessionLocal
from app.rectification.crud import rect_crud


async def _update_progress(cache_id: int, pct: int) -> None:
    async with AsyncSessionLocal() as db:
        try:
            await rect_crud.update_progress(db, id=cache_id, progress=pct)
            await db.commit()
        except Exception:
            await db.rollback()


async def bg_rectify_and_persist(cache_id: int, request: RectificationRequest) -> None:
    loop = asyncio.get_event_loop()

    def progress_cb(pct: int) -> None:
        asyncio.run_coroutine_threadsafe(_update_progress(cache_id, pct), loop)

    async with AsyncSessionLocal() as db:
        try:
            result = await loop.run_in_executor(None, rectify, request, progress_cb)

            result_dict = result.model_dump()
            await rect_crud.mark_done(db, id=cache_id, result_data=result_dict)
            await db.commit()
            logger.info("Rectification done", cache_id=cache_id)
        except Exception as e:
            try:
                await rect_crud.mark_error(db, id=cache_id, error_message=str(e))
                await db.commit()
            except Exception:
                await db.rollback()
            logger.error("Rectification failed", cache_id=cache_id, error=str(e))
