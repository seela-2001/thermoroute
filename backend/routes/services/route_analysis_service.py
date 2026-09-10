from datetime import datetime, timezone

from .route_providers import RouteProvider
from .temporal_route_evaluation_service import TemporalRouteEvaluationService


class RouteAnalysisService:
    def __init__(self):
        self.route_provider = RouteProvider()
        self.temporal_evaluator = TemporalRouteEvaluationService()

    def analyze(
        self,
        origin_lat: float,
        origin_lng: float,
        destination_lat: float,
        destination_lng: float,
        jurisdiction: str,
        departure_start: datetime | None = None,
        departure_end: datetime | None = None,
        step_minutes: int = 30,
        weather_weight: float = 0.7,
        time_weight: float = 0.3,
        traffic_aware: bool = False,
    ):
        routes = self.route_provider.get_routes(
            origin_lat=origin_lat,
            origin_lng=origin_lng,
            destination_lat=destination_lat,
            destination_lng=destination_lng,
        )

        if not routes:
            return {
                "success": False,
                "errors": ["No routes found"],
            }

        departure_start = departure_start or datetime.now(timezone.utc)
        if departure_start.tzinfo is None:
            departure_start = departure_start.replace(tzinfo=timezone.utc)

        if departure_end is None:
            departure_end = departure_start

        if departure_end.tzinfo is None:
            departure_end = departure_end.replace(tzinfo=timezone.utc)

        origin = {
            "lat": origin_lat,
            "lon": origin_lng,
        }
        destination = {
            "lat": destination_lat,
            "lon": destination_lng,
        }

        result = self.temporal_evaluator.evaluate(
            routes=routes,
            origin=origin,
            destination=destination,
            jurisdiction=jurisdiction,
            departure_start=departure_start,
            departure_end=departure_end,
            step_minutes=step_minutes,
            weather_weight=weather_weight,
            time_weight=time_weight,
            traffic_aware=traffic_aware,
        )

        if not result.get("success"):
            return result

        departure_recommendations = result.get(
            "departure_recommendations",
            [],
        )

        recommended_route_id = None
        if result.get("best_departure"):
            recommended_route_id = result["best_departure"].get(
                "recommended_route_id"
            )
        elif departure_recommendations:
            recommended_route_id = departure_recommendations[0].get(
                "recommended_route_id"
            )

        result["recommended_route_id"] = recommended_route_id
        result["routes_count"] = len(routes)

        alternatives = []
        route_summary = result.get("routes", [])

        for route in route_summary:
            if route.get("id") == recommended_route_id:
                continue

            evaluations = [
                evaluation
                for evaluation in route.get("evaluations", [])
                if evaluation.get("route_score") is not None
            ]

            best_evaluation = min(
                evaluations,
                key=lambda item: item["route_score"],
                default=None,
            )

            alternatives.append(
                {
                    "route_id": route.get("id"),
                    "distance_km": route.get("distance_km"),
                    "duration_min": route.get("duration_min"),
                    "best_route_score": (
                        best_evaluation.get("route_score")
                        if best_evaluation
                        else None
                    ),
                    "weather_score": (
                        best_evaluation.get("weather_score")
                        if best_evaluation
                        else None
                    ),
                    "time_score": (
                        best_evaluation.get("time_score")
                        if best_evaluation
                        else None
                    ),
                    "poi_count": len(route.get("pois", [])),
                }
            )

        alternatives.sort(
            key=lambda item: (
                item["best_route_score"]
                if item["best_route_score"] is not None
                else float("inf")
            )
        )

        result["alternatives"] = alternatives
        return result
