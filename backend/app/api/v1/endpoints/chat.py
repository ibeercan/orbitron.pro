from typing import Any, AsyncGenerator
import json
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
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
    """
    Get all chat sessions for the current user.
    """
    sessions = await chat_crud.chat_session.get_all_by_user(db, user_id=current_user.id)
    return ChatSessionListResponse(sessions=sessions)


@router.get("/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific chat session with messages.
    """
    session = await chat_crud.chat_session.get_by_id(db, session_id=session_id, user_id=current_user.id)
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
    """
    Start a new chat session for a specific chart.
    """
    # Cache user_id before any DB operations
    user_id = current_user.id

    # Get chart
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=user_id)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    # Read native_data while chart is still loaded
    chart_datetime = (chart.native_data or {}).get("datetime", "Chart")

    # Check if session already exists for this chart
    existing_session = await chat_crud.chat_session.get_by_chart(
        db, chart_id=chart_id, user_id=user_id
    )
    if existing_session:
        return existing_session

    # Create new session (CRUD reloads with selectinload to avoid MissingGreenlet)
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
    current_user: User,
    chart_prompt_text: str,
) -> AsyncGenerator[str, None]:
    """
    Generate SSE stream for AI response.
    """
    full_response = ""
    message_id = None

    try:
        # Save user message
        user_message = await chat_crud.chat_message.create(
            db, session_id=session_id, role="user", content=user_message_content
        )
        message_id = user_message.id
        logger.info("User message saved", session_id=session_id, message_id=message_id)

        # Yield user message confirmation
        yield f"data: {json.dumps({'type': 'user_message', 'content': user_message_content})}\n\n"
        await asyncio.sleep(0.05)

        # Pre-cache user data to avoid MissingGreenlet in async generator
        user_id = current_user.id
        subscription_type = current_user.subscription_type

        # Stream AI response
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

        # Yield completion
        yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_message.id})}\n\n"

    except ValueError as e:
        logger.warning("AI limit reached in stream", user_id=user_id)
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
    """
    Stream AI response for a chat message using SSE.
    """
    # Cache user_id before any DB operations to avoid MissingGreenlet
    user_id = current_user.id

    # Get session
    session = await chat_crud.chat_session.get_by_id(db, session_id=session_id, user_id=user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Read chart_id while session is loaded
    chart_id = session.chart_id

    # Get chart
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=user_id)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    # Read prompt_text while chart is loaded
    prompt_text = chart.prompt_text or ""

    return StreamingResponse(
        generate_sse(
            session_id=session_id,
            user_message_content=request.content,
            db=db,
            current_user=current_user,
            chart_prompt_text=prompt_text,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )