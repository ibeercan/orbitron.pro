"""Background task for planner PDF generation."""

import asyncio
import json

from app.core.logging import logger
from app.db.session import AsyncSessionLocal
from app.planner.crud import pl_crud
from app.planner.builder import run_planner_generation


async def _update_progress(cache_id: int, pct: int) -> None:
    async with AsyncSessionLocal() as db:
        try:
            await pl_crud.update_progress(db, id=cache_id, progress=pct)
            await db.commit()
        except Exception:
            await db.rollback()


async def bg_generate_planner(cache_id: int, request_data: dict) -> None:
    loop = asyncio.get_event_loop()

    def progress_cb(pct: int) -> None:
        asyncio.run_coroutine_threadsafe(_update_progress(cache_id, pct), loop)

    async with AsyncSessionLocal() as db:
        try:
            await pl_crud.update_progress(db, id=cache_id, progress=5)
            await db.commit()

            pdf_bytes = await loop.run_in_executor(
                None, run_planner_generation, request_data, progress_cb
            )

            await pl_crud.mark_done(db, id=cache_id, pdf_data=pdf_bytes)
            await db.commit()
            logger.info("Planner generation done", cache_id=cache_id, size_bytes=len(pdf_bytes))
        except Exception as e:
            error_msg = str(e) or type(e).__name__
            try:
                await pl_crud.mark_error(db, id=cache_id, error_message=error_msg)
                await db.commit()
            except Exception:
                await db.rollback()
            logger.error("Planner generation failed", cache_id=cache_id, error=error_msg)