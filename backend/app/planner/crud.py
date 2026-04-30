"""Planner CRUD operations."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planner_cache import PlannerCache as PlannerCacheModel, PlannerStatus

__all__ = ["pl_crud", "PlannerCRUD"]


class PlannerCRUD:
    async def get_by_user_and_hash(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        input_hash: str,
    ) -> Optional[PlannerCacheModel]:
        result = await db.execute(
            select(PlannerCacheModel).where(
                PlannerCacheModel.user_id == user_id,
                PlannerCacheModel.input_hash == input_hash,
            )
        )
        return result.scalars().first()

    async def create_pending(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        chart_id: int,
        input_hash: str,
        year: int,
        preset: str,
        request_data: bytes,
    ) -> PlannerCacheModel:
        obj = PlannerCacheModel(
            user_id=user_id,
            chart_id=chart_id,
            input_hash=input_hash,
            year=year,
            preset=preset,
            status=PlannerStatus.COMPUTING.value,
            progress=0,
            request_data=request_data,
        )
        db.add(obj)
        await db.flush()
        await db.refresh(obj)
        return obj

    async def update_progress(
        self,
        db: AsyncSession,
        *,
        id: int,
        progress: int,
    ) -> None:
        obj = await db.get(PlannerCacheModel, id)
        if obj:
            obj.progress = progress
            await db.flush()

    async def mark_done(
        self,
        db: AsyncSession,
        *,
        id: int,
        pdf_data: bytes,
    ) -> PlannerCacheModel:
        obj = await db.get(PlannerCacheModel, id)
        if not obj:
            return None
        obj.status = PlannerStatus.DONE.value
        obj.progress = 100
        obj.pdf_data = pdf_data
        obj.error_message = None
        await db.flush()
        await db.refresh(obj)
        return obj

    async def mark_error(
        self,
        db: AsyncSession,
        *,
        id: int,
        error_message: str,
    ) -> PlannerCacheModel:
        obj = await db.get(PlannerCacheModel, id)
        if not obj:
            return None
        obj.status = PlannerStatus.ERROR.value
        obj.error_message = error_message
        obj.pdf_data = None
        await db.flush()
        await db.refresh(obj)
        return obj

    async def reset_stale(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        input_hash: str,
        max_age_seconds: int = 600,
    ) -> bool:
        from datetime import datetime, timezone
        obj = await self.get_by_user_and_hash(db, user_id=user_id, input_hash=input_hash)
        if not obj or obj.status != PlannerStatus.COMPUTING.value:
            return False
        if obj.updated_at is None:
            return True
        age = (datetime.now(timezone.utc) - obj.updated_at).total_seconds()
        if age < max_age_seconds:
            return False
        await db.delete(obj)
        await db.flush()
        return True


pl_crud = PlannerCRUD()