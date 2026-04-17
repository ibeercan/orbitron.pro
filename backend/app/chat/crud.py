from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload

from app.models.chat import ChatSession, ChatMessage, MessageRole


class CRUDChatSession:
    async def get_by_id(self, db: AsyncSession, session_id: int, user_id: int) -> Optional[ChatSession]:
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .options(selectinload(ChatSession.messages))
        )
        return result.scalars().first()

    async def get_by_chart(self, db: AsyncSession, chart_id: int, user_id: int) -> Optional[ChatSession]:
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.chart_id == chart_id, ChatSession.user_id == user_id)
            .options(selectinload(ChatSession.messages))
            .order_by(ChatSession.updated_at.desc())
        )
        return result.scalars().first()

    async def get_all_by_user(self, db: AsyncSession, user_id: int) -> list[ChatSession]:
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .options(selectinload(ChatSession.messages))
            .order_by(ChatSession.updated_at.desc())
        )
        return result.scalars().all()

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
        await db.commit()
        await db.refresh(session)
        return session

    async def update_title(self, db: AsyncSession, session_id: int, title: str) -> Optional[ChatSession]:
        await db.execute(
            update(ChatSession)
            .where(ChatSession.id == session_id)
            .values(title=title)
        )
        await db.commit()
        
        result = await db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
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
        
        # Update session updated_at
        await db.execute(
            update(ChatSession)
            .where(ChatSession.id == session_id)
            .values(updated_at=func.now())
        )
        
        await db.commit()
        await db.refresh(message)
        return message


chat_session = CRUDChatSession()
chat_message = CRUDChatMessage()