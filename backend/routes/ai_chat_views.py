import logging
import os
import traceback
from datetime import datetime, timezone

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


class AIChatView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        history = request.data.get("history") or []
        mode = (request.data.get("mode") or "plan").strip()

        if not message:
            return Response({"error": "message is required"}, status=400)

        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key:
            return Response(
                {
                    "reply": "OPENROUTER_API_KEY is not set in backend/.env",
                    "extracted_fields": {},
                    "action": "clarify",
                }
            )

        if mode == "results":
            return self._handle_results_qa(message, history, api_key)

        try:
            from ai.agents.trip_parser_agent import TripParserAgent
            from routes.services.location_services import LocationService

            agent = TripParserAgent(api_key=api_key)
            result = agent.parse(
                message=message,
                history=history,
                now=datetime.now(timezone.utc),
            )

            fields = result.get("extracted_fields") or {}
            action = result.get("action", "clarify")
            auto_submit = False

            # Geocode both ends when AI has extracted them — enables zero-click analysis
            if action in ("fill_form", "submit") and fields.get("origin_text") and fields.get("destination_text"):
                svc = LocationService()
                origin_geo = svc.geocode(fields["origin_text"])
                dest_geo = svc.geocode(fields["destination_text"])

                if origin_geo.get("success"):
                    fields["origin_lat"] = origin_geo["lat"]
                    fields["origin_lng"] = origin_geo["lon"]

                if dest_geo.get("success"):
                    fields["destination_lat"] = dest_geo["lat"]
                    fields["destination_lng"] = dest_geo["lon"]

                if origin_geo.get("success") and dest_geo.get("success"):
                    auto_submit = True

            return Response({
                "reply": result.get("reply", "Got it!"),
                "extracted_fields": fields,
                "action": action,
                "auto_submit": auto_submit,
            })

        except Exception as exc:
            tb = traceback.format_exc()
            logger.error("AIChatView failed:\n%s", tb)
            error_detail = str(exc) if settings.DEBUG else "Please try again."
            return Response(
                {
                    "reply": f"AI error: {error_detail}",
                    "extracted_fields": {},
                    "action": "clarify",
                    "auto_submit": False,
                    **({"traceback": tb} if settings.DEBUG else {}),
                }
            )

    @staticmethod
    def _handle_results_qa(message: str, history: list, api_key: str):
        """Direct Q&A about an already-analyzed route. No trip parsing, no planning."""
        _QA_SYSTEM = (
            "You are ThermoRoute AI — a precise, data-driven heat-aware driving assistant.\n"
            "The FIRST message in this conversation is an assistant message containing the complete route analysis data: "
            "origin, destination, distance, duration, AI decision, risk factors, full departure schedule with temperatures and risk levels per hour, "
            "actual heat data points along the route (temperature, heat index, risk at each km), "
            "AI-suggested cooling stops with names and distances, critical alerts, and all POI stops.\n"
            "RULES — follow these strictly:\n"
            "1. ALWAYS answer using the specific numbers from the route data. Never answer generically.\n"
            "2. Cite real values: exact temperatures, distances in km, stop names, departure times.\n"
            "3. Answer in 1-4 sentences. Be direct.\n"
            "4. If asked about best departure → give the exact hour and its temperature/risk from the schedule.\n"
            "5. If asked about stops → list the actual stop names and distances from the data.\n"
            "6. If asked about safety or risk → state the decision (GO/CAUTION/DELAY) and the peak metrics.\n"
            "7. If asked about worst stretch → identify the km range and temperature from the heat waypoints.\n"
            "8. Never say 'I don't have that information' — all data is in the first message.\n"
            "9. Never ask for origin or destination — it is in the data.\n"
            "10. Never plan a new route or trigger analysis."
        )
        try:
            from ai.providers.openrouter import OpenRouterProvider
            import asyncio

            provider = OpenRouterProvider(api_key=api_key)

            # Build messages list: context prefix (from injected assistant history entry) + real history + user message
            messages = []
            for h in history:
                role = h.get("role", "user")
                content = h.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})
            messages.append({"role": "user", "content": message})

            loop = asyncio.new_event_loop()
            try:
                response = loop.run_until_complete(
                    provider.generate(
                        _QA_SYSTEM,
                        "",  # unused — full messages list passed below
                        messages=messages,  # proper multi-turn conversation
                        json_mode=False,
                        temperature=0.4,
                        max_tokens=300,
                        max_retries=1,
                        timeout=20,
                    )
                )
            finally:
                loop.close()

            reply = (response.content or "").strip()
            return Response({"reply": reply, "extracted_fields": {}, "action": "clarify", "auto_submit": False})

        except Exception as exc:
            logger.error("Results QA failed: %s", exc, exc_info=True)
            return Response({"reply": "Sorry, I couldn't process that. Try rephrasing your question.", "extracted_fields": {}, "action": "clarify", "auto_submit": False})
