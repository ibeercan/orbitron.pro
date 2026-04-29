import json
import logging
from pathlib import Path
from typing import List, Optional

from pydantic import BaseModel, field_validator
from pydantic_settings import BaseSettings


class AIProviderConfig(BaseModel):
    name: str
    api_key: str
    base_url: str = ""
    models: List[str] = []
    enabled: bool = True

    @field_validator("api_key")
    @classmethod
    def api_key_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("api_key must not be empty")
        return v

    @field_validator("models")
    @classmethod
    def models_not_empty(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("models list must not be empty")
        return v


_DEFAULT_SYSTEM_PROMPT = """Ты — профессиональный астролог с глубокими знаниями натальной астрологии. \
Твоя задача — давать точные, красивые и вдохновляющие интерпретации натальных карт.

ПРАВИЛА ОТВЕТА:
1. ВСЕГДА отвечай на том же языке, на котором задан вопрос. Если вопрос на русском — отвечай на русском.
2. Отвегай ТОЛЬКО готовым ответом — без вступлений типа "Давайте разберём", "Конечно!" или пересказа вопроса.
3. Никогда не показывай свои размышления или внутренний процесс рассуждения.
4. Используй красивое Markdown-форматирование: заголовки (###), жирный текст (**), курсив (*), списки.
5. Структура ответа:
   - Краткий введение (1–2 предложения) о ключевом элементе карты
   - Основные разделы с заголовками ###
   - Конкретные интерпретации с привязкой к данным карты
   - Практические советы или ключевые темы в конце
6. Не используй смайлики 😊.
7. Длина ответа — умеренная: детально, но без воды. Максимум 500–600 слов.
8. Астрологические термины пиши по-русски с оригиналом в скобках при первом упоминании, например: Рыбы (Pisces)."""

CHART_TYPE_PROMPT_HINTS: dict[str, str] = {
    "natal": "",
    "synastry": "Это синастрия — карта совместимости двух людей. Анализируй взаимодействие их карт: аспекты между планетами, доменные оверлеи, зоны гармонии и напряжения. Давай конкретные рекомендации для пары.",
    "transit": "Это карта транзитов — текущие планетные влияния на натальную карту. Объясни, какие темы активированы, когда влияние усиливается и ослабевает. Укажи точные даты точных аспектов и их значение.",
    "solar_return": "Это солярный возврат — карта на год вперед от дня рождения. Интерпретируй ключевые темы года: дома, на которые падает Асценден и куспиды, положение управителя года, важные аспекты.",
    "lunar_return": "Это лунарный возврат — карта на месяц вперёд. Фокусируйся на эмоциональных темах, бытовых вопросах, внутрисемейной динамике. Управитель лунара и его дом — ключевые.",
    "profection": "Это профекция — годовой прогноз по домам. Интерпретируй профекционный дом, управитель года и его положение, планеты в профекционном доме. Укажи темы года и практические советы.",
    "solar_arc": "Это солярные дирекции — прогностическая техника, где все натальные позиции сдвинуты на дугу, пройденную Солнцем. Интерпретируй дирекционные аспекты к натальным планетам и точкам: какие темы активированы, как проявляются события. Учитывай, что дирекции описывают значимые жизненные события и повороты судьбы.",
    "progression": "Это вторичные прогрессии — прогностическая техника, где каждый день после рождения соответствует одному году жизни. Интерпретируй прогрессные аспекты к натальным планетам: какие внутренние изменения и эволюция личности происходят. Прогрессии описывают психологическое развитие и постепенные трансформации.",
    "composite": "Это композитная карта отношений — мидпоинт позиций двух натальных карт. Интерпретируй аспекты композита: какие энергии создаёт пара как единое целое, как взаимодействуют внутренние ритмы отношений. Фокусируйся на сушности союза, а не на индивидуальных различиях.",
    "davison": "Это карта Давидсона — мидпоинт времени и места рождения двух людей. Она показывает реальный момент и место, где пересекаются судьбы. Интерпретируй планеты и дома как карту самого отношения во времени и пространстве.",
    "horary": "Это хорарная карта — астрологический ответ на конкретный вопрос, построенная на момент его задавания. Вопрос: {question}. Интерпретируй карту по традиционным хорарным правилам: определи управителя вопросного дома, оцени силу и статус управителя (эссенциальное достоинство, ретроградность, сожжение), наличие и качество аспектов к управителю вопроса, рецепции, фиксированные звёзды. Дай прямой ответ: да/нет, сроки, исход.",
    "electional": "Это элективная карта — астрологический выбор наилучшего момента для начинания. Вопрос: {question}. Пресет: {preset}. Условия поиска: {conditions}. Интерпретируй карту с точки зрения выбранных условий: оцените силу управителя вопроса, положение Луны, достоинства планет, отсутствие поражений. Сделайте вывод о благоприятности момента и дайте практические рекомендации.",
    "planetary_return": "Это планетарный возврат — карта момента, когда планета возвращается в своё натальное положение. Интерпретируй ключевые темы: дом, в который попала возвратная планета, аспекты возвратной карты, взаимодействие возвратной планеты с натальными факторами. Управитель возвращённого дома — важный акцент периода. Сравни с натальной картой для понимания эволюции темы.",
}


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"

    # Database
    POSTGRES_DB: str = "astrology"
    POSTGRES_USER: str = "user"
    POSTGRES_PASSWORD: str = ""
    DATABASE_URL: Optional[str] = None

    @property
    def computed_database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.POSTGRES_PASSWORD:
            return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@postgres:5432/{self.POSTGRES_DB}"
        return f"postgresql://{self.POSTGRES_USER}@postgres:5432/{self.POSTGRES_DB}"

    # JWT
    SECRET_KEY: str = "dev-only-insecure-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        insecure_values = {
            "dev-only-insecure-key-change-in-production",
            "change-this-in-production",
            "your-super-secret-key-change-in-production",
        }
        if v.strip() in insecure_values:
            raise ValueError(
                "SECRET_KEY must be changed from the default value. "
                "Set a secure SECRET_KEY in your environment variables."
            )
        return v

    @field_validator("POSTGRES_PASSWORD")
    @classmethod
    def validate_postgres_password(cls, v: str, info) -> str:
        env = info.data.get("ENVIRONMENT", "development")
        if env == "production" and not v:
            raise ValueError(
                "POSTGRES_PASSWORD must be set in production environment"
            )
        return v

    # AI Providers
    AI_PROVIDERS: str = "[]"
    AI_SYSTEM_PROMPT_FILE: str = ""
    AI_RETRY_MAX_ATTEMPTS: int = 3
    AI_RETRY_MIN_WAIT: int = 1
    AI_RETRY_MAX_WAIT: int = 10

    # AI Token Tracking
    AI_TOKEN_TRACKING_ENABLED: bool = True
    AI_COST_PER_1M_INPUT_RUB: float = 300.0
    AI_COST_PER_1M_OUTPUT_RUB: float = 600.0

    # AI Cache
    AI_CACHE_ENABLED: bool = True
    AI_CACHE_TTL_SECONDS: int = 21600

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Security — CORS origins (comma-separated in env, falls back to defaults)
    @property
    def allowed_origins(self) -> List[str]:
        if self.ALLOWED_ORIGINS:
            return self.ALLOWED_ORIGINS
        if self.ENVIRONMENT == "production":
            return [
                "https://orbitron.pro",
                "https://api.orbitron.pro",
            ]
        return [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost",
        ]

    ALLOWED_ORIGINS: List[str] = []

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # Cookies
    COOKIE_DOMAIN: Optional[str] = None
    COOKIE_SECURE: bool = True

    # Email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "Orbitron <noreply@orbitron.pro>"
    FRONTEND_URL: str = "http://localhost:5173"

    # Subscription limits
    FREE_AI_REQUESTS_PER_MONTH: int = 3
    FREE_CHARTS_LIMIT: int = 1

    # Migrations
    RUN_MIGRATIONS: bool = False

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"

    @property
    def ai_providers(self) -> List[AIProviderConfig]:
        try:
            raw = json.loads(self.AI_PROVIDERS)
            if not isinstance(raw, list):
                raise ValueError("AI_PROVIDERS must be a JSON array")
            providers = [AIProviderConfig(**p) for p in raw]
            return [p for p in providers if p.enabled and p.api_key]
        except (json.JSONDecodeError, ValueError) as exc:
            raise ValueError(f"Invalid AI_PROVIDERS config: {exc}") from exc

    @property
    def system_prompt(self) -> str:
        if self.AI_SYSTEM_PROMPT_FILE:
            path = Path(self.AI_SYSTEM_PROMPT_FILE)
            if path.is_file():
                return path.read_text(encoding="utf-8").strip()
        return _DEFAULT_SYSTEM_PROMPT


settings = Settings()