# Orbitron Astrology Project

Полный астрологический AI-сервис с бэкендом и фронтендом.

## Структура проекта

```
orbitron/
├── backend/          # FastAPI бэкенд
│   ├── app/         # Основное приложение
│   ├── tests/       # Тесты
│   ├── alembic/     # Миграции БД
│   └── requirements.txt
├── frontend/         # HTML фронтенд (в будущем React)
│   ├── dist/        # Собранные файлы
│   ├── nginx.conf   # Конфиг nginx
│   └── compose.yaml # Docker для фронтенда
└── compose.yaml      # Основной Docker Compose
```

## Быстрый старт

### Требования
- Docker и Docker Compose
- Git

### Запуск всего проекта
```bash
git clone https://github.com/ibeercan/orbitron.git
cd orbitron
cp backend/.env.example backend/.env
# Отредактируйте backend/.env
docker-compose up --build
```

### Доступ
- **Фронтенд**: http://localhost или https://orbitron.pro
- **API**: http://localhost:8000 или https://api.orbitron.pro
- **Документация API**: http://localhost:8000/docs

## Разработка

### Бэкенд
```bash
cd backend
pip install -r ../requirements.txt
uvicorn app.main:app --reload
```

### Фронтенд
Фронтенд статический HTML, обслуживается nginx в Docker.

## Функции

### Бэкенд
- ✅ JWT аутентификация
- ✅ Натальные карты (Stellium)
- ✅ AI интерпретации (Pydantic-AI)
- ✅ Подписки (Free/Premium)
- ✅ Ранний доступ (подписка с лэндинга)

### Фронтенд
- ✅ Лэндинг с формой подписки
- ✅ Roadmap проекта
- ✅ Адаптивный дизайн
- 🔄 В будущем: React + Vite + assistant-ui

## Развертывание

Проект готов к деплою с Traefik reverse proxy:
- Фронтенд: `orbitron.pro`
- API: `api.orbitron.pro`

## Лицензия
AGPL-3.0# Orbitron Project
