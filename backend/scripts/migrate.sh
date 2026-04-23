#!/bin/bash

set -e

cd "$(dirname "$0")/.."

export PYTHONPATH="$(pwd)"

echo "Running Alembic migrations..."

# Run migrations
alembic upgrade "$1"

echo "Migration complete!"