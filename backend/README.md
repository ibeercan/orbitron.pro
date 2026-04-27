# Orbitron Backend

FastAPI-бэкенд астрологического AI-сервиса.

## Запуск

```bash
pip install -r ../requirements.txt
cd backend
cp .env.example .env    # настроить переменные
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

- API: `http://localhost:8000`
- Документация: `http://localhost:8000/docs` (только в `ENVIRONMENT=development`)
- Health check: `http://localhost:8000/health`
- В production: `/docs`, `/redoc`, `/openapi.json` отключены

## Конфигурация

Полный список настроек (`app/core/config.py`):

### Основные

| Переменная | Дефолт | Описание |
|------------|--------|---------|
| `ENVIRONMENT` | `development` | `development` или `production`. Влияет на CORS, валидацию SECRET_KEY, доступность /docs |
| `DATABASE_URL` | — | Connection string. Dev: `sqlite+aiosqlite:///./dev.db`, Prod: `postgresql+asyncpg://...` |
| `SECRET_KEY` | — | Ключ для JWT-подписи. В production валидируется: минимум не из списка известных небезопасных значений |
| `ALGORITHM` | `HS256` | Алгоритм JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | TTL access token |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | TTL refresh token |
| `COOKIE_DOMAIN` | `` | Домен cookie. Dev: пусто (localhost), Prod: `orbitron.pro` |
| `COOKIE_SECURE` | `true` | HTTPS-only cookies. Dev: `false`, Prod: `true` |

### AI

| Переменная | Дефолт | Описание |
|------------|--------|---------|
| `AI_PROVIDERS` | `[]` | JSON-массив провайдеров: `[{"name":"openai","api_key":"...","base_url":"...","models":["gpt-4o-mini"],"enabled":true}]` |
| `AI_SYSTEM_PROMPT_FILE` | — | Путь к файлу системного промпта. Если не указан — используется встроенный русский промпт |
| `AI_CACHE_ENABLED` | `true` | Включить кеширование ИИ-ответов в Redis |
| `AI_CACHE_TTL_SECONDS` | `21600` | TTL кеша (6 часов) |
| `AI_RETRY_MAX_ATTEMPTS` | `3` | Максимум попыток при фолбэке |
| `AI_RETRY_MIN_WAIT` | `1` | Минимальное ожидание между попытками (секунды) |
| `AI_RETRY_MAX_WAIT` | `10` | Максимальное ожидание между попытками (секунды) |
| `AI_TOKEN_TRACKING_ENABLED` | `true` | Отслеживать расход токенов |
| `AI_COST_PER_1K_PROMPT` | `0.03` | Стоимость 1K prompt-токенов ($US) |
| `AI_COST_PER_1K_COMPLETION` | `0.06` | Стоимость 1K completion-токенов ($US) |

### Redis

| Переменная | Дефолт | Описание |
|------------|--------|---------|
| `REDIS_URL` | `redis://localhost:6379` | Redis для AI-кеширования. Если недоступен — приложение продолжает работу без кеша |

### Подписки

| Переменная | Дефолт | Описание |
|------------|--------|---------|
| `FREE_AI_REQUESTS_PER_MONTH` | `3` | Лимит ИИ-запросов для Free-тира |
| `FREE_CHARTS_LIMIT` | `1` | Лимит натальных карт для Free-тира |

### Прочее

| Переменная | Дефолт | Описание |
|------------|--------|---------|
| `LOG_LEVEL` | `INFO` | Уровень логирования (DEBUG, INFO, WARNING, ERROR) |
| `RUN_MIGRATIONS` | `false` | Автозапуск `alembic upgrade head` при старте |
| `ALLOWED_ORIGINS` | `[]` | Дополнительные CORS-origins (не используется, CORS управляется через `ENVIRONMENT`) |

## Аутентификация

### Схема

```
Login → 2 httpOnly cookies:
  ├── access_token  (30 мин, path=/)
  └── refresh_token (7 дней, path=/api/v1/auth)

Refresh → новый access_token + новый refresh_token (старый отзывается)
Logout  → отзыв refresh_token в БД + очистка обоих cookies
```

### Детали

- Access token: JWT с `sub` (user_id) и `type: "access"`, хранится в httpOnly cookie
- Refresh token: JWT с `sub` (user_id) и `type: "refresh"`, хранится в httpOnly cookie с path `/api/v1/auth`
- Refresh token rotation: при `/refresh` старый токен помечается `revoked_at` в БД, выдаётся новый
- В БД хранится только SHA-256 хеш refresh token (`token_hash`), не сам токен
- `require_premium(user, feature)` проверяет `is_subscription_active || is_admin`
- Admin-пользователи (`is_admin=True`) обходят все премиум-проверки

### Эндпоинты

| Метод | Путь | Описание | Rate limit |
|-------|------|---------|-----------|
| POST | `/api/v1/auth/register` | Регистрация (invite-code опционально) | 5/мин |
| POST | `/api/v1/auth/login` | Вход (OAuth2 form) | 5/мин |
| POST | `/api/v1/auth/refresh` | Обновление access token | — |
| GET | `/api/v1/auth/me` | Текущий пользователь | — |
| POST | `/api/v1/auth/onboarding-complete` | Завершить онбординг | — |
| POST | `/api/v1/auth/logout` | Выход | — |

