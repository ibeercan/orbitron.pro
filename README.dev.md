# Orbitron — Локальная разработка

Инструкция для запуска проекта на локальной машине.

## Требования

- Python 3.12+
- Node.js 22+
- pip

## Быстрый старт

### 1. Backend

```bash
pip install -r requirements.txt
cd backend
cp .env.example .env          # скопировать и настроить
```

Минимальные настройки в `backend/.env`:

```env
ENVIRONMENT=development
DATABASE_URL=sqlite+aiosqlite:///./dev.db
SECRET_KEY=dev-local-key-change-me-for-production
AI_PROVIDERS=[{"name":"openai","api_key":"sk-...","models":["gpt-4o-mini"],"enabled":true}]
```

### 2. Миграции и админ

```bash
cd backend
PYTHONPATH=. alembic upgrade head
PYTHONPATH=. python3 -m app.scripts.create_admin --email admin@orbitron.pro --password 123 --premium
```

### 3. Запуск backend

```bash
cd backend
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

API: `http://localhost:8000`  
Документация: `http://localhost:8000/docs` (только в development)

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

### 5. Пересоздание БД (dev)

```bash
rm -f backend/dev.db
cd backend
PYTHONPATH=. alembic upgrade head
PYTHONPATH=. python3 -m app.scripts.create_admin --email admin@orbitron.pro --password 123 --premium
```

## Переменные окружения

### Backend (`backend/.env`)

| Переменная | Дефолт | Описание |
|------------|--------|---------|
| `ENVIRONMENT` | `development` | `development` или `production` |
| `DATABASE_URL` | — | Connection string. Dev: `sqlite+aiosqlite:///./dev.db`, Prod: `postgresql+asyncpg://...` |
| `SECRET_KEY` | — | JWT-ключ. В production — минимум 32 символа, без дефолтных значений |
| `ALGORITHM` | `HS256` | Алгоритм JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | TTL access token |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | TTL refresh token |
| `COOKIE_DOMAIN` | `` (пусто) | Домен cookie (dev: пусто, prod: `orbitron.pro`) |
| `COOKIE_SECURE` | `false` | HTTPS-only cookies (dev: `false`, prod: `true`) |
| `AI_PROVIDERS` | `[]` | JSON-массив провайдеров |
| `AI_SYSTEM_PROMPT_FILE` | — | Путь к файлу промпта |
| `AI_CACHE_ENABLED` | `true` | Включить Redis-кеш ИИ-ответов |
| `AI_CACHE_TTL_SECONDS` | `21600` | TTL кеша (секунды) |
| `AI_RETRY_MAX_ATTEMPTS` | `3` | Попытки фолбэка |
| `AI_RETRY_MIN_WAIT` | `1` | Мин. ожидание между попытками (сек) |
| `AI_RETRY_MAX_WAIT` | `10` | Макс. ожидание между попытками (сек) |
| `AI_TOKEN_TRACKING_ENABLED` | `true` | Отслеживание расходов на токены |
| `AI_COST_PER_1K_PROMPT` | `0.03` | Стоимость 1K prompt-токенов ($US) |
| `AI_COST_PER_1K_COMPLETION` | `0.06` | Стоимость 1K completion-токенов ($US) |
| `REDIS_URL` | `redis://localhost:6379` | Redis (опционально, кеш работает без него) |
| `FREE_AI_REQUESTS_PER_MONTH` | `3` | Лимит ИИ-запросов для Free |
| `FREE_CHARTS_LIMIT` | `1` | Лимит натальных карт для Free |
| `LOG_LEVEL` | `INFO` | Уровень логирования |
| `RUN_MIGRATIONS` | `false` | Автозапуск Alembic при старте |

### Frontend (`frontend/.env`)

| Переменная | Дефолт | Описание |
|------------|--------|---------|
| `VITE_API_URL` | `http://localhost:8000/api/v1` | URL backend API |

### Формат AI_PROVIDERS

```json
[
  {
    "name": "openai",
    "api_key": "sk-...",
    "base_url": "https://api.openai.com/v1",
    "models": ["gpt-4o-mini", "gpt-4o"],
    "enabled": true
  },
  {
    "name": "custom",
    "api_key": "...",
    "base_url": "https://custom-provider.com/v1",
    "models": ["model-name"],
    "enabled": true
  }
]
```

Фолбэк: сервис перебирает провайдеры по порядку, затем модели внутри каждого провайдера, пока не получит успешный ответ.

## Структура Backend

### Модели (`backend/app/models/`)

