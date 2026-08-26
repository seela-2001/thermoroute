from dataclasses import dataclass
from typing import Optional

<<<<<<< HEAD
from thermoroute.ai_layer.ai.config import Config
=======
from config import Config
>>>>>>> AI-Layer
from thermoroute.ai_layer.ai.services import (
    RiskCalculator,
    RouteOptimizer,
    RecommendationExplainer,
    Route,
    RecommendationRequest,
    RecommendationResponse,
    HeatAnalysisResult,
    RouteOptimizationResult
)
from ai_layer.ai.exceptions import HeatOpsException
import json


class RouteProvider:

    def get_routes(
        self,
        origin: str,
        destination: str,
        temperature: float,
        humidity: float
    ) -> list[Route]:
        return [
            Route(
                id="A",
                origin=origin,
                destination=destination,
                distance_km=5.0,
                duration_min=15.0,
                segments=[
                    {"id": 1, "temperature": temperature + 2, "humidity": humidity, "heat_index": temperature + 5, "aqi": 70},
                    {"id": 2, "temperature": temperature + 4, "humidity": humidity, "heat_index": temperature + 8, "aqi": 85},
                ]
            ),
            Route(
                id="B",
                origin=origin,
                destination=destination,
                distance_km=6.0,
                duration_min=18.0,
                segments=[
                    {"id": 1, "temperature": temperature, "humidity": humidity, "heat_index": temperature + 2, "aqi": 50},
                    {"id": 2, "temperature": temperature + 1, "humidity": humidity, "heat_index": temperature + 3, "aqi": 55},
                ]
            ),
            Route(
                id="C",
                origin=origin,
                destination=destination,
                distance_km=7.0,
                duration_min=20.0,
                segments=[
                    {"id": 1, "temperature": temperature - 2, "humidity": humidity, "heat_index": temperature, "aqi": 35},
                    {"id": 2, "temperature": temperature - 1, "humidity": humidity, "heat_index": temperature + 1, "aqi": 40},
                ]
            ),
        ]


class RouteRecommendationService:

    def __init__(
        self,
        config: Optional[Config] = None,
        route_provider: Optional[RouteProvider] = None,
        use_llm: bool = False,
        llm_api_key: Optional[str] = None
    ):
        self.config = config or Config.default()
        self.route_provider = route_provider or RouteProvider()
        self.risk_calculator = RiskCalculator(self.config)
        self.route_optimizer = RouteOptimizer(self.config)
        self.explainer = RecommendationExplainer(self.config, llm_api_key)
        self.use_llm = use_llm

    def get_recommendation(self, request: RecommendationRequest) -> RecommendationResponse:
        try:
            routes = self.route_provider.get_routes(
                request.origin,
                request.destination,
                request.temperature,
                request.humidity
            )

            heat_results = {}
            for route in routes:
                heat_result = self.risk_calculator.analyze_route(
                    route.id,
                    route.segments
                )
                heat_results[route.id] = heat_result

            routes_data = [
                {
                    "id": r.id,
                    "distance_km": r.distance_km,
                    "duration_min": r.duration_min,
                    "heat_risk_score": heat_results[r.id].overall_risk_score
                }
                for r in routes
            ]

            optimization_result = self.route_optimizer.optimize(
                request.origin,
                request.destination,
                routes_data
            )

            best_heat = heat_results[optimization_result.recommended_route_id]
            ai_result = self.explainer.generate_recommendation(
                route_id=optimization_result.recommended_route_id,
                route_score=optimization_result.route_score,
                heat_risk_score=best_heat.overall_risk_score,
                max_heat_index=best_heat.metrics["max_heat_index"],
                extra_time=optimization_result.tradeoff.get("extra_time_minutes") if optimization_result.tradeoff else None,
                use_llm=self.use_llm
            )

            return RecommendationResponse(
                status="SUCCESS",
                recommendation={
                    "headline": ai_result.headline,
                    "decision": ai_result.decision,
                    "reason": ai_result.reason,
                    "key_factors": ai_result.key_factors,
                    "tradeoffs": ai_result.tradeoffs,
                    "safety_tip": ai_result.safety_tip
                },
                route_details={
                    "recommended_route": optimization_result.recommended_route_id,
                    "route_score": optimization_result.route_score,
                    "alternatives": optimization_result.alternatives,
                    "tradeoff": optimization_result.tradeoff
                },
                heat_analysis={
                    "overall_risk_score": best_heat.overall_risk_score,
                    "risk_level": best_heat.risk_level,
                    "critical_segments": best_heat.critical_segments,
                    "metrics": best_heat.metrics
                },
                input_params={
                    "origin": request.origin,
                    "destination": request.destination,
                    "temperature": request.temperature,
                    "humidity": request.humidity
                },
                question_answer=None
            )

        except HeatOpsException as e:
            return RecommendationResponse(
                status="FAILED",
                recommendation={},
                route_details={},
                heat_analysis={},
                input_params={},
                question_answer=e.to_dict()
            )
        except Exception as e:
            return RecommendationResponse(
                status="ERROR",
                recommendation={},
                route_details={},
                heat_analysis={},
                input_params={},
                question_answer={"error": str(e), "code": "INTERNAL_ERROR"}
            )


def to_dict(response: RecommendationResponse) -> dict:
    return {
        "status": response.status,
        "recommendation": response.recommendation,
        "route_details": response.route_details,
        "heat_analysis": response.heat_analysis,
        "input_params": response.input_params,
        "question_answer": response.question_answer
    }
