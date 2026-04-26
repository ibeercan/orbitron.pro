"""Electional CRUD operations."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.electional_cache import ElectionalCache as ElectionalCacheModel, ElectionalStatus

__all__ = ["el_crud", "ElectionalCRUD"]


class ElectionalCRUD:
    async def get_by_user_and_hash(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        input_hash: str,
    ) -> Optional[ElectionalCacheModel]:
        result = await db.execute(
            select(ElectionalCacheModel).where(
                ElectionalCacheModel.user_id == user_id,
                ElectionalCacheModel.input_hash == input_hash,
            )
        )
        return result.scalars().first()

    async def create_pending(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        input_hash: str,
        request_data: dict,
    ) -> ElectionalCacheModel:
        obj = ElectionalCacheModel(
            user_id=user_id,
            input_hash=input_hash,
            status=ElectionalStatus.COMPUTING.value,
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
        obj = await db.get(ElectionalCacheModel, id)
        if obj:
            obj.progress = progress
            await db.flush()

    async def mark_done(
        self,
        db: AsyncSession,
        *,
        id: int,
        result_data: dict,
    ) -> ElectionalCacheModel:
        obj = await db.get(ElectionalCacheModel, id)
        if not obj:
            return None
        obj.status = ElectionalStatus.DONE.value
        obj.progress = 100
        obj.result_data = result_data
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
    ) -> ElectionalCacheModel:
        obj = await db.get(ElectionalCacheModel, id)
        if not obj:
            return None
        obj.status = ElectionalStatus.ERROR.value
        obj.error_message = error_message
        obj.result_data = None
        await db.flush()
        await db.refresh(obj)
        return obj

    async def reset_stale(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        input_hash: str,
        max_age_seconds: int = 300,
    ) -> bool:
        from datetime import datetime, timezone
        obj = await self.get_by_user_and_hash(db, user_id=user_id, input_hash=input_hash)
        if not obj or obj.status != ElectionalStatus.COMPUTING.value:
            return False
        if obj.updated_at is None:
            return True
        age = (datetime.now(timezone.utc) - obj.updated_at.replace(tzinfo=timezone.utc)).total_seconds()
        if age < max_age_seconds:
            return False
        await db.delete(obj)
        await db.flush()
        return True


el_crud = ElectionalCRUD()