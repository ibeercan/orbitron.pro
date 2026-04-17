from datetime import datetime, timedelta
from typing import Optional, AsyncGenerator

from pydantic_ai import Agent
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings, logger
from app.models.request import RequestLog
from app.models.user import User, SubscriptionType


def create_ai_agent() -> Agent:
    """Create AI agent with proper model initialization."""
    if not settings.AI_API_KEY:
        raise ValueError("AI_API_KEY is not configured")
    
    model_name = settings.AI_MODEL
    
    # Try to create with OpenAI model (works with custom base_url)
    try:
        model = OpenAIModel(
            model_name=model_name,
            api_key=settings.AI_API_KEY,
            base_url=settings.AI_BASE_URL,
        )
    except Exception as e:
        logger.warning("Failed to create OpenAI model, trying generic", error=str(e))
        model = model_name
    
    return Agent(
        model,
        system_prompt="You are an expert astrologer. Interpret natal charts based on provided data."
    )


class AIService:
    def __init__(self):
        self._agent: Optional[Agent] = None
    
    @property
    def agent(self) -> Agent:
        """Lazy initialization of AI agent."""
        if self._agent is None:
            self._agent = create_ai_agent()
        return self._agent

    async def check_ai_limit(
        self, 
        db: AsyncSession, 
        user_id: int,
        subscription_type: SubscriptionType,
    ) -> bool:
        """Check if user has reached AI request limit."""
        if subscription_type == SubscriptionType.PREMIUM:
            logger.info("Premium user - no AI limit", user_id=user_id)
            return True

        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        result = await db.execute(
            select(func.count(RequestLog.id)).where(
                RequestLog.user_id == user_id,
                RequestLog.endpoint == "/ai/interpret",
                RequestLog.timestamp >= start_of_month
            )
        )
        count = result.scalar()
        limit_reached = count >= settings.FREE_AI_REQUESTS_PER_MONTH
        logger.info("AI limit check", user_id=user_id, current_count=count, limit=settings.FREE_AI_REQUESTS_PER_MONTH, limit_reached=limit_reached)
        return not limit_reached

    async def interpret_chart(
        self, db: AsyncSession, user: User, prompt_text: str, question: str = ""
    ) -> str:
        """Interpret chart using AI."""
        logger.info("AI interpretation requested", user_id=user.id, question_length=len(question))

        # Pre-compute subscription type to avoid lazy loading issues
        subscription_type = user.subscription_type

        if not await self.check_ai_limit(db, user.id, subscription_type):
            logger.warning("AI request limit reached", user_id=user.id)
            raise ValueError("AI request limit reached for free users")

        log_entry = RequestLog(user_id=user.id, endpoint="/ai/interpret")
        db.add(log_entry)
        await db.commit()
        logger.info("AI request logged", user_id=user.id, request_id=log_entry.id)

        full_prompt = f"""Astrological Chart Data:
{prompt_text}

User Question: {question or "Provide a general interpretation of this natal chart"}

Please provide a detailed astrological interpretation focusing on personality traits, life themes, and potential.
"""
        try:
            result = await self.agent.run(full_prompt)
            logger.info("AI interpretation completed", user_id=user.id, response_length=len(result.data))
            return result.data
        except Exception as e:
            logger.error("AI interpretation failed", user_id=user.id, error=str(e))
            raise

    async def stream_interpret_chart(
        self,
        db: AsyncSession,
        user_id: int,
        subscription_type: SubscriptionType,
        prompt_text: str,
        question: str = "",
    ) -> AsyncGenerator[str, None]:
        """Stream chart interpretation using AI.
        
        Args:
            db: Database session
            user_id: Pre-computed user ID (not User object)
            subscription_type: Pre-computed subscription type to avoid lazy loading
            prompt_text: Chart data for AI
            question: User question
        """
        logger.info("AI streaming interpretation requested", user_id=user_id, question_length=len(question))

        # Use pre-computed values to avoid MissingGreenlet
        if subscription_type != SubscriptionType.PREMIUM:
            start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            result = await db.execute(
                select(func.count(RequestLog.id)).where(
                    RequestLog.user_id == user_id,
                    RequestLog.endpoint == "/ai/interpret",
                    RequestLog.timestamp >= start_of_month
                )
            )
            count = result.scalar()
            if count >= settings.FREE_AI_REQUESTS_PER_MONTH:
                logger.warning("AI request limit reached", user_id=user_id)
                raise ValueError("AI request limit reached for free users")

        # Log the request
        log_entry = RequestLog(user_id=user_id, endpoint="/chat/stream")
        db.add(log_entry)
        await db.commit()
        logger.info("AI request logged for streaming", user_id=user_id, request_id=log_entry.id)

        full_prompt = f"""Astrological Chart Data:
{prompt_text}

User Question: {question or "Provide a general interpretation of this natal chart"}

Please provide a detailed astrological interpretation focusing on personality traits, life themes, and potential.
"""
        try:
            async with self.agent.run_stream(full_prompt) as result:
                async for text in result.stream_text(delta=True):
                    if text:
                        yield text
            logger.info("AI streaming interpretation completed", user_id=user_id)
        except Exception as e:
            logger.error("AI streaming interpretation failed", user_id=user_id, error=str(e))
            raise


ai_service = AIService()