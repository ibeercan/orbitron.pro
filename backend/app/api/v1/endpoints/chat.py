from typing import Annotated, Any, AsyncGenerator
import json
import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User, SubscriptionType
from app.chat.schemas import (
    ChatSessionResponse,
    ChatSessionListItemResponse,
    ChatSessionListResponse,
    StartChatRequest,
    StreamMessageRequest,
)
from app.chat import crud as chat_crud
from app.ai.service import ai_service
from app.charts.crud import chart as chart_crud
from app.core.logging import logger

router = APIRouter()


@router.get("", response_model=ChatSessionListResponse)
async def list_chat_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> Any:
    """Get all chat sessions for the current user (paginated, without messages)."""
    user_id = current_user.id
    sessions = await chat_crud.chat_session.get_all_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return ChatSessionListResponse(sessions=sessions)


@router.get("/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get a specific chat session with messages."""
    user_id = current_user.id
    session = await chat_crud.chat_session.get_by_id(db, session_id=session_id, user_id=user_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")
    return session


@router.post("/chart/{chart_id}/start", response_model=ChatSessionResponse)
async def start_chat_for_chart(
    chart_id: int,
    request: StartChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Start or resume a chat session for a specific chart."""
    user_id = current_user.id

    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=user_id)
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")

    chart_datetime = (chart.native_data or {}).get("datetime", "Chart")

    existing_session = await chat_crud.chat_session.get_by_chart(
        db, chart_id=chart_id, user_id=user_id
    )
    if existing_session:
        return existing_session

    session = await chat_crud.chat_session.create(
        db,
        user_id=user_id,
        chart_id=chart_id,
        title=request.title or f"Chat - {chart_datetime}"
    )
    await db.commit()
    logger.info("Chat session created", session_id=session.id, chart_id=chart_id)
    return session


async def generate_sse(
    session_id: int,
    user_message_content: str,
    db: AsyncSession,
    user_id: int,
    subscription_type: str,
    chart_prompt_text: str,
    chart_id: int,
    chart_type: str = "natal",
) -> AsyncGenerator[str, None]:
    """Generate SSE stream for AI response."""
    full_response = ""

    try:
        user_message = await chat_crud.chat_message.create(
            db, session_id=session_id, role="user", content=user_message_content
        )
        await db.commit()
        logger.info("User message saved", session_id=session_id, message_id=user_message.id)

        yield f"data: {json.dumps({'type': 'user_message', 'content': user_message_content})}\n\n"
        await asyncio.sleep(0.01)

        async for chunk in ai_service.stream_interpret_chart(
            db, user_id, subscription_type, chart_prompt_text, user_message_content, chart_id, chart_type
        ):
            full_response += chunk
            yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"

    except ValueError as e:
        logger.warning("AI limit reached in stream", user_id=user_id, error=str(e))
        full_response = f"Ошибка: {e}"
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    except Exception as e:
        logger.error("AI streaming failed", error=str(e), user_id=user_id)
        full_response = "Ошибка: AI interpretation failed"
        yield f"data: {json.dumps({'type': 'error', 'error': 'AI interpretation failed'})}\n\n"

    if full_response:
        try:
            await db.rollback()
        except Exception:
            pass
        try:
            assistant_message = await chat_crud.chat_message.create(
                db, session_id=session_id, role="assistant", content=full_response
            )
            await db.commit()
            logger.info("Assistant message saved", session_id=session_id, message_id=assistant_message.id)
            yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_message.id})}\n\n"
        except Exception as e:
            logger.error("Failed to save assistant message", error=str(e), session_id=session_id)
    else:
        try:
            await db.rollback()
        except Exception:
            pass


@router.post("/{session_id}/stream")
async def stream_chat_message(
    session_id: int,
    request: StreamMessageRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> StreamingResponse:
    """Stream AI response for a chat message using SSE."""
    user_id: int = current_user.id
    subscription_type: SubscriptionType = current_user.subscription_type

    session = await chat_crud.chat_session.get_by_id(db, session_id=session_id, user_id=user_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    chart_id: int = session.chart_id

    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=user_id)
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")

    prompt_text: str = chart.prompt_text or ""
    chart_type: str = chart.chart_type or "natal"

    return StreamingResponse(
        generate_sse(
            session_id=session_id,
            user_message_content=request.content,
            db=db,
            user_id=user_id,
            subscription_type=subscription_type,
            chart_prompt_text=prompt_text,
            chart_id=chart_id,
            chart_type=chart_type,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )