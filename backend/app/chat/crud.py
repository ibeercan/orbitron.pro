from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload

from app.models.chat import ChatSession, ChatMessage, MessageRole


class CRUDChatSession:
    async def get_by_id(self, db: AsyncSession, session_id: int, user_id: int) -> Optional[ChatSession]:
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.id == session_id, ChatSession.user_id == user_id, ChatSession.deleted_at.is_(None))
            .options(selectinload(ChatSession.messages))
        )
        return result.scalars().first()

    async def get_by_chart(self, db: AsyncSession, chart_id: int, user_id: int) -> Optional[ChatSession]:
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.chart_id == chart_id, ChatSession.user_id == user_id, ChatSession.deleted_at.is_(None))
            .options(selectinload(ChatSession.messages))
            .order_by(ChatSession.updated_at.desc())
        )
        return result.scalars().first()

    async def get_all_by_user(self, db: AsyncSession, user_id: int, skip: int = 0, limit: int = 50) -> list[ChatSession]:
        """List sessions for a user without loading all messages (pagination)."""
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == user_id, ChatSession.deleted_at.is_(None))
            .order_by(ChatSession.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(
        self,
        db: AsyncSession,
        user_id: int,
        chart_id: int,
        title: Optional[str] = None
    ) -> ChatSession:
        session = ChatSession(
            user_id=user_id,
            chart_id=chart_id,
            title=title or f"Chat for chart {chart_id}"
        )
        db.add(session)
        await db.flush()

        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.id == session.id)
            .options(selectinload(ChatSession.messages))
        )
        return result.scalars().first()

    async def update_title(self, db: AsyncSession, session_id: int, title: str) -> Optional[ChatSession]:
        await db.execute(
            update(ChatSession)
            .where(ChatSession.id == session_id)
            .values(title=title)
        )

        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.id == session_id)
            .options(selectinload(ChatSession.messages))
        )
        return result.scalars().first()


class CRUDChatMessage:
    async def create(
        self,
        db: AsyncSession,
        session_id: int,
        role: MessageRole,
        content: str
    ) -> ChatMessage:
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content
        )
        db.add(message)

        await db.execute(
            update(ChatSession)
            .where(ChatSession.id == session_id)
            .values(updated_at=func.now())
        )

        await db.flush()
        await db.refresh(message)
        return message


chat_session = CRUDChatSession()
chat_message = CRUDChatMessage()