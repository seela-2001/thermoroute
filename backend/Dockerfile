FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1

ENV PYTHONBUFFERED=1

ENV UV_COMPILE_BYTECODE=1

ENV UV_LINK_MODE=copy

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock /app/

RUN uv sync --frozen --no-dev

COPY . .

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]