# Orbitron - Локальная разработка

## Требования

- Python 3.12+
- Node.js 18+
- pip или poetry

## Быстрый старт

### 1. Установка зависимостей

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 2. Настройка окружения

```bash
# Backend уже настроен с SQLite в .env
# Проверьте настройки в backend/.env
cat backend/.env

# При необходимости обновите AI_API_KEY
```

### 3. Запуск

```bash
# Terminal 1: Backend
cd backend
./scripts/dev.sh

# Terminal 2: Frontend
cd frontend
npm run dev
```

## Доступ к сервисам

- **Frontend**: http://localhost:5173
- **API**: http://localhost:8000
- **Документация API**: http://localhost:8000/docs

## Структура файлов

```
orbitron/
├── backend/
│   ├── .env              # Переменные окружения (SQLite)
│   ├── app/             # Приложение FastAPI
│   ├── scripts/
│   │   └── dev.sh      # Скрипт запуска
│   └── dev.db         # SQLite база данных
└── frontend/
    ├── .env            # Переменные окружения
    └── src/            # React приложение
```

## Команды

### Backend

```bash
cd backend

# Запуск сервера
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Запуск миграций
alembic upgrade head

# Тесты
pytest -v
```

### Frontend

```bash
cd frontend

# Запуск dev сервера
npm run dev

# Сборка
npm run build
```

## Устранение проблем

### Ошибка базы данных

```bash
# Удалите старую базу и создайте новую
rm backend/dev.db
cd backend
python -c "
import asyncio
from app.db.session import engine
from app.models.base import Base

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Database initialized!')

asyncio.run(init_db())
"
```

### Ошибка CORS

Проверьте `CORS_ORIGINS` в `backend/.env`:

```
CORS_ORIGINS=http://localhost,http://localhost:5173
```

### Требующиеся переменные

Создайте `.env` файл на основе `.env.example`:

```bash
cp backend/.env.example backend/.env
# Отредактируйте с вашими значениями
```