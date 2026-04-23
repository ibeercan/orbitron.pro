#!/bin/bash

set -e

echo "Starting Orbitron Backend in development mode..."

cd "$(dirname "$0")/.."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Using .env.example as template."
    if [ -f .env.example ]; then
        echo "Please create .env file and configure your settings."
    fi
fi

# Set PYTHONPATH
export PYTHONPATH="$(pwd)"

# Run database migrations
echo "Running database migrations..."
python -c "
import asyncio
from app.db.session import engine
from app.models.base import Base

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Database initialized successfully!')

asyncio.run(init_db())
" 2>/dev/null || echo "Skipping database initialization..."

# Start uvicorn with hot reload
echo "Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload