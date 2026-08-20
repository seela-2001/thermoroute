#!/bin/sh
set -e

echo "Running database migrations..."
uv run python manage.py migrate --noinput

echo "Starting application..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000
