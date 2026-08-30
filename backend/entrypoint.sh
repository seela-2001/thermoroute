#!/bin/sh

set -e

echo "Waiting for PostgreSQL..."

until python -c "
import os
import psycopg2

try:
    conn = psycopg2.connect(
        dbname=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        host=os.environ['DB_HOST'],
        port=os.environ['DB_PORT'],
    )
    conn.close()
    print('PostgreSQL is ready!')
except Exception:
    raise SystemExit(1)
"; do
    echo "PostgreSQL is unavailable - sleeping..."
    sleep 3
done

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Starting application..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000