# Orbitron — AI-астрологический сервис

Полнофункциональный астрологический сервис с ИИ-интерпретациями, 13 типами карт, премиум-подписками и админ-панелью.

## Ключевые возможности

### 13 типов астрологических карт

| Тип | Описание | Premium |
|-----|---------|---------|
| Натальная карта | Карта рождения — снимок неба в момент рождения | Нет |
| Синастрия | Совместимость двух натальных карт | Да |
| Транзиты | Текущие планетарные транзиты (Free — только сегодня) | Частично |
| Солярный возврат | Прогноз на год — темы, фокус, управитель | Да |
| Лунарный возврат | Прогноз на месяц | Да |
| Планетарный возврат | Возврат любой планеты (Меркурий, Венера, Марс, Юпитер, Сатурн) | Да |
| Профекция | Годовой прогноз по домам и управителю | Да |
| Дирекции | Прогностика по дуге Солнца (Solar Arc) | Да |
| Вторичные прогрессии | Эволюция личности и событий | Да |
| Композит | Мидпойнт-карта отношений | Да |
| Давидсон | midpoint времени и места пары | Да |
| Хорарная карта | Ответ на конкретный вопрос | Да |
| Элективная карта | Поиск наилучшего момента для начинания | Да |

Дополнительные возможности: ректификация времени рождения, астрологический планер (PDF), звёздный двойник, исторические параллели.

### ИИ-Астролог

- Потоковый чат (SSE) с контекстом выбранной карты
- 13 специализированных подсказок по типу карты
- Фолбэк по провайдерам и моделям (OpenAI-совместимые API)
- Кеширование ответов в Redis (6 часов TTL)
- Отслеживание расходов на токены
- Free: 3 ИИ-запроса/мес · Premium: безлимит

### Подписки

| Возможность | Free | Premium |
|-------------|------|---------|
| Натальные карты | 1 | Безлимит |
| ИИ-Астролог | 3 запроса/мес | Безлимит |
| Транзиты | Только сегодня | Любая дата + таймлайн |
| Отношения (Синастрия, Композит, Давидсон) | — | ✅ |
| Соляр / Лунар / Возвраты | — | ✅ |
| Профекция, Дирекции, Прогрессии | — | ✅ |
| Хорар, Электив | — | ✅ |
| Ректификация | — | ✅ |
| Звёздный двойник | — | ✅ |
| Астрологический планер | — | ✅ |

### Админ-панель

- Управление пользователями (список, редактирование подписки, soft delete)
- Ранние подписчики с генерацией инвайт-кодов
- Аудит-логи действий
- Аналитика использования токенов
- Инвайт-коды: создание, просмотр

## Архитектура

```
┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Frontend   │───▶│      Traefik      │───▶│     Backend      │
│ React + Vite │    │  (TLS + routing)  │    │   FastAPI + UVicorn  │
└─────────────┘    └──────────────────┘    └──────┬───┬───────┘
                                                   │   │
                                         ┌─────────┘   └─────────┐
                                         ▼                       ▼
                                  ┌─────────────┐        ┌─────────────┐
                                  │  PostgreSQL  │        │    Redis     │
                                  │  (данные)    │        │  (AI-кеш)    │
                                  └─────────────┘        └─────────────┘
```

Frontend обслуживается nginx (статика), backend — UVicorn за Traefik reverse proxy.

## Технологический стек

### Backend
- **Python 3.12**, **FastAPI**, **SQLAlchemy 2.0** (async)
- **Stellium** — астрологические вычисления и генерация SVG
- **pydantic-ai** — ИИ с фолбэком по провайдерам
- **PostgreSQL** (production) / **SQLite** (dev)
- **Redis 7** — кеширование ИИ-ответов
- **Alembic** — миграции БД
- **SlowAPI** — rate limiting
- **bcrypt** — хеширование паролей
- **python-jose** — JWT токены

### Frontend
- **React 19**, **TypeScript**, **Vite**
- **Tailwind CSS** — дизайн-система luxury gold-dark
- **Radix UI** — dropdown, dialog
- **assistant-ui** — потоковый ИИ-чат
- **Axios** — API-клиент (30s timeout)
- SVG рендерится напрямую (санитизация на backend)

## Быстрый старт

### Разработка

Подробная инструкция — в [README.dev.md](README.dev.md).

