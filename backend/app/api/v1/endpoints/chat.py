from typing import Any, AsyncGenerator
import json
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User, SubscriptionType
from app.chat.schemas import (
    ChatSessionResponse,
    ChatSessionListResponse,
    StartChatRequest,
    StreamMessageRequest,
)
from app.chat import crud as chat_crud
from app.ai.service import ai_service
from app.charts.crud import chart as chart_crud
from app.core.config import logger

router = APIRouter()


@router.get("", response_model=ChatSessionListResponse)
async def list_chat_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get all chat sessions for the current user."""
    user_id = current_user.id
    sessions = await chat_crud.chat_session.get_all_by_user(db, user_id=user_id)
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
        raise HTTPException(status_code=404, detail="Chat session not found")
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
        raise HTTPException(status_code=404, detail="Chart not found")

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
    logger.info("Chat session created", session_id=session.id, chart_id=chart_id)
    return session


async def generate_sse(
    session_id: int,
    user_message_content: str,
    db: AsyncSession,
    user_id: int,
    subscription_type: SubscriptionType,
    chart_prompt_text: str,
) -> AsyncGenerator[str, None]:
    """
    Generate SSE stream for AI response.
    Accepts only primitive types to avoid SQLAlchemy lazy-loading
    in async generator context (MissingGreenlet).
    """
    full_response = ""

    try:
        # Save user message
        user_message = await chat_crud.chat_message.create(
            db, session_id=session_id, role="user", content=user_message_content
        )
        logger.info("User message saved", session_id=session_id, message_id=user_message.id)

        yield f"data: {json.dumps({'type': 'user_message', 'content': user_message_content})}\n\n"
        await asyncio.sleep(0.01)

        # Stream AI response — passes primitives only, no ORM objects
        async for chunk in ai_service.stream_interpret_chart(
            db, user_id, subscription_type, chart_prompt_text, user_message_content
        ):
            full_response += chunk
            yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"

        # Save assistant message
        assistant_message = await chat_crud.chat_message.create(
            db, session_id=session_id, role="assistant", content=full_response
        )
        logger.info("Assistant message saved", session_id=session_id, message_id=assistant_message.id)

        yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_message.id})}\n\n"

    except ValueError as e:
        logger.warning("AI limit reached in stream", user_id=user_id, error=str(e))
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    except Exception as e:
        logger.error("AI streaming failed", error=str(e), user_id=user_id)
        yield f"data: {json.dumps({'type': 'error', 'error': 'AI interpretation failed'})}\n\n"


@router.post("/{session_id}/stream")
async def stream_chat_message(
    session_id: int,
    request: StreamMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Stream AI response for a chat message using SSE."""
    # Extract all primitive values from ORM objects BEFORE creating StreamingResponse.
    # This is critical: once StreamingResponse is returned, the DB session context
    # is no longer guaranteed, and accessing lazy-loaded ORM attributes causes
    # sqlalchemy.exc.MissingGreenlet.
    user_id: int = current_user.id
    subscription_type: SubscriptionType = current_user.subscription_type

    session = await chat_crud.chat_session.get_by_id(db, session_id=session_id, user_id=user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    chart_id: int = session.chart_id

    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=user_id)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    prompt_text: str = chart.prompt_text or ""

    return StreamingResponse(
        generate_sse(
            session_id=session_id,
            user_message_content=request.content,
            db=db,
            user_id=user_id,
            subscription_type=subscription_type,
            chart_prompt_text=prompt_text,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
