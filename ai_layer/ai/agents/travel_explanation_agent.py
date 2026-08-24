import json
from typing import Any

from ..providers import LLMProvider
from ..schemas import (
    AIContext,
    TravelExplanationOutput,
    AIResponseStatus,
)
from .base import BaseAgent


class TravelExplanationAgent(BaseAgent):

    PROMPT_VERSION = "1.0.0"
    DEFAULT_MODEL = "gpt-3.5-turbo"

    def __init__(self, llm_provider: LLMProvider, model: str = None):
        super().__init__(llm_provider)
        self._model = model or self.DEFAULT_MODEL

    def get_system_prompt(self) -> str:
        from ..prompts import get_travel_explanation_prompt
        return get_travel_explanation_prompt()

    def get_prompt_version(self) -> str:
        return self.PROMPT_VERSION

    def get_model(self) -> str:
        return self._model

    def _calculate_confidence(self, context: AIContext) -> float:
        if not context.selected_route:
            return 0.0
        return 1.0 if context.to_dict() else 0.0

    def _build_user_prompt(self, context: AIContext) -> str:
        context_dict = context.to_dict()

        current_risk_level = "UNKNOWN"
        if context.selected_route and context.selected_route.id in context.risk_scores:
            current_risk_level = context.risk_scores[context.selected_route.id].risk_level

        current_time = "now"
        if context.trip.departure_time:
            current_time = context.trip.departure_time

        prompt_data = {
            "current_time": current_time,
            "current_risk_level": current_risk_level,
            "recommendation": {
                "recommended_route": context.selected_route.id if context.selected_route else None,
                "summary": "Provide explanation for this route",
                "decision": context.selected_route.name if context.selected_route else "Unknown",
            },
            "risk": {
                "risk_scores": context_dict.get("risk_scores", {}),
                "heat": context_dict.get("heat", {}),
            },
            "forecast": context_dict.get("forecast", []),
            "route_details": {
                "distance_km": context.selected_route.distance_km if context.selected_route else 0,
                "duration_min": context.selected_route.duration_min if context.selected_route else 0,
                "road_identifiers": context.selected_route.road_identifiers if context.selected_route else [],
            },
            "rest_stops": context_dict.get("rest_stops", []),
            "gas_stations": context_dict.get("gas_stations", []),
        }

        prompt_context = {
            "context": prompt_data,
            "instructions": (
                "Convert this structured route analysis into natural language. "
                "Explain the recommendation clearly. "
                "Determine if current time is good to go based on current risk level. "
                "If not good to go, check the 12-hour forecast for LOW risk times. "
                "Focus on what matters to the driver. "
                "Return as valid JSON with good_to_go and best_departure_times fields."
            ),
        }

        return json.dumps(prompt_context, indent=2, ensure_ascii=False)

    def _parse_response(self, raw_response: str, context: AIContext) -> dict[str, Any]:
        try:
            data = json.loads(raw_response)

            return {
                "status": data.get("status", AIResponseStatus.SUCCESS.value),
                "headline": data.get("headline", ""),
                "summary": data.get("summary", ""),
                "details": data.get("details", []),
                "tips": data.get("tips", []),
                "good_to_go": data.get("good_to_go", False),
                "best_departure_times": data.get("best_departure_times", []),
            }

        except json.JSONDecodeError as e:
            return {
                "status": AIResponseStatus.INTERNAL_ERROR.value,
                "error": f"Failed to parse LLM response: {e}",
                "headline": "Explanation unavailable",
                "summary": "Could not generate explanation",
                "details": [],
                "tips": [],
                "good_to_go": False,
                "best_departure_times": [],
            }

    async def explain(
        self,
        context: AIContext,
        recommendation_data: dict[str, Any] = None
    ) -> TravelExplanationOutput:
        if recommendation_data:
            if recommendation_data.get("recommended_route"):
                for route in context.candidate_routes:
                    if route.id == recommendation_data["recommended_route"]:
                        context.selected_route = route
                        break

        if not context.selected_route and context.candidate_routes:
            context.selected_route = context.candidate_routes[0]

        result = await self.execute(context)

        if result.get("status") != AIResponseStatus.SUCCESS.value:
            return TravelExplanationOutput(
                status=result.get("status", AIResponseStatus.INTERNAL_ERROR.value),
                headline="Explanation unavailable",
                summary=result.get("error", "Unknown error occurred"),
                details=[],
                tips=["Try again later"],
                good_to_go=False,
                best_departure_times=[],
                model_used=result.get("model_used"),
                latency_ms=result.get("latency_ms"),
                tokens_used=result.get("tokens_used"),
            )

        return TravelExplanationOutput(
            status=result.get("status", AIResponseStatus.SUCCESS.value),
            headline=result.get("headline", ""),
            summary=result.get("summary", ""),
            details=result.get("details", []),
            tips=result.get("tips", []),
            good_to_go=result.get("good_to_go", False),
            best_departure_times=result.get("best_departure_times", []),
            model_used=result.get("model_used"),
            latency_ms=result.get("latency_ms"),
            tokens_used=result.get("tokens_used"),
        )
