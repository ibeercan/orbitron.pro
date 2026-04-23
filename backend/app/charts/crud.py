"""Chart CRUD operations."""

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chart import Chart as ChartModel
from app.models.chat import ChatSession

__all__ = ["chart", "CRUDChart"]


class CRUDChart:
    """CRUD operations for Chart model."""

    async def create(
        self, db: AsyncSession, *, obj_in: dict, user_id: int
    ) -> ChartModel:
        """Create new chart. Caller is responsible for commit."""
        db_obj = ChartModel(
            user_id=user_id,
            native_data=obj_in["native_data"],
            result_data=obj_in["result_data"],
            svg_data=obj_in.get("svg_data"),
            prompt_text=obj_in["prompt_text"],
        )
        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)
        return db_obj

    async def get_by_id_and_user(
        self, db: AsyncSession, *, id: int, user_id: int
    ) -> Optional[ChartModel]:
        """Get chart by ID and user ID (excluding soft-deleted)."""
        result = await db.execute(
            select(ChartModel).where(
                ChartModel.id == id,
                ChartModel.user_id == user_id,
                ChartModel.deleted_at.is_(None),
            )
        )
        return result.scalars().first()

    async def get_user_charts(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[ChartModel]:
        """Get all charts for a user (excluding soft-deleted)."""
        result = await db.execute(
            select(ChartModel)
            .where(ChartModel.user_id == user_id, ChartModel.deleted_at.is_(None))
            .order_by(ChartModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def soft_delete(
        self, db: AsyncSession, *, id: int, user_id: int
    ) -> bool:
        """Soft-delete a chart and its chat sessions. Caller is responsible for commit."""
        chart = await self.get_by_id_and_user(db, id=id, user_id=user_id)
        if not chart:
            return False

        result = await db.execute(
            select(ChatSession).where(
                ChatSession.chart_id == id,
                ChatSession.user_id == user_id,
                ChatSession.deleted_at.is_(None),
            )
        )
        for session in result.scalars().all():
            session.soft_delete()

        chart.soft_delete()
        await db.flush()
        return True


chart = CRUDChart()