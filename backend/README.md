# Orbitron Backend

Бэкенд астрологического сервиса на FastAPI.

## Быстрый старт

### Требования
- Python 3.12+

### Установка
```bash
pip install -r ../requirements.txt
uvicorn app.main:app --reload
```

## Тестирование

```bash
pip install pytest pytest-asyncio httpx
pytest
```

## Линтинг

```bash
pip install ruff
ruff check .
ruff format .
```

API доступен на `http://localhost:8000` или `api.orbitron.pro`.

## API эндпоинты
- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/login` - Авторизация
- `POST /api/v1/charts/natal` - Создание натальной карты
- `POST /api/v1/ai/{chart_id}/interpret` - ИИ интерпретация

Документация: `/docs`

## Конфигурация
Настройте в `.env`:
- `DATABASE_URL` - База данных
- `JWT_SECRET_KEY` - Секрет для JWT
- `AI_API_KEY` - Ключ ИИ (OpenAI или кастомный)
- `AI_MODEL` - Модель (gpt-4)
- `LOG_LEVEL` - Уровень логирования

## Разработка
```bash
# Локально с SQLite
pip install -r ../requirements.txt
export DATABASE_URL=sqlite:///./dev.db
export LOG_LEVEL=DEBUG
uvicorn app.main:app --reload
```

## Миграции БД
```bash
# Инициализация (если нужно)
alembic init alembic

# Создание миграции
alembic revision --autogenerate -m "Описание изменений"

# Применение миграций
alembic upgrade head
```

## Продакшн
Проект запускается через корневой `docker-compose up -d`

## Лицензия
AGPL-3.0