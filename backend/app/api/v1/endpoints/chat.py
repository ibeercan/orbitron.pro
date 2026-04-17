from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.chat.schemas import (
    ChatSessionResponse,
    ChatSessionListResponse,
    SendMessageRequest,
    SendMessageResponse,
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


@router.post("/{session_id}/messages", response_model=SendMessageResponse)
async def send_message(
    session_id: int,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Send a message to a chat session and get AI response.
    """
    # Get session
    session = await chat_crud.chat_session.get_by_id(db, session_id=session_id, user_id=current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Get chart
    chart = await chart_crud.get_by_id_and_user(db, id=str(session.chart_id), user_id=current_user.id)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    # Save user message
    user_message = await chat_crud.chat_message.create(
        db, session_id=session_id, role="user", content=request.content
    )
    logger.info("User message saved", session_id=session_id, message_id=user_message.id)

    # Get AI response
    try:
        interpretation = await ai_service.interpret_chart(
            db, current_user, chart.prompt_text, request.content
        )
    except ValueError as e:
        # AI limit reached
        await db.rollback()
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        logger.error("AI interpretation failed", error=str(e))
        raise HTTPException(status_code=500, detail="AI interpretation failed")

    # Save assistant message
    assistant_message = await chat_crud.chat_message.create(
        db, session_id=session_id, role="assistant", content=interpretation
    )
    logger.info("Assistant message saved", session_id=session_id, message_id=assistant_message.id)

    # Refresh session with messages
    session = await chat_crud.chat_session.get_by_id(db, session_id=session_id, user_id=current_user.id)
    
    return SendMessageResponse(
        message=assistant_message,
        session=session
    )


@router.post("/chart/{chart_id}/start", response_model=ChatSessionResponse)
async def start_chat_for_chart(
    chart_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Start a new chat session for a specific chart.
    """
    # Get chart
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=current_user.id)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    # Check if session already exists for this chart
    existing_session = await chat_crud.chat_session.get_by_chart(
        db, chart_id=int(chart_id), user_id=current_user.id
    )
    if existing_session:
        return existing_session

    # Create new session
    session = await chat_crud.chat_session.create(
        db,
        user_id=current_user.id,
        chart_id=int(chart_id),
        title=f"Chat - {chart.native_data.get('datetime', 'Chart')}"
    )
    logger.info("Chat session created", session_id=session.id, chart_id=chart_id)

    return session