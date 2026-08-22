from .route_providers import RouteProvider
from heat.services.heat_analysis_services import HeatAnalysisService


class RouteAnalysisService:

    def __init__(self):
        self.route_provider = RouteProvider()
        self.heat_analysis_service = HeatAnalysisService()

    def analyze(
        self,
        origin_lat: float,
        origin_lng: float,
        destination_lat: float,
        destination_lng: float,
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

        analyzed_routes = []

        for index, route in enumerate(routes, start=1):
            geometry_points = self._geometry_to_points(
                route["geometry"]
            )
            sampled_points = self._sample_points(
                geometry_points,
                max_points=5,
            )
            heat_result = self.heat_analysis_service.analyze(
                sampled_points
            )
            if not heat_result["success"]:
                return {
                    "success": False,
                    "errors": heat_result["errors"],
                }

            analysis = heat_result["analysis"]
            route_score = self._calculate_route_score(
                distance_km=route["distance_km"],
                duration_min=route["duration_min"],
                heat_risk_score=analysis.overall_risk_score,
            )
            recommendation = self._build_recommendation(
                route_id=f"route_{index}",
                route_score=route_score,
                heat_risk_score=analysis.overall_risk_score,
                risk_level=analysis.risk_level,
                metrics=analysis.metrics,
            )
            analyzed_routes.append(
                {
                    "id": f"route_{index}",
                    "distance_km": route["distance_km"],
                    "duration_min": route["duration_min"],
                    "geometry": route["geometry"],
                    "sampled_points": sampled_points,
                    "heat_data": heat_result["heat_data"],
                    "risk": {
                        "score": analysis.overall_risk_score,
                        "level": analysis.risk_level,
                        "critical_segments": analysis.critical_segments,
                        "metrics": analysis.metrics,
                    },
                    "route_score": route_score,
                    "recommendation": recommendation,
                }
            )
        analyzed_routes.sort(
            key=lambda route: route["route_score"],
            reverse=True,
        )

        for index, route in enumerate(analyzed_routes):

            route["rank"] = index + 1

            route["recommended"] = index == 0

        alternatives = []

        for route in analyzed_routes[1:]:
            alternatives.append(
                {
                    "route_id": route["id"],
                    "rank": route["rank"],
                    "route_score": route["route_score"],
                    "distance_km": route["distance_km"],
                    "duration_min": route["duration_min"],
                    "heat_risk_score": route["risk"]["score"],
                    "risk_level": route["risk"]["level"],
                }
            )

        return {
            "success": True,
            "recommended_route_id": (
                analyzed_routes[0]["id"]
                if analyzed_routes
                else None
            ),
            "routes_count": len(analyzed_routes),
            "routes": analyzed_routes,
            "alternatives": alternatives,
        }

    @staticmethod
    def _geometry_to_points(geometry):
        return [
            {
                "lat": coordinate[1],
                "lon": coordinate[0],
            }
            for coordinate in geometry["coordinates"]
        ]

    @staticmethod
    def _sample_points(points, max_points=20):
        if not points:
            return []

        if len(points) <= max_points:
            return points

        step = len(points) / max_points

        return [
            points[int(i * step)]
            for i in range(max_points)
        ]

    @staticmethod
    def _calculate_route_score(
        distance_km: float,
        duration_min: float,
        heat_risk_score: float,
    ) -> float:

        distance_score = max(
            0,
            min(
                100,
                100 - (distance_km / 50) * 100,
            ),
        )
        duration_score = max(
            0,
            min(
                100,
                100 - (duration_min / 120) * 100,
            ),
        )
        heat_score = max(
            0,
            min(
                100,
                100 - heat_risk_score,
            ),
        )
        final_score = (
            heat_score * 0.50
            + distance_score * 0.30
            + duration_score * 0.20
        )

        return round(final_score, 2)

    @staticmethod
    def _build_recommendation(
        route_id: str,
        route_score: float,
        heat_risk_score: int,
        risk_level: str,
        metrics: dict,
    ):
        max_heat_index = metrics.get(
            "max_heat_index",
            0,
        )
        if (
            heat_risk_score >= 80
            or max_heat_index >= 45
        ):
            decision = "AVOID"

        elif (
            heat_risk_score >= 50
            or max_heat_index >= 38
        ):
            decision = "CAUTION"

        else:
            decision = "RECOMMEND"

        if decision == "RECOMMEND":
            headline = "Recommended route"

        elif decision == "CAUTION":
            headline = "Use this route with caution"

        else:
            headline = "Avoid this route if possible"

        if heat_risk_score < 40:
            heat_reason = "low heat exposure"

        elif heat_risk_score < 60:
            heat_reason = "moderate heat exposure"

        elif heat_risk_score < 80:
            heat_reason = "high heat exposure"

        else:
            heat_reason = "very high heat exposure"

        reason = (
            f"This route has a score of {route_score}/100 "
            f"with {heat_reason}."
        )

        key_factors = [
            f"Heat risk score: {heat_risk_score}/100",
            f"Risk level: {risk_level}",
            f"Maximum temperature: "
            f"{metrics.get('max_temperature', 0)}°C",
            f"Maximum heat index: "
            f"{metrics.get('max_heat_index', 0):.1f}°C",
        ]

        if max_heat_index >= 40:
            safety_tip = (
                "Extreme heat exposure. Stay hydrated, "
                "seek shade, and consider traveling "
                "during cooler hours."
            )

        elif heat_risk_score >= 60:
            safety_tip = (
                "Elevated heat risk. Stay hydrated "
                "and take breaks when possible."
            )

        elif heat_risk_score >= 40:
            safety_tip = (
                "Moderate heat exposure. Stay hydrated "
                "and prefer shaded areas."
            )

        else:
            safety_tip = (
                "Heat conditions are relatively safe. "
                "Normal precautions apply."
            )

        return {
            "decision": decision,
            "headline": headline,
            "reason": reason,
            "key_factors": key_factors,
            "safety_tip": safety_tip,
        }
