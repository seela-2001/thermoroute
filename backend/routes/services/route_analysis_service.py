from .route_providers import RouteProvider
from .weather_services import WeatherService
from .poi_services import POIService
from heat.services.heat_analysis_services import HeatAnalysisService


class RouteAnalysisService:
    """
    Orchestrates:
    - Route retrieval
    - Heat analysis
    - Weather data
    - Nearby POIs

    POI failures are non-blocking because POIs are
    supplementary data and should not prevent route analysis.
    """

    def __init__(self):
        self.route_provider = RouteProvider()
        self.heat_analysis_service = HeatAnalysisService()
        self.weather_service = WeatherService()
        self.poi_service = POIService()

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

        for index, route in enumerate(routes):

            geometry_points = self._geometry_to_points(
                route.get("geometry")
            )
            sampled_points = self._sample_points(
                geometry_points,
                max_points=5,
            )
            heat_result = self.heat_analysis_service.analyze(
                sampled_points
            )

            if not heat_result.get("success"):
                return {
                    "success": False,
                    "errors": heat_result.get(
                        "errors",
                        ["Heat analysis failed"],
                    ),
                }

            analysis = heat_result["analysis"]
            weather = {
                "current": {},
                "hourly": [],
            }

            if sampled_points:
                try:
                    weather = self.weather_service.get_weather(
                        lat=sampled_points[0]["lat"],
                        lon=sampled_points[0]["lon"],
                    )

                    if not isinstance(weather, dict):
                        weather = {
                            "current": {},
                            "hourly": [],
                        }

                except Exception as exc:
                    print(
                        f"Weather API Error: {exc}"
                    )

                    weather = {
                        "current": {},
                        "hourly": [],
                    }

            pois = []

            if sampled_points:
                try:
                    pois = self.poi_service.get_pois(
                        sampled_points,
                        radius=500,
                    )

                    if not isinstance(pois, list):
                        pois = []

                except Exception as exc:
                    print(
                        f"POI service unavailable: {exc}"
                    )

                    pois = []

            analyzed_route = {
                **route,

                "heat_data": heat_result.get(
                    "heat_data",
                    [],
                ),
                "risk": {
                    "score": analysis.overall_risk_score,
                    "level": analysis.risk_level,
                    "critical_segments": (
                        analysis.critical_segments
                    ),
                    "metrics": analysis.metrics,
                },
                "weather": weather.get(
                    "current",
                    {},
                ),
                "hourly_conditions": weather.get(
                    "hourly",
                    [],
                ),
                "pois": pois,
            }
            analyzed_routes.append(
                analyzed_route
            )
        recommended_route = min(
            analyzed_routes,
            key=lambda route: route["risk"]["score"],
        )
        recommended_route_id = (
            recommended_route.get("id")
            or recommended_route.get("route_id")
            or str(
                analyzed_routes.index(
                    recommended_route
                )
            )
        )
        alternatives = []

        for route_index, route in enumerate(
            analyzed_routes
        ):
            route_id = (
                route.get("id")
                or route.get("route_id")
                or str(route_index)
            )

            if route_id == recommended_route_id:
                continue

            alternatives.append(
                {
                    "route_id": route_id,
                    "risk_score": route["risk"]["score"],
                    "risk_level": route["risk"]["level"],
                    "distance_km": route.get(
                        "distance_km"
                    ),
                    "duration_min": route.get(
                        "duration_min"
                    ),
                }
            )

        alternatives.sort(
            key=lambda route: route["risk_score"]
        )
        return {
            "success": True,
            "recommended_route_id": recommended_route_id,
            "routes_count": len(analyzed_routes),
            "routes": analyzed_routes,
            "alternatives": alternatives,
        }

    @staticmethod
    def _geometry_to_points(geometry):
        if not geometry:
            return []

        coordinates = geometry.get(
            "coordinates",
            [],
        )

        return [
            {
                "lat": coordinate[1],
                "lon": coordinate[0],
            }
            for coordinate in coordinates
            if len(coordinate) >= 2
        ]

    @staticmethod
    def _sample_points(
        points,
        max_points=5,
    ):
        if not points:
            return []

        if len(points) <= max_points:
            return points

        step = len(points) / max_points

        return [
            points[int(i * step)]
            for i in range(max_points)
        ]