| Модель | Описание | Ключевые поля |
|--------|---------|--------------|
| **User** | Пользователь | email, hashed_password, is_admin, subscription_type, onboarding_completed |
| **Chart** | Астрологическая карта | chart_type (13 типов), native_data (JSON), result_data (JSON), svg_data, parent_chart_id |
| **Person** | Данные партнёра | name, datetime, location |
| **ChatSession** | Сессия чата | chart_id, title |
| **ChatMessage** | Сообщение чата | session_id, role (user/assistant/system), content |
| **Subscription** | Подписка | plan, status, start_date, end_date |
| **Payment** | Платёж | amount, currency, stripe_payment_id, status |
| **RefreshToken** | Refresh JWT | token_hash (SHA-256), expires_at, revoked_at |
| **InviteCode** | Инвайт-код | code (unique), used, used_email |
| **EarlySubscriber** | Ранний подписчик | email (unique), source |
| **PlannerCache** | Кеш планера (PDF) | input_hash, status, progress, pdf_data |
| **ElectionalCache** | Кеш электива | input_hash, status, progress, result_data |
| **RectificationCache** | Кеш ректификации | input_hash, status, progress, result_data |
| **InsightCache** | Кеш инсайтов | natal_chart_id, insight_type (astro_twins/historical_parallels) |
| **TokenUsage** | Расход токенов | model, prompt_tokens, completion_tokens, cost_usd |
| **RequestLog** | Лог запросов | endpoint, method |
| **AuditLog** | Аудит-лог | entity_type, action, old_values, new_values |

Миксины: `TimestampMixin` (created_at, updated_at), `SoftDeleteMixin` (deleted_at + soft_delete/restore/query_active), `AuditMixin` (created_by_id, updated_by_id).

### API-эндпоинты

#### Аутентификация (`/api/v1/auth`)

| Метод | Путь | Описание | Rate limit |
|-------|------|---------|-----------|
| POST | `/register` | Регистрация (invite-code опционально) | 5/мин |
| POST | `/login` | Вход (OAuth2 form, httpOnly cookies) | 5/мин |
| POST | `/refresh` | Обновление access token | — |
| GET | `/me` | Текущий пользователь | — |
| POST | `/onboarding-complete` | Завершить онбординг | — |
| POST | `/logout` | Выход (отзыв refresh token) | — |

#### Карты (`/api/v1/charts`)

| Метод | Путь | Описание | Premium |
|-------|------|---------|---------|
| POST | `/natal` | Натальная карта | Нет |
| POST | `/horary` | Хорарная карта | Да |
| POST | `/synastry` | Синастрия | Да |
| POST | `/transit` | Транзиты | Частично |
| POST | `/transit-timeline` | Таймлайн транзитов | Да |
| POST | `/solar-return` | Солярный возврат | Да |
| POST | `/lunar-return` | Лунарный возврат | Да |
| POST | `/planetary-return` | Планетарный возврат | Да |
| POST | `/profection` | Профекция | Да |
| POST | `/solar-arc` | Дирекции (Solar Arc) | Да |
| POST | `/progression` | Вторичные прогрессии | Да |
| POST | `/composite` | Композит (synthesis_type=davison для Давидсон) | Да |
| POST | `/{chart_id}/report` | PDF-отчёт | Да |
| POST | `/{chart_id}/rectify` | Ректификация (async) | Да |
| POST | `/astro-twins` | Звёздный двойник | Да |
| POST | `/historical-parallels` | Исторические параллели | Да |
| GET | `/notable-events` | Список заметных событий | — |
| GET | `/` | Список карт пользователя | — |
| GET | `/{chart_id}` | Детали карты | — |
| GET | `/{chart_id}/svg` | SVG карты (санитизированный) | — |
| DELETE | `/{chart_id}` | Soft delete карты | — |

#### ИИ-чат (`/api/v1/chat`)

| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/` | Список сессий |
| GET | `/{session_id}` | Сообщения сессии |
| POST | `/chart/{chart_id}/start` | Создать сессию |
| POST | `/{session_id}/stream` | SSE-стрим ответа |

#### Подписки (`/api/v1/subscriptions`)

| Метод | Путь | Описание | Rate limit |
|-------|------|---------|-----------|
| GET | `/me` | Статус подписки | — |
| POST | `/check-email` | Проверка email | 10/мин |
| POST | `/check-invite` | Проверка инвайт-кода | 10/мин |
| POST | `/upgrade` | Повышение подписки | — |
| POST | `/early-access` | Ранний доступ | —/мин |

#### Персон (партнёры) (`/api/v1/persons`)

| Метод | Путь | Описание |
|-------|------|---------|
| POST | `/` | Создать персону |
| GET | `/` | Список персон |
| GET | `/{person_id}` | Детали персоны |
| PUT | `/{person_id}` | Обновить персону |
| DELETE | `/{person_id}` | Soft delete персоны |

#### Админ (`/api/v1/admin`) — только `is_admin=True`

| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/stats` | Статистика (пользователи, карты, токены) |
| GET | `/users` | Список пользователей |
| PATCH | `/users/{user_id}` | Обновить пользователя |
| DELETE | `/users/{user_id}` | Soft delete пользователя |
| GET | `/early-subscribers` | Ранние подписчики |
| POST | `/early-subscribers/{id}/invite` | Отправить инвайт |
| GET | `/invites` | Инвайт-коды |
| POST | `/invites/generate` | Сгенерировать коды |
| GET | `/audit-logs` | Аудит-логи |
| GET | `/token-usage` | Аналитика токенов |

