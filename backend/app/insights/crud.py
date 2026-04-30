from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.insight_cache import InsightCache as InsightCacheModel, InsightType, InsightStatus

__all__ = ["insight_crud", "InsightCacheCRUD"]


class InsightCacheCRUD:
    async def get_by_chart_and_type(
        self,
        db: AsyncSession,
        *,
        natal_chart_id: int,
        insight_type: str,
    ) -> Optional[InsightCacheModel]:
        result = await db.execute(
            select(InsightCacheModel).where(
                InsightCacheModel.natal_chart_id == natal_chart_id,
                InsightCacheModel.insight_type == insight_type,
            )
        )
        return result.scalars().first()

    async def create_pending(
        self,
        db: AsyncSession,
        *,
        natal_chart_id: int,
        insight_type: str,
    ) -> InsightCacheModel:
        obj = InsightCacheModel(
            natal_chart_id=natal_chart_id,
            insight_type=insight_type,
            status=InsightStatus.COMPUTING.value,
        )
        db.add(obj)
        await db.flush()
        await db.refresh(obj)
        return obj

    async def mark_done(
        self,
        db: AsyncSession,
        *,
        id: int,
        result_data: dict,
    ) -> InsightCacheModel:
        obj = await db.get(InsightCacheModel, id)
        if not obj:
            return None
        obj.status = InsightStatus.DONE.value
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
    ) -> InsightCacheModel:
        obj = await db.get(InsightCacheModel, id)
        if not obj:
            return None
        obj.status = InsightStatus.ERROR.value
        obj.error_message = error_message
        obj.result_data = None
        await db.flush()
        await db.refresh(obj)
        return obj

    async def reset_stale(
        self,
        db: AsyncSession,
        *,
        natal_chart_id: int,
        insight_type: str,
        max_age_seconds: int = 300,
    ) -> bool:
        from datetime import datetime, timezone
        obj = await self.get_by_chart_and_type(
            db, natal_chart_id=natal_chart_id, insight_type=insight_type,
        )
        if not obj or obj.status != InsightStatus.COMPUTING.value:
            return False
        if obj.updated_at is None:
            return True
        age = (datetime.now(timezone.utc) - obj.updated_at).total_seconds()
        if age < max_age_seconds:
            return False
        await db.delete(obj)
        await db.flush()
        return True


insight_crud = InsightCacheCRUD()
