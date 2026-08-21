"""
Agent 2: Travel Explanation Agent

Section 4, Agent 2: Convert structured analysis into natural language.

This agent exists only for UX - makes technical data understandable.
"""
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
    """
    Travel Explanation Agent.

    Responsibilities:
    - Explain why a route is recommended
    - Explain heat risks
    - Explain travel timing
    - Explain expected weather
    - Explain trade-offs
    - Provide safety guidance

    Section 4: This agent exists only for UX.
    It does not make decisions, only explains them.
    """

    PROMPT_VERSION = "1.0.0"
    DEFAULT_MODEL = "gpt-3.5-turbo"

    def __init__(self, llm_provider: LLMProvider, model: str = None):
        """
        Initialize Travel Explanation Agent.

        Args:
            llm_provider: LLM provider instance
            model: Model to use (defaults to gpt-3.5-turbo)
        """
        super().__init__(llm_provider)
        self._model = model or self.DEFAULT_MODEL

    def get_system_prompt(self) -> str:
        """Get Travel Explanation Agent system prompt."""
        from ..prompts import get_travel_explanation_prompt
        return get_travel_explanation_prompt()

    def get_prompt_version(self) -> str:
        """Get prompt version for observability."""
        return self.PROMPT_VERSION

    def get_model(self) -> str:
        """Get model to use."""
        return self._model

    def _calculate_confidence(self, context: AIContext) -> float:
        """
        Calculate confidence for explanation.

        Explanation can work with less data than recommendation.
        Minimum threshold is lower (0.3 instead of 0.5).
        """
        if not context.selected_route:
            return 0.0
        return 1.0 if context.to_dict() else 0.0

    def _build_user_prompt(self, context: AIContext) -> str:
        """
        Build user prompt from AIContext and recommendation.

        Args:
            context: AIContext with route data

        Returns:
            JSON string for LLM processing
        """
        context_dict = context.to_dict()

        prompt_data = {
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
                "Focus on what matters to the driver. "
                "Return as valid JSON."
            ),
        }

        return json.dumps(prompt_context, indent=2, ensure_ascii=False)

    def _parse_response(self, raw_response: str, context: AIContext) -> dict[str, Any]:
        """
        Parse LLM response into TravelExplanationOutput.

        Args:
            raw_response: JSON string from LLM
            context: Original AIContext

        Returns:
            Parsed output dict
        """
        try:
            data = json.loads(raw_response)

            return {
                "status": data.get("status", AIResponseStatus.SUCCESS.value),
                "headline": data.get("headline", ""),
                "summary": data.get("summary", ""),
                "details": data.get("details", []),
                "tips": data.get("tips", []),
            }

        except json.JSONDecodeError as e:
            return {
                "status": AIResponseStatus.INTERNAL_ERROR.value,
                "error": f"Failed to parse LLM response: {e}",
                "headline": "Explanation unavailable",
                "summary": "Could not generate explanation",
                "details": [],
                "tips": [],
            }

    async def explain(
        self,
        context: AIContext,
        recommendation_data: dict[str, Any] = None
    ) -> TravelExplanationOutput:
        """
        Generate travel explanation.

        Args:
            context: Validated AIContext
            recommendation_data: Optional additional recommendation data

        Returns:
            TravelExplanationOutput with explanation and metadata
        """
        # If recommendation data provided, enhance context
        if recommendation_data:
            if recommendation_data.get("recommended_route"):
                # Set selected route from recommendation
                for route in context.candidate_routes:
                    if route.id == recommendation_data["recommended_route"]:
                        context.selected_route = route
                        break

        # Ensure selected route is set
        if not context.selected_route and context.candidate_routes:
            context.selected_route = context.candidate_routes[0]

        result = await self.execute(context)

        # Handle error responses
        if result.get("status") != AIResponseStatus.SUCCESS.value:
            return TravelExplanationOutput(
                status=result.get("status", AIResponseStatus.INTERNAL_ERROR.value),
                headline="Explanation unavailable",
                summary=result.get("error", "Unknown error occurred"),
                details=[],
                tips=["Try again later"],
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
            model_used=result.get("model_used"),
            latency_ms=result.get("latency_ms"),
            tokens_used=result.get("tokens_used"),
        )