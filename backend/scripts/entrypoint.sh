#!/usr/bin/bash
set -e

if [ "${RUN_MIGRATIONS}" = "true" ]; then
    echo "Running database migrations..."
    alembic upgrade head || { echo "ERROR: Migrations failed!"; exit 1; }
    echo "Migrations complete."
fi

exec "$@"