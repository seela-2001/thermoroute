FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1

ENV PYTHONUNBUFFERED=1

ENV UV_COMPILE_BYTECODE=1

ENV UV_LINK_MODE=copy

ENV PATH="/app/.venv/bin:$PATH"

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY backend/pyproject.toml backend/uv.lock /app/

COPY ai_layer /ai_layer

RUN uv sync --frozen --no-dev

COPY backend/ .

COPY backend/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
