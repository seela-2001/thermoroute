import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from ..providers.openrouter import OpenRouterProvider
from ..json_utils import extract_json

logger = logging.getLogger(__name__)


_SYSTEM_PROMPT = """You are a trip planning assistant for ThermoRoute — a heat-aware US route planner.

Parse the user's message and return ONLY valid JSON with this exact schema:
{
  "action": "fill_form" | "clarify" | "submit",
  "reply": "friendly 1-2 sentence reply",
  "extracted_fields": {
    "origin_text": "City, ST or null",
    "destination_text": "City, ST or null",
    "departure_start": "ISO-8601 UTC or null",
    "departure_end": "ISO-8601 UTC or null",
    "jurisdiction": "2-letter US state code or null"
  }
}

action rules:
- "fill_form"  — both origin AND destination are known
- "clarify"    — missing required info (ask ONE focused follow-up)
- "submit"     — user explicitly said "go", "run it", "yes", "analyze now" etc.

Departure time rules — CRITICAL:
- ALL times must be within the next 12 hours (between now_utc and max_departure_utc given below)
- "now" / "immediately" → departure_start = now_utc, departure_end = now_utc + 3h
- "this morning" (still future) → 6 AM local, else now_utc
- "this afternoon" (still future) → 1 PM local, else now_utc
- specific future hour within 12h window → use it
- Tomorrow / next week / future days → set departure_start/end to null and add a note in reply that only next-12h windows are supported
- No time mentioned → null (form will use its default)

jurisdiction: use destination US state 2-letter code when known, else null."""


class TripParserAgent:
    """Parses natural language trip intent into structured form fields."""

    def __init__(self, api_key: str, model: str = "minimax/minimax-m3:free"):
        self._api_key = api_key
        self._model = model
        self._provider: OpenRouterProvider | None = None

    def _provider_instance(self) -> OpenRouterProvider:
        if self._provider is None:
            self._provider = OpenRouterProvider(api_key=self._api_key)
        return self._provider

    def parse(
        self,
        message: str,
        history: list[dict[str, str]],
        now: datetime | None = None,
    ) -> dict[str, Any]:
        now = now or datetime.now(timezone.utc)
        max_departure = now + timedelta(hours=12)

        user_prompt = json.dumps(
            {
                "now_utc": now.isoformat(),
                "max_departure_utc": max_departure.isoformat(),
                "message": message,
                "recent_history": history[-6:],
            },
            ensure_ascii=False,
        )

        try:
            provider = self._provider_instance()
            loop = asyncio.new_event_loop()
            try:
                response = loop.run_until_complete(
                    provider.generate(
                        _SYSTEM_PROMPT,
                        user_prompt,
                        json_mode=False,   # free model — rely on prompt, not response_format
                        temperature=0.2,
                        max_tokens=600,
                        max_retries=1,     # chat must be fast — no long retry waits
                        timeout=20,
                    )
                )
            finally:
                loop.close()

            data = extract_json(response.content)
        except Exception as exc:
            logger.error("TripParserAgent failed: %s", exc, exc_info=True)
            return {
                "reply": "I had trouble understanding that. Could you tell me your origin and destination?",
                "extracted_fields": {},
                "action": "clarify",
            }

        fields: dict[str, Any] = data.get("extracted_fields") or {}
        self._clamp_departure_window(fields, now, max_departure)

        return {
            "reply": data.get("reply", "Got it!"),
            "extracted_fields": fields,
            "action": data.get("action", "clarify"),
        }

    @staticmethod
    def _clamp_departure_window(
        fields: dict[str, Any],
        now: datetime,
        max_departure: datetime,
    ) -> None:
        for key in ("departure_start", "departure_end"):
            raw = fields.get(key)
            if not raw:
                continue
            try:
                dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                dt = max(now, min(dt, max_departure))
                fields[key] = dt.isoformat()
            except Exception:
                fields[key] = None