## AI-сервис

### Провайдеры

Конфигурация через `AI_PROVIDERS` — JSON-массив провайдеров. Каждый провайдер:
```json
{
  "name": "openai",
  "api_key": "sk-...",
  "base_url": "https://api.openai.com/v1",
  "models": ["gpt-4o-mini", "gpt-4o"],
  "enabled": true
}
```

### Фолбэк-логика

1. Перебираем провайдеры по порядку
2. Внутри каждого провайдера перебираем модели по порядку
3. Первый успешный ответ → возврат
4. Все провайдеры упали → `RuntimeError`

### Кеширование (Redis)

- Ключ: `ai_cache:{md5(chart_id:prompt_text[:100]:question)}`
- TTL: 21600 секунд (6 часов) по умолчанию
- Если Redis недоступен — приложение работает без кеша (graceful degradation)

### Контекстные подсказки

Каждый тип карты имеет специализированный промпт-контекст (`CHART_TYPE_PROMPT_HINTS`), добавляемый к системному промпту. 13 подсказок: natal, synastry, transit, solar_return, lunar_return, profection, solar_arc, progression, composite, davison, horary, electional, planetary_return + planner.

### Отслеживание токенов

- Каждый ИИ-запрос логирует: `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `cost_usd`
- Модель `TokenUsage` хранит историю расходов
- Админ-панель показывает аналитику по токенам

## Rate Limiting

| Эндпоинт | Лимит | Key function |
|----------|-------|--------------|
| `/auth/register` | 5/мин | `get_remote_address` ⚠️ |
| `/auth/login` | 5/мин | `get_remote_address` ⚠️ |
| `/subscriptions/check-email` | 10/мин | `get_real_ip` |
| `/subscriptions/check-invite` | 10/мин | `get_real_ip` |
| Default | 100/мин | `get_real_ip` |

⚠️ Auth-эндпоинты используют `get_remote_address` вместо `get_real_ip` — за reverse proxy все пользователи будут иметь один IP. Требуется исправление.

## Middleware

Порядок применения (внутренний → внешний):

1. **SlowAPIMiddleware** — rate limiting
2. **CORSMiddleware** — environment-aware CORS (production: orbitron.pro, dev: localhost)
3. **SecurityHeadersMiddleware** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-XSS-Protection: 0`
4. **RequestIDMiddleware** — `X-Request-ID: {uuid}` на каждый ответ

Дополнительно в production (Traefik labels): HTTP→HTTPS redirect, Let's Encrypt TLS.

## Модели БД

| Модель | Таблица | Описание |
|--------|---------|---------|
| User | `users` | Пользователь с подпиской, admin-флагом, soft delete |
| Chart | `charts` | Астрологическая карта (13 типов), SVG, JSON-данные |
| Person | `persons` | Данные партнёра (имя, дата, место) |
| ChatSession | `chat_sessions` | Сессия ИИ-чата |
| ChatMessage | `chat_messages` | Сообщение в чате (user/assistant/system) |
| Subscription | `subscriptions` | Подписка (monthly/quarterly/yearly, статусы) |
| Payment | `payments` | Платёж (Stripe-ready) |
| RefreshToken | `refresh_tokens` | SHA-256 хеш refresh JWT |
| InviteCode | `invite_codes` | Инвайт-код для Premium |
| EarlySubscriber | `early_subscribers` | Ранний подписчик |
| PlannerCache | `planner_cache` | Кеш PDF-планера (async background) |
| ElectionalCache | `electional_cache` | Кеш элективного поиска (async background) |
| RectificationCache | `rectification_cache` | Кеш ректификации (async background) |
| InsightCache | `insight_cache` | Кеш звёздного двойника и исторических параллелей |
| TokenUsage | `ai_token_usage` | Расход токенов по моделям |
| RequestLog | `request_logs` | Лог HTTP-запросов |
| AuditLog | `audit_logs` | Аудит-лог (entity, action, old/new values) |

Миксины: `TimestampMixin` (created_at, updated_at), `SoftDeleteMixin` (deleted_at + query_active), `AuditMixin` (created_by_id, updated_by_id).

## SVG-санитизация

SVG генерируется библиотекой Stellium и санитизируется на backend перед сохранением в БД:

```python
def _sanitize_svg(svg_bytes: bytes) -> bytes:
    # Удаляет: <script>, <iframe>, <object>, <embed>, on*= атрибуты
```

На frontend SVG рендерится напрямую через `dangerouslySetInnerHTML` — DOMPurify удалён, т.к. SVG из доверенного источника (наша БД) и уже санитизирован.

## Миграции БД

```bash
cd backend

# Применить все миграции
PYTHONPATH=. alembic upgrade head

# Создать новую миграцию
PYTHONPATH=. alembic revision --autogenerate -m "описание изменений"

# Откатить на одну миграцию
PYTHONPATH=. alembic downgrade -1

# Текущая версия
PYTHONPATH=. alembic current
```

**Важно:** `create_all` удалён из lifespan. Только Alembic управляет схемой БД.

## License

AGPL-3.0