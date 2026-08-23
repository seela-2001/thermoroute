"""
Core Services
Refactored agent architecture with clear responsibilities.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import requests
import os

from .config import Config, RiskThresholds, NormalizationRanges
from ai.exceptions import ValidationError, APIError, LLMError


class RiskLevel(Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"
    EXTREME = "EXTREME"


class Decision(Enum):
    RECOMMEND = "RECOMMEND"
    CAUTION = "CAUTION"
    AVOID = "AVOID"


@dataclass
class RouteSegment:
    id: int
    temperature: float
    humidity: float
    heat_index: float
    aqi: float
    uv: float = 0.0


@dataclass
class Route:
    id: str
    origin: str
    destination: str
    distance_km: float
    duration_min: float
    segments: list[RouteSegment]


@dataclass
class HeatAnalysisResult:
    route_id: str
    overall_risk_score: int
    risk_level: RiskLevel
    critical_segments: list[dict]
    metrics: dict


@dataclass
class RouteOptimizationResult:
    recommended_route_id: str
    route_score: float
    alternatives: list[dict]
    tradeoff: Optional[dict]
    weights_used: dict


@dataclass
class RecommendationOutput:
    headline: str
    decision: str
    reason: str
    key_factors: list[str]
    tradeoffs: list[str]
    safety_tip: str


@dataclass
class RecommendationRequest:
    origin: str
    destination: str
    temperature: float
    humidity: float
    question: Optional[str] = None


@dataclass
class RecommendationResponse:
    status: str
    recommendation: dict
    route_details: dict
    heat_analysis: dict
    input_params: dict
    question_answer: Optional[str]


class RiskCalculator:
    """Deterministic risk calculation service."""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config.default()

    def _validate_segment_input(self, segment: dict) -> None:
        """Validate segment input data."""
        required = ["id", "temperature", "humidity", "heat_index", "aqi"]
        for field in required:
            if field not in segment:
                raise ValidationError(f"Missing required field: {field}", field)

        temp = segment["temperature"]
        if not isinstance(temp, (int, float)) or temp < -50 or temp > 60:
            raise ValidationError("Temperature must be between -50 and 60", "temperature")

        humidity = segment["humidity"]
        if not isinstance(humidity, (int, float)) or humidity < 0 or humidity > 100:
            raise ValidationError("Humidity must be between 0 and 100", "humidity")

    def calculate_segment_risk(self, segment: dict) -> int:
        """Calculate risk score for a single segment (0-100)."""
        self._validate_segment_input(segment)

        # Normalize each parameter
        temp_score = min(segment["temperature"] / self.config.normalization.temperature_max, 1.0) * 100
        heat_index_score = min(segment["heat_index"] / self.config.normalization.heat_index_max, 1.0) * 100

        humidity_optimal = self.config.normalization.humidity_optimal
        humidity_score = min(abs(segment["humidity"] - humidity_optimal) / humidity_optimal, 1.0) * 100
        aqi_score = min(segment["aqi"] / self.config.normalization.aqi_max, 1.0) * 100

        # Weighted average
        weighted = (
            temp_score * self.config.risk_weights.temperature +
            heat_index_score * self.config.risk_weights.heat_index +
            humidity_score * self.config.risk_weights.humidity +
            aqi_score * self.config.risk_weights.aqi
        ) / 100

        return int(round(weighted))

    def classify_risk_level(self, score: int) -> RiskLevel:
        thresholds = self.config.thresholds

        if score >= thresholds.EXTREME:
            return RiskLevel.EXTREME
        elif score >= thresholds.VERY_HIGH:
            return RiskLevel.VERY_HIGH
        elif score >= thresholds.HIGH:
            return RiskLevel.HIGH
        elif score >= thresholds.MODERATE:
            return RiskLevel.MODERATE

        return RiskLevel.LOW

    def analyze_route(self, route_id: str, segments: list[dict]) -> HeatAnalysisResult:
        """Analyze heat risk for an entire route."""
        if not segments:
            raise ValidationError("Route must have at least one segment", "segments")

        segment_risks = []
        for segment in segments:
            risk_score = self.calculate_segment_risk(segment)
            segment_risks.append({
                "segment_id": segment["id"],
                "risk_score": risk_score,
                "risk_level": self.classify_risk_level(risk_score).value
            })

        # Calculate overall risk (weighted by segment scores)
        weights = [s["risk_score"] for s in segment_risks]
        overall_score = int(round(
            sum(s * w for s, w in zip([r["risk_score"] for r in segment_risks], weights)) / sum(weights)
            if weights else 0
        ))

        # Identify critical segments
        critical_levels = {RiskLevel.HIGH, RiskLevel.VERY_HIGH, RiskLevel.EXTREME}
        critical_segments = [
            s for s in segment_risks
            if RiskLevel(s["risk_level"]) in critical_levels
        ]
        critical_segments.sort(key=lambda x: x["risk_score"], reverse=True)

        # Extract metrics
        metrics = {
            "max_temperature": max((s.get("temperature", 0) for s in segments), default=0),
            "max_humidity": max((s.get("humidity", 0) for s in segments), default=0),
            "max_heat_index": max((s.get("heat_index", 0) for s in segments), default=0),
            "max_aqi": max((s.get("aqi", 0) for s in segments), default=0),
        }

        return HeatAnalysisResult(
            route_id=route_id,
            overall_risk_score=overall_score,
            risk_level=self.classify_risk_level(overall_score).value,
            critical_segments=critical_segments,
            metrics=metrics
        )


class RouteOptimizer:
    """Deterministic route optimization service."""

    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config.default()

    def _normalize_cost(self, value: float, max_value: float) -> float:
        """Normalize cost metric (lower is better) to 0-100."""
        if max_value == 0:
            return 50.0
        return max(0.0, min(100.0, 100 - (value / max_value * 100)))

    def _normalize_benefit(self, value: float, max_value: float) -> float:
        """Normalize benefit metric (higher is better) to 0-100."""
        if max_value == 0:
            return 50.0
        return max(0.0, min(100.0, value / max_value * 100))

    def calculate_route_score(
        self,
        distance_km: float,
        duration_min: float,
        heat_risk_score: float,
        environmental_score: float = 50.0
    ) -> float:
        """Calculate route score (0-100, higher is better)."""
        distance_score = self._normalize_cost(distance_km, self.config.normalization.distance_max)
        duration_score = self._normalize_cost(duration_min, self.config.normalization.duration_max)
        heat_score = self._normalize_cost(heat_risk_score, 100.0)
        env_score = self._normalize_benefit(environmental_score, 100.0)

        weighted = (
            distance_score * self.config.optimization_weights.distance +
            duration_score * self.config.optimization_weights.duration +
            heat_score * self.config.optimization_weights.heat_risk +
            env_score * self.config.optimization_weights.environmental
        ) / 100

        return round(weighted, 2)

    def optimize(
        self,
        origin: str,
        destination: str,
        routes_data: list[dict]
    ) -> RouteOptimizationResult:
        """Find optimal route from list of routes."""
        if not routes_data:
            raise RouteNotFoundError(origin, destination)

        # Score all routes
        scored_routes = []
        for route in routes_data:
            score = self.calculate_route_score(
                distance_km=route["distance_km"],
                duration_min=route["duration_min"],
                heat_risk_score=route["heat_risk_score"],
                environmental_score=route.get("environmental_score", 50.0)
            )
            scored_routes.append((route["id"], score, route))

        # Sort by score descending
        scored_routes.sort(key=lambda x: x[1], reverse=True)

        best_id, best_score, best_route = scored_routes[0]
        alternatives = [
            {"route_id": rid, "score": score}
            for rid, score, _ in scored_routes[1:3]  # Top 2 alternatives
        ]

        # Calculate tradeoffs vs shortest
        shortest = min(routes_data, key=lambda r: r["distance_km"])
        tradeoff = None
        if best_id != shortest["id"]:
            tradeoff = {
                "extra_distance_km": round(best_route["distance_km"] - shortest["distance_km"], 1),
                "extra_time_minutes": round(best_route["duration_min"] - shortest["duration_min"], 1),
                "heat_risk_reduction": round(shortest["heat_risk_score"] - best_route["heat_risk_score"], 1)
            }
            # Remove zero/negative values
            tradeoff = {k: v for k, v in tradeoff.items() if v > 0}

        return RouteOptimizationResult(
            recommended_route_id=best_id,
            route_score=best_score,
            alternatives=alternatives,
            tradeoff=tradeoff,
            weights_used={
                "distance": self.config.optimization_weights.distance,
                "duration": self.config.optimization_weights.duration,
                "heat_risk": self.config.optimization_weights.heat_risk,
                "environmental": self.config.optimization_weights.environmental
            }
        )


class RecommendationExplainer:
    """Service for generating natural language recommendations (LLM or template-based)."""

    def __init__(self, config: Optional[Config] = None, openai_api_key: Optional[str] = None):
        self.config = config or Config.default()
        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")

    def _determine_decision(self, heat_risk_score: int, max_heat_index: float) -> Decision:
        """Determine recommendation decision (deterministic)."""
        if heat_risk_score >= 80 or max_heat_index >= 45:
            return Decision.AVOID
        elif heat_risk_score >= 50 or max_heat_index >= 38:
            return Decision.CAUTION
        return Decision.RECOMMEND

    def _generate_template_recommendation(
        self,
        route_id: str,
        route_score: float,
        heat_risk_score: int,
        max_heat_index: float,
        extra_time: Optional[float]
    ) -> RecommendationOutput:
        """Generate recommendation using deterministic templates."""
        decision = self._determine_decision(heat_risk_score, max_heat_index)

        # Headline
        if decision == Decision.RECOMMEND:
            headline = f"Route {route_id} is recommended"
        elif decision == Decision.CAUTION:
            headline = f"Route {route_id} - use with caution"
        else:
            headline = f"Route {route_id} - avoid if possible"

        # Reason
        reason_parts = [f"Route {route_id} scores {route_score}/100"]
        if heat_risk_score < 40:
            reason_parts.append("with low heat risk")
        elif heat_risk_score < 60:
            reason_parts.append("with moderate heat risk")
        else:
            reason_parts.append("despite elevated heat risk")

        if extra_time and extra_time > 0:
            reason_parts.append(f"(adds {extra_time:.1f} min vs shortest route)")

        reason = ". ".join(reason_parts) + "."

        # Key factors
        key_factors = []
        if route_score > 70:
            key_factors.append(f"High overall score ({route_score}/100)")
        if heat_risk_score < 50:
            key_factors.append("Low heat risk exposure")
        if extra_time and 0 < extra_time < 10:
            key_factors.append(f"Minimal time impact (+{extra_time:.1f} min)")

        # Tradeoffs
        tradeoffs = []
        if extra_time and extra_time > 5:
            tradeoffs.append(f"Longer travel time (+{extra_time:.1f} min)")

        # Safety tip
        if max_heat_index > 40:
            safety_tip = "High heat index. Stay hydrated, seek shade, take breaks."
        elif heat_risk_score > 60:
            safety_tip = "Elevated heat risk. Consider traveling during cooler hours."
        else:
            safety_tip = "Standard travel precautions apply."

        return RecommendationOutput(
            headline=headline,
            decision=decision.value,
            reason=reason,
            key_factors=key_factors or ["Balanced route performance"],
            tradeoffs=tradeoffs,
            safety_tip=safety_tip
        )

    def generate_recommendation(
        self,
        route_id: str,
        route_score: float,
        heat_risk_score: int,
        max_heat_index: float,
        extra_time: Optional[float],
        use_llm: bool = False
    ) -> RecommendationOutput:
        """Generate recommendation (uses LLM if available, otherwise templates)."""
        if use_llm and self.api_key:
            try:
                return self._generate_llm_recommendation(
                    route_id, route_score, heat_risk_score, max_heat_index, extra_time
                )
            except Exception as e:
                # Fall back to template on error
                pass

        return self._generate_template_recommendation(
            route_id, route_score, heat_risk_score, max_heat_index, extra_time
        )

    def _generate_llm_recommendation(
        self,
        route_id: str,
        route_score: float,
        heat_risk_score: int,
        max_heat_index: float,
        extra_time: Optional[float]
    ) -> RecommendationOutput:
        """Generate recommendation using OpenAI API with JSON mode."""
        system_prompt = """You are a route recommendation assistant. Provide a JSON response with this structure:
{
  "headline": "Brief recommendation headline",
  "decision": "RECOMMEND" | "CAUTION" | "AVOID",
  "reason": "1-2 sentence explanation",
  "key_factors": ["factor1", "factor2"],
  "tradeoffs": ["tradeoff1"],
  "safety_tip": "Brief safety advice"
}"""

        user_prompt = f"""Route Analysis:
- Route ID: {route_id}
- Overall Score: {route_score}/100
- Heat Risk Score: {heat_risk_score}/100
- Max Heat Index: {max_heat_index}°C
- Extra Time vs Shortest: {extra_time} minutes

Provide a clear, concise recommendation."""

        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.3
            },
            timeout=10
        )
        response.raise_for_status()

        data = response.json()["choices"][0]["message"]["content"]
        import json
        parsed = json.loads(data)

        return RecommendationOutput(
            headline=parsed.get("headline", f"Route {route_id} recommended"),
            decision=parsed.get("decision", "RECOMMEND"),
            reason=parsed.get("reason", "Based on analysis"),
            key_factors=parsed.get("key_factors", []),
            tradeoffs=parsed.get("tradeoffs", []),
            safety_tip=parsed.get("safety_tip", "Standard precautions apply")
        )