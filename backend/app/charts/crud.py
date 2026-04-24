"""Chart CRUD operations."""

from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chart import Chart as ChartModel, ChartType
from app.models.chat import ChatSession
from app.models.user import SubscriptionType
from app.core.config import settings

__all__ = ["chart", "CRUDChart"]


class CRUDChart:
    async def create(
        self, db: AsyncSession, *, obj_in: dict, user_id: int
    ) -> ChartModel:
        db_obj = ChartModel(
            user_id=user_id,
            chart_type=obj_in.get("chart_type", ChartType.NATAL.value),
            parent_chart_id=obj_in.get("parent_chart_id"),
            person_id=obj_in.get("person_id"),
            native_data=obj_in["native_data"],
            result_data=obj_in["result_data"],
            svg_data=obj_in.get("svg_data"),
            prompt_text=obj_in.get("prompt_text"),
        )
        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)
        return db_obj

    async def get_by_id_and_user(
        self, db: AsyncSession, *, id: int, user_id: int
    ) -> Optional[ChartModel]:
        result = await db.execute(
            select(ChartModel).where(
                ChartModel.id == id,
                ChartModel.user_id == user_id,
                ChartModel.deleted_at.is_(None),
            )
        )
        return result.scalars().first()

    async def get_by_id(
        self, db: AsyncSession, *, id: int
    ) -> Optional[ChartModel]:
        result = await db.execute(
            select(ChartModel).where(
                ChartModel.id == id,
                ChartModel.deleted_at.is_(None),
            )
        )
        return result.scalars().first()

    async def get_user_charts(
        self, db: AsyncSession, *, user_id: int, chart_type: str | None = None, skip: int = 0, limit: int = 100
    ) -> List[ChartModel]:
        q = select(ChartModel).where(
            ChartModel.user_id == user_id,
            ChartModel.deleted_at.is_(None),
        )
        if chart_type:
            q = q.where(ChartModel.chart_type == chart_type)
        result = await db.execute(
            q.order_by(ChartModel.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def count_user_charts(
        self, db: AsyncSession, *, user_id: int, chart_type: str | None = None
    ) -> int:
        q = select(func.count(ChartModel.id)).where(
            ChartModel.user_id == user_id,
            ChartModel.deleted_at.is_(None),
        )
        if chart_type:
            q = q.where(ChartModel.chart_type == chart_type)
        result = await db.execute(q)
        return result.scalar() or 0

    async def check_chart_limit(
        self, db: AsyncSession, *, user_id: int, subscription_type: str
    ) -> None:
        if subscription_type == SubscriptionType.PREMIUM.value:
            return
        count = await self.count_user_charts(
            db, user_id=user_id, chart_type=ChartType.NATAL.value
        )
        limit = settings.FREE_CHARTS_LIMIT
        if limit is not None and count >= limit:
            raise ValueError(
                f"Free plan allows {limit} natal chart(s). Upgrade to Premium for unlimited charts."
            )

    async def soft_delete(
        self, db: AsyncSession, *, id: int, user_id: int
    ) -> bool:
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