```bash
# Backend
pip install -r requirements.txt
cd backend && cp .env.example .env   # настроить
PYTHONPATH=. alembic upgrade head
PYTHONPATH=. uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

### Production (Docker Compose)

```bash
git clone https://github.com/ibeercan/orbitron.git
cd orbitron
cp .env.example .env                  # обязательно настроить SECRET_KEY, POSTGRES_PASSWORD, AI_PROVIDERS
docker compose up -d
```

**Роутинг Traefik:**
- `orbitron.pro` → Frontend (nginx)
- `api.orbitron.pro` → Backend (UVicorn :8000)
- `https` с автосертификатами Let's Encrypt

## Структура проекта

```
orbitron/
├── backend/
│   ├── app/
│   │   ├── ai/                    # ИИ-сервис (фолбэк, кеш, токены)
│   │   ├── admin/                 # Админ CRUD
│   │   ├── auth/                  # Аутентификация (JWT, premium)
│   │   ├── charts/                # Все типы карт (13+)
│   │   ├── chat/                  # Чат-сессии и сообщения
│   │   ├── core/                  # Конфиг, логирование, константы
│   │   ├── db/                    # SQLAlchemy сессия
│   │   ├── electional/            # Элективный поиск (background task)
│   │   ├── insights/              # Звёздный двойник, исторические параллели
│   │   ├── invites/               # Инвайт-коды
│   │   ├── middleware/             # Security headers, proxy headers
│   │   ├── models/                # SQLAlchemy модели (15+ таблиц)
│   │   ├── persons/               # Данные партнёров
│   │   ├── planner/               # PDF-планер (background task)
│   │   ├── rectification/         # Ректификация (background task)
│   │   ├── subscriptions/          # Подписки
│   │   ├── api/v1/                # Роутеры и эндпоинты
│   │   ├── main.py                # FastAPI app
│   │   └── scripts/               # Утилиты (create_admin и др.)
│   ├── alembic/                   # Миграции БД
│   ├── .env / .env.example        # Переменные окружения
│   └── dev.db                     # SQLite (dev)
├── frontend/
│   ├── src/
│   │   ├── components/            # React-компоненты
│   │   │   ├── admin/             # Админ-панель
│   │   │   ├── auth/              # AdminRoute guard
│   │   │   ├── chat/              # AssistantChat, RuntimeProvider
│   │   │   ├── layout/            # AppLayout, Sidebar, ProfileSlideOver
│   │   │   └── ui/                # Forms, ModalShell, OnboardingTour, и др.
│   │   ├── contexts/               # AuthContext
│   │   ├── hooks/                  # useFixedDropdown и др.
│   │   ├── lib/api/               # Axios API-клиент
│   │   ├── lib/utils/             # Утилиты (cn)
│   │   ├── pages/                 # Landing, Dashboard, AdminPage
│   │   ├── App.tsx                # Роутинг (ErrorBoundary, AdminRoute)
│   │   └── main.tsx               # Точка входа
│   ├── nginx.conf                 # nginx с security headers
│   ├── Dockerfile                 # Multi-stage (node:22-alpine → nginx:1.27-alpine)
│   └── package.json
├── Dockerfile                      # Multi-stage Python backend
├── compose.yaml                   # Backend + Frontend + PostgreSQL + Redis + Traefik
├── requirements.txt                # Python-зависимости (pinned)
├── requirements-dev.txt            # pytest, pytest-asyncio, httpx
└── .env.example                   # Шаблон переменных окружения
```

## Переменные окружения

### Обязательные для production

| Переменная | Описание |
|------------|---------|
| `ENVIRONMENT` | `production` или `development` |
| `SECRET_KEY` | JWT-ключ (мин. 32 символа, без дефолтных значений) |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
| `AI_PROVIDERS` | JSON-массив провайдеров: `[{"name":"...","api_key":"...","models":["..."],"enabled":true}]` |
| `DATABASE_URL` | PostgreSQL connection string |

### Опциональные

| Переменная | Дефолт | Описание |
|------------|--------|---------|
| `REDIS_URL` | `redis://localhost:6379` | Redis для AI-кеширования |
| `AI_CACHE_ENABLED` | `true` | Включить/выключить AI-кеш |
| `AI_CACHE_TTL_SECONDS` | `21600` | TTL кеша (6 часов) |
| `AI_SYSTEM_PROMPT_FILE` | — | Файл кастомного промпта |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | TTL access token |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | TTL refresh token |
| `COOKIE_DOMAIN` | `orbitron.pro` | Домен cookies |
| `COOKIE_SECURE` | `true` | HTTPS-only cookies |
| `FREE_AI_REQUESTS_PER_MONTH` | `3` | Лимит ИИ-запросов для Free |
| `FREE_CHARTS_LIMIT` | `1` | Лимит натальных карт для Free |
| `LOG_LEVEL` | `INFO` | Уровень логирования |
| `RUN_MIGRATIONS` | `false` | Автозапуск Alembic при старте |

## Безопасность

- **Аутентификация**: JWT access (30 мин) + refresh (7 дней) в httpOnly cookies
- **Refresh token rotation**: при обновлении старый токен отзывается, новый выдаётся
- **Пароли**: bcrypt с cost factor 12
- **Rate limiting**: 5/мин на auth, 10/мин на subscriptions, 100/мин default
- **Security headers**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Environment-aware CORS**: production — только orbitron.pro, dev — localhost
- **SVG санитизация**: на backend (strip `<script>`, `on*=` атрибуты), DOMPurify убран с frontend
- **Admin bypass**: `is_admin=True` обходит премиум-проверки
- **docs/redoc/openapi**: отключены в production
- **Soft delete**: все модели с `deleted_at`, хард-удаление отсутствует

## Лицензия

AGPL-3.0