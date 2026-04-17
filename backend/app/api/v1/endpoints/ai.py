from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.ai.schemas import AIInterpretRequest, AIInterpretResponse
from app.ai.service import ai_service
from app.charts.crud import chart as chart_crud
from app.core.config import logger

router = APIRouter()


@router.post("/{chart_id}/interpret", response_model=AIInterpretResponse)
async def interpret_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_id: int,
    interpret_in: AIInterpretRequest,
) -> Any:
    """
    Get AI interpretation of a chart.
    """
    logger.info("API: AI interpretation requested", user_id=current_user.id, chart_id=chart_id, request_type=interpret_in.request_type)

    # Get chart
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=current_user.id)
    if not chart:
        logger.warning("API: Chart not found for user", user_id=current_user.id, chart_id=chart_id)
        raise HTTPException(status_code=404, detail="Chart not found")

    try:
        interpretation = await ai_service.interpret_chart(
            db, current_user, chart.prompt_text, interpret_in.question
        )
        logger.info("API: AI interpretation completed", user_id=current_user.id, chart_id=chart_id)
        return AIInterpretResponse(
            interpretation=interpretation,
            request_type=interpret_in.request_type
        )
    except ValueError as e:
        logger.warning("API: AI limit reached", user_id=current_user.id, error=str(e))
        raise HTTPException(status_code=429, detail=str(e))
    except Exception as e:
        logger.error("API: AI interpretation failed", user_id=current_user.id, chart_id=chart_id, error=str(e))
        raise HTTPException(status_code=500, detail="AI interpretation failed")