#### Электив (`/api/v1/electional`)

| Метод | Путь | Описание |
|-------|------|---------|
| POST | `/search` | Запустить поиск (async) |
| GET | `/{search_id}/poll` | Опросить прогресс |
| POST | `/select` | Выбрать результат |

#### Планер (`/api/v1/planner`)

| Метод | Путь | Описание |
|-------|------|---------|
| POST | `/generate` | Запустить генерацию (async) |
| GET | `/{planner_id}/poll` | Опросить прогресс |
| GET | `/{planner_id}/download` | Скачать PDF |

#### Инвайт-коды (`/api/v1/invites`)

| Метод | Путь | Описание |
|-------|------|---------|
| POST | `/generate` | Сгенерировать (admin) |
| GET | `/` | Список (admin) |

### Сервисный слой (`backend/app/`)

| Модуль | Назначение |
|--------|-----------|
| `charts/service.py` | Генерация всех типов карт, SVG-рендеринг, санитизация SVG |
| `charts/crud.py` | CRUD операций с картами |
| `charts/schemas.py` | Pydantic-схемы (13 типов Create + Chart Read) |
| `charts/rectification.py` | Ректификация (Stellium, async background) |
| `charts/notables.py` | Звёздный двойник, исторические параллели |
| `ai/service.py` | ИИ-сервис: фолбэк по провайдерам, кеш Redis, трекинг токенов |
| `ai/token_usage.py` | Учёт расходов на ИИ-токены |
| `planner/builder.py` | PDF-генерация планера (Stellium PlannerBuilder) |
| `planner/bg.py` | Background task для планера |
| `electional/search.py` | Stellium ElectionalSearch |
| `electional/bg.py` | Background task для электива |

### Middleware

| Middleware | Назначение |
|-----------|-----------|
| `SecurityHeadersMiddleware` | X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection: 0 |
| `RequestIDMiddleware` | X-Request-ID (UUID) на каждый запрос |
| `SlowAPIMiddleware` | Rate limiting (SlowAPI) |
| `CORSMiddleware` | Environment-aware CORS |
| `ProxyHeadersMiddleware` | Извлечение реального IP (X-Real-IP, X-Forwarded-For) |

### AI-сервис

**Архитектура:**
1. Запрос → проверка кеша (Redis, ключ = `ai_cache:md5(chart_id:prompt:question)`)
2. Кеш miss → перебор провайдеров (`AI_PROVIDERS`), затем моделей внутри каждого
3. Успех → сохранение в кеш, учёт токенов
4. Все провайдеры упали → `RuntimeError`

**Контекстные подсказки:** каждый тип карты имеет специализированный промпт-контекст (`CHART_TYPE_PROMPT_HINTS` в `ai/service.py`), который добавляется к системному промпту.

## Структура Frontend

### Страницы (`frontend/src/pages/`)

| Страница | Описание |
|----------|---------|
| `Landing.tsx` | Маркетинговая страница: 8 фич, ИИ-асторолог секция, Free vs Premium |
| `Dashboard.tsx` | Основная рабочая область: карта, ИИ-чат, модальные формы всех типов |
| `AdminPage.tsx` | Админ-панель: пользователи, подписки, аудит-логи, токены, инвайты |

### Компоненты (`frontend/src/components/`)

