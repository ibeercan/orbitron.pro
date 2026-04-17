from datetime import datetime
from typing import Optional, AsyncGenerator

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings, logger
from app.models.request import RequestLog
from app.models.user import User, SubscriptionType


def create_ai_agent() -> Agent:
    """
    Create AI agent using the current pydantic-ai API.

    In pydantic-ai >= 0.1.x the model is OpenAIChatModel and credentials
    are passed via OpenAIProvider (not directly to the model constructor).
    This supports any OpenAI-compatible endpoint via base_url.
    """
    if not settings.AI_API_KEY:
        raise ValueError("AI_API_KEY is not configured")

    provider_kwargs: dict = {"api_key": settings.AI_API_KEY}
    if settings.AI_BASE_URL:
        provider_kwargs["base_url"] = settings.AI_BASE_URL

    provider = OpenAIProvider(**provider_kwargs)
    model = OpenAIChatModel(settings.AI_MODEL, provider=provider)

    return Agent(
        model,
        system_prompt=(
            "You are an expert astrologer. Interpret natal charts based on provided data. "
            "Respond in the same language as the user's question."
        ),
    )


class AIService:
    def __init__(self):
        self._agent: Optional[Agent] = None

    @property
    def agent(self) -> Agent:
        if self._agent is None:
            self._agent = create_ai_agent()
        return self._agent

    async def _check_and_log_request(
        self,
        db: AsyncSession,
        user_id: int,
        subscription_type: SubscriptionType,
        endpoint: str,
    ) -> None:
        """
        Check monthly AI request limit and log the request.
        Raises ValueError if limit reached.
        """
        if subscription_type != SubscriptionType.PREMIUM:
            start_of_month = datetime.utcnow().replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            result = await db.execute(
                select(func.count(RequestLog.id)).where(
                    RequestLog.user_id == user_id,
                    RequestLog.endpoint == "/ai/interpret",
                    RequestLog.timestamp >= start_of_month,
                )
            )
            count = result.scalar() or 0
            logger.info(
                "AI limit check",
                user_id=user_id,
                current_count=count,
                limit=settings.FREE_AI_REQUESTS_PER_MONTH,
            )
            if count >= settings.FREE_AI_REQUESTS_PER_MONTH:
                raise ValueError(
                    f"AI request limit reached ({settings.FREE_AI_REQUESTS_PER_MONTH}/month for free users)"
                )

        log_entry = RequestLog(user_id=user_id, endpoint=endpoint)
        db.add(log_entry)
        await db.commit()
        logger.info("AI request logged", user_id=user_id)

    def _build_prompt(self, prompt_text: str, question: str) -> str:
        """Build the full prompt for the AI model."""
        user_question = question.strip() or "Provide a general interpretation of this natal chart"
        return (
            f"Astrological Chart Data:\n{prompt_text}\n\n"
            f"User Question: {user_question}\n\n"
            "Please provide a detailed astrological interpretation in the user's language, "
            "focusing on personality traits, life themes, and potential."
        )

    async def interpret_chart(
        self,
        db: AsyncSession,
        user: User,
        prompt_text: str,
        question: str = "",
    ) -> str:
        """Non-streaming chart interpretation."""
        user_id: int = user.id
        subscription_type: SubscriptionType = user.subscription_type

        logger.info("AI interpretation requested", user_id=user_id)
        await self._check_and_log_request(db, user_id, subscription_type, "/ai/interpret")

        full_prompt = self._build_prompt(prompt_text, question)
        try:
            result = await self.agent.run(full_prompt)
            # pydantic-ai v0.x: result.output (not result.data)
            output = result.output
            logger.info("AI interpretation completed", user_id=user_id, length=len(output))
            return output
        except Exception as e:
            logger.error("AI interpretation failed", user_id=user_id, error=str(e))
            raise

    async def stream_interpret_chart(
        self,
        db: AsyncSession,
        user_id: int,
        subscription_type: SubscriptionType,
        prompt_text: str,
        question: str = "",
    ) -> AsyncGenerator[str, None]:
        """
        Stream chart interpretation using pydantic-ai's run_stream_events API.

        Uses run_stream_events() which yields AgentStreamEvent objects.
        Text deltas arrive as PartDeltaEvent with delta.content_delta.

        Args:
            db: Database session
            user_id: Pre-extracted user ID (never pass User ORM object into generators)
            subscription_type: Pre-extracted subscription type
            prompt_text: Astrological chart data
            question: User's question
        """
        logger.info("AI streaming requested", user_id=user_id)
        await self._check_and_log_request(db, user_id, subscription_type, "/chat/stream")

        full_prompt = self._build_prompt(prompt_text, question)

        try:
            # pydantic-ai: run_stream_events returns AsyncIterator[AgentStreamEvent | AgentRunResultEvent]
            # PartDeltaEvent carries incremental text in event.delta.content_delta
            async for event in self.agent.run_stream_events(full_prompt):
                event_type = type(event).__name__
                if event_type == "PartDeltaEvent":
                    delta = getattr(event, "delta", None)
                    if delta is not None:
                        content_delta = getattr(delta, "content_delta", None)
                        if content_delta:
                            yield content_delta
            logger.info("AI streaming completed", user_id=user_id)
        except Exception as e:
            logger.error("AI streaming failed", user_id=user_id, error=str(e))
            raise


ai_service = AIService()
