"""AI service with streaming, retry, caching, fallback models and token tracking."""

import hashlib
from datetime import datetime, timezone
from typing import AsyncGenerator

import redis.asyncio as redis
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.core.config import settings, AIProviderConfig, CHART_TYPE_PROMPT_HINTS
from app.core.logging import logger
from app.models.request import RequestLog
from app.models.user import SubscriptionType

SYSTEM_PROMPT = settings.system_prompt

AI_CACHE_ENABLED = settings.AI_CACHE_ENABLED
AI_CACHE_TTL_SECONDS = settings.AI_CACHE_TTL_SECONDS
AI_RETRY_MAX_ATTEMPTS = settings.AI_RETRY_MAX_ATTEMPTS
AI_RETRY_MIN_WAIT = settings.AI_RETRY_MIN_WAIT
AI_RETRY_MAX_WAIT = settings.AI_RETRY_MAX_WAIT
AI_TOKEN_TRACKING_ENABLED = settings.AI_TOKEN_TRACKING_ENABLED
AI_COST_PER_1K_PROMPT = settings.AI_COST_PER_1K_PROMPT
AI_COST_PER_1K_COMPLETION = settings.AI_COST_PER_1K_COMPLETION

_redis_pool = None


def create_ai_agent(model_name: str, provider: AIProviderConfig) -> Agent:
    """Create AI agent from provider config."""
    provider_kwargs = {"api_key": provider.api_key}
    if provider.base_url:
        provider_kwargs["base_url"] = provider.base_url

    provider_obj = OpenAIProvider(**provider_kwargs)
    chat_model = OpenAIChatModel(model_name, provider=provider_obj)

    return Agent(chat_model, system_prompt=SYSTEM_PROMPT)


async def get_redis():
    """Get Redis connection, return None if unavailable."""
    global _redis_pool
    if not AI_CACHE_ENABLED:
        return None
    try:
        if _redis_pool is None:
            _redis_pool = redis.from_url(settings.REDIS_URL, decode_responses=False)
        return _redis_pool
    except Exception as e:
        logger.warning("Redis connection failed", error=str(e))
        return None


AI_ERRORS_RETRY = (Exception,)


def get_cache_key(chart_id: int, prompt_text: str, question: str) -> str:
    """Generate cache key from chart data and question."""
    data = f"{chart_id}:{prompt_text[:100]}:{question}"
    return f"ai_cache:{hashlib.md5(data.encode()).hexdigest()}"