| Категория | Компонент | Описание |
|-----------|-----------|---------|
| Layout | `AppLayout` | Основной layout с Sidebar |
| Layout | `Sidebar` | Навигация по картам + создание через dropdown |
| Layout | `ProfileSlideOver` | Профиль, подписка, партнёры, выход |
| Chat | `AssistantChat` | Потоковый чат с ИИ-асторологом (SSE) |
| Chat | `OrbitronRuntimeProvider` | Провайдер для @assistant-ui/react |
| Auth | `AdminRoute` | Guard для админ-маршрута (`/admin`) |
| UI | `CreateChartModal` | Форма создания натальной карты |
| UI | `SynastryForm` | Форма синастрии |
| UI | `RelationshipsForm` | Объединённая форма: Синастрия / Композит / Давидсон |
| UI | `TransitForm` | Форма транзитов |
| UI | `SolarReturnForm` | Форма соляра |
| UI | `LunarReturnForm` | Форма лунара |
| UI | `PlanetaryReturnForm` | Форма планетарного возврата |
| UI | `ProfectionForm` | Форма профекции |
| UI | `SolarArcForm` | Форма дирекций |
| UI | `ProgressionForm` | Форма прогрессий |
| UI | `CompositeForm` | Форма композита/Давидсон |
| UI | `HoraryForm` | Форма хорарной карты |
| UI | `ElectionalForm` | Форма элективной карты |
| UI | `RectificationForm` | Форма ректификации |
| UI | `PlannerForm` | Форма планера (24 поля, пресеты) |
| UI | `TransitTimeline` | Таймлайн транзитов |
| UI | `AstroTwinsPanel` | Панель звёздного двойника |
| UI | `OnboardingTour` | Тур по интерфейсу (6 шагов) |
| UI | `WelcomeMessage` | Приветственное сообщение в чате |
| UI | `ModalShell` | Обёртка для всех модальных окон |
| UI | `ErrorBoundary` | Глобальный обработчик ошибок |
| Admin | `AdminContent` | Контент админ-панели (5 вкладок) |

### Контексты и утилиты

| Модуль | Описание |
|--------|---------|
| `AuthContext` | Состояние пользователя, login/register/logout/completeOnboarding |
| `lib/api/client.ts` | Axios-клиент со всеми API-методами |
| `lib/utils.ts` | Утилита `cn()` для Tailwind |

### Ключевые паттерны

- **Premium-gating**: `PREMIUM_FEATURES` (16 фич) проверяются через `require_premium(user, feature)` на backend и `is_subscription_active || is_admin` на frontend
- **Async background tasks**: Планер, электив, ректификация используют pattern `Cache → background task → polling`
- **SVG санитизация**: `_sanitize_svg()` на backend (regex: strip `<script>`, `on*=` атрибуты, `<iframe>`, `<object>`, `<embed>`); на frontend SVG рендерится напрямую через `dangerouslySetInnerHTML`

## Типы карт — чеклист для добавления

### Backend

1. Добавить значение в `ChartType` enum (`backend/app/models/chart.py`)
2. Создать Pydantic-схему в `backend/app/charts/schemas.py` (напр. `SolarReturnCreate`)
3. Добавить метод в `backend/app/charts/service.py` (напр. `_build_solar_return()`)
4. Создать эндпоинт в `backend/app/charts/charts.py` (или выделенном роутере)
5. Добавить feature в `PREMIUM_FEATURES` (`backend/app/core/constants.py`)
6. Добавить подсказку ИИ в `CHART_TYPE_PROMPT_HINTS` (`backend/app/ai/service.py`)

### Frontend

7. Создать форму в `frontend/src/components/ui/` (напр. `SolarReturnForm.tsx`)
8. Добавить кнопку и модальное окно в `Dashboard.tsx`
9. Добавить label и иконку в Sidebar (`CHART_TYPE_LABELS`, `CHART_TYPE_ICONS`)
10. Добавить подсказки чата в `AssistantChat.tsx` (`CHAT_SUGGESTIONS`)
11. Добавить API-метод в `frontend/src/lib/api/client.ts`

## Устранение неполадок

### Ошибка «No AI providers configured»

Проверьте `AI_PROVIDERS` в `.env` — должен быть валидный JSON с `api_key` и хотя бы одной моделью.

### Ошибка CORS

Убедитесь что `ENVIRONMENT=development` в `backend/.env`. В development режиме CORS разрешает `localhost`.

### Ошибка «Invalid credentials» при login

Проверьте что пользователь существует. Пересоздайте БД:
```bash
rm -f backend/dev.db && cd backend && PYTHONPATH=. alembic upgrade head && PYTHONPATH=. python3 -m app.scripts.create_admin --email admin@orbitron.pro --password 123 --premium
```

### Redis недоступен

Redis опционален — AI-кеш просто не будет работать. Убедитесь что `AI_CACHE_ENABLED=true` и Redis запущен, или установите `AI_CACHE_ENABLED=false`.

### SVG не рендерится

SVG санитизируется на backend (`_sanitize_svg()` в `charts/service.py`). Если цвета пропадают — убедитесь что используется backend-санитизация, а не DOMPurify на frontend (DOMPurify удалён).