def calculate_cost(prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate API cost in USD."""
    return (prompt_tokens / 1000 * AI_COST_PER_1K_PROMPT) + \
           (completion_tokens / 1000 * AI_COST_PER_1K_COMPLETION)


async def call_with_fallback(prompt: str) -> tuple:
    """Call AI with fallback across providers and models.

    Returns tuple of (result, model_name).
    Raises RuntimeError if all providers fail or none configured.
    """
    providers = settings.ai_providers

    if not providers:
        raise RuntimeError("No AI providers configured. Set AI_PROVIDERS in .env")

    errors = []
    for provider in providers:
        for model_name in provider.models:
            try:
                agent = create_ai_agent(model_name, provider)
                result = await agent.run(prompt)
                logger.info("AI request success", provider=provider.name, model=model_name)
                return result, model_name
            except Exception as e:
                error_type = type(e).__name__
                logger.warning(
                    "AI model failed, trying next model",
                    provider=provider.name,
                    model=model_name,
                    error=error_type,
                    error_message=str(e),
                )
                errors.append(f"{provider.name}/{model_name}: {error_type}")
                continue

        logger.warning("All models failed for provider", provider=provider.name)

    raise RuntimeError(f"All AI providers failed: {', '.join(errors)}")


class AIService:
    """AI Service with streaming, retry, caching, fallback and token tracking."""

    async def _check_and_log_request(
        self,
        db: AsyncSession,
        user_id: int,
        subscription_type: str,
        endpoint: str,
        chart_id: int | None = None,
        method: str = "POST",
    ) -> None:
        if subscription_type != SubscriptionType.PREMIUM.value:
            start_of_month = datetime.now(timezone.utc).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            result = await db.execute(
                select(func.count(RequestLog.id)).where(
                    RequestLog.user_id == user_id,
                    RequestLog.endpoint == endpoint,
                    RequestLog.created_at >= start_of_month,
                )
            )
            count = result.scalar() or 0
            logger.info(
                "ai_limit_check",
                user_id=user_id,
                current_count=count,
                limit=settings.FREE_AI_REQUESTS_PER_MONTH,
            )
            if count >= settings.FREE_AI_REQUESTS_PER_MONTH:
                raise ValueError(
                    f"AI request limit reached ({settings.FREE_AI_REQUESTS_PER_MONTH}/month for free users)"
                )

        log_entry = RequestLog(
            user_id=user_id,
            endpoint=endpoint,
            chart_id=chart_id,
            method=method,
        )
        async with db.begin_nested():
            db.add(log_entry)
            await db.flush()
        await db.commit()
        logger.info("ai_request_logged", user_id=user_id, endpoint=endpoint, chart_id=chart_id)

    def _build_prompt(self, prompt_text: str, question: str, chart_type: str = "natal") -> str:
        user_question = question.strip() or "Дай общую интерпретацию этой натальной карты"
        hint = CHART_TYPE_PROMPT_HINTS.get(chart_type, "")
        chart_label = {"natal": "НАТАЛЬНОЙ КАРТЫ", "synastry": "СИНАСТРИИ", "transit": "ТРАНЗИТОВ", "solar_return": "СОЛЯРНОГО ВОЗВРАТА", "lunar_return": "ЛУНАРНОГО ВОЗВРАТА", "profection": "ПРОФЕКЦИИ", "solar_arc": "СОЛЯРНЫХ ДУГ", "progression": "ВТОРИЧНЫХ ПРОГРЕССИЙ", "composite": "КОМПОЗИТНОЙ КАРТЫ", "davison": "КАРТЫ ДАВИДСОНА", "horary": "ХОРАРНОЙ КАРТЫ"}.get(chart_type, "НАТАЛЬНОЙ КАРТЫ")
        prompt = (
            f"ДАННЫЕ {chart_label}:\n{prompt_text}\n\n"
            f"ВОПРОС ПОЛЬЗОВАТЕЛЯ: {user_question}\n\n"
            "Дай профессиональную астрологическую интерпретацию, опираясь на данные карты выше. "
            "Отвечай на том же языке, что и вопрос пользователя. "
            "Сразу начинай с ответа — без вступительных фраз и без показа рассуждений."
        )
        if hint:
            prompt += f"\n\nКОНТЕКСТ: {hint}"
        return prompt

    async def _log_token_usage(
        self,
        db: AsyncSession,
        user_id: int,
        model_name: str,
        prompt_tokens: int,
        completion_tokens: int,
    ) -> None:
        if not AI_TOKEN_TRACKING_ENABLED:
            return

        try:
            total_tokens = prompt_tokens + completion_tokens
            cost = calculate_cost(prompt_tokens, completion_tokens)

            from app.ai.token_usage import TokenUsage
            usage = TokenUsage(
                user_id=user_id,
                model=model_name,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                cost_usd=cost,
            )
            async with db.begin_nested():
                db.add(usage)
                await db.flush()
            await db.commit()
            logger.info(
                "ai_token_usage_logged",
                user_id=user_id,
                model=model_name,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                cost_usd=cost,
            )
        except Exception as e:
            logger.error("ai_token_usage_log_failed", error=str(e))
            try:
                await db.rollback()
            except Exception:
                pass

    async def _get_cached_response(self, chart_id: int, prompt_text: str, question: str) -> str | None:
        if not AI_CACHE_ENABLED:
            return None

        try:
            redis_client = await get_redis()
            if not redis_client:
                return None

            cache_key = get_cache_key(chart_id, prompt_text, question)
            cached = await redis_client.get(cache_key)
            if cached:
                logger.info("ai_cache_hit", chart_id=chart_id)
                return cached.decode("utf-8") if isinstance(cached, bytes) else cached
        except Exception as e:
            logger.warning("ai_cache_get_failed", error=str(e))

        return None

    async def _set_cached_response(
        self,
        chart_id: int,
        prompt_text: str,
        question: str,
        response: str,
    ) -> None:
        if not AI_CACHE_ENABLED:
            return

        try:
            redis_client = await get_redis()
            if not redis_client:
                return

            cache_key = get_cache_key(chart_id, prompt_text, question)
            await redis_client.setex(cache_key, AI_CACHE_TTL_SECONDS, response)
            logger.info("ai_cache_set", chart_id=chart_id, ttl=AI_CACHE_TTL_SECONDS)
        except Exception as e:
            logger.warning("ai_cache_set_failed", error=str(e))

    @retry(
        stop=stop_after_attempt(AI_RETRY_MAX_ATTEMPTS),
        wait=wait_exponential(multiplier=1, min=AI_RETRY_MIN_WAIT, max=AI_RETRY_MAX_WAIT),
        retry=retry_if_exception_type(AI_ERRORS_RETRY),
        reraise=True,
    )
    async def _call_ai_with_retry(self, prompt: str, chart_id: int = None) -> tuple:
        result, model_name = await call_with_fallback(prompt)
        return result, model_name

    async def stream_interpret_chart(
        self,
        db: AsyncSession,
        user_id: int,
        subscription_type: str,
        prompt_text: str,
        question: str = "",
        chart_id: int = None,
        chart_type: str = "natal",
    ) -> AsyncGenerator[str, None]:
        logger.info("ai_streaming_requested", user_id=user_id, chart_id=chart_id, chart_type=chart_type)
        await self._check_and_log_request(db, user_id, subscription_type, "/chat/stream", chart_id=chart_id)

        full_prompt = self._build_prompt(prompt_text, question, chart_type)

        if chart_id:
            cached_response = await self._get_cached_response(chart_id, prompt_text, question)
            if cached_response:
                yield cached_response
                return

        try:
            result, model_name = await self._call_ai_with_retry(full_prompt, chart_id)

            output = result.output
            usage = result.usage()

            if usage and AI_TOKEN_TRACKING_ENABLED:
                await self._log_token_usage(
                    db,
                    user_id,
                    model_name,
                    usage.input_tokens or 0,
                    usage.output_tokens or 0,
                )

            if chart_id and output:
                await self._set_cached_response(chart_id, prompt_text, question, output)

            yield output
            logger.info("ai_streaming_completed", user_id=user_id, model=model_name, length=len(output))

        except Exception as e:
            logger.error("ai_streaming_failed", user_id=user_id, error=str(e))
            raise


ai_service = AIService()