from .route_providers import RouteProvider
from .weather_services import WeatherService
from .poi_services import POIService
from .traffic_services import TrafficService
from .camera_services import CameraService
from heat.services.heat_analysis_services import HeatAnalysisService


class RouteAnalysisService:

    def __init__(self):
        self.route_provider = RouteProvider()
        self.heat_analysis_service = HeatAnalysisService()
        self.weather_service = WeatherService()
        self.poi_service = POIService()
        self.traffic_service = TrafficService()
        self.camera_service = CameraService()

    def analyze(
        self,
        origin_lat: float,
        origin_lng: float,
        destination_lat: float,
        destination_lng: float,
        jurisdiction: str,
        start_date: str | None = None,
        start_time: str | None = None,
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

        for route in routes:
            geometry_points = self._geometry_to_points(
                route.get("geometry")
            )
            sampled_points = self._sample_points(
                geometry_points,
                max_points=5,
            )

            heat_result = (
                self.heat_analysis_service.analyze(
                    sampled_points
                )
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
                    weather = (
                        self.weather_service.get_weather(
                            lat=sampled_points[0]["lat"],
                            lon=sampled_points[0]["lon"],
                        )
                    )

                    if not isinstance(
                        weather,
                        dict,
                    ):
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

            try:
                pois = self.poi_service.get_pois(
                    origin={
                        "lat": origin_lat,
                        "lon": origin_lng,
                    },
                    destination={
                        "lat": destination_lat,
                        "lon": destination_lng,
                    },
                    route_points=geometry_points,
                )

                if not isinstance(pois, list):
                    pois = []

            except Exception as exc:
                print(
                    f"POI service unavailable: {exc}"
                )
                pois = []

            try:
                cameras = self.camera_service.get_cameras_for_route(
                    route=route,
                    jurisdiction=jurisdiction,
                )

                if not isinstance(
                    cameras,
                    list,
                ):
                    cameras = []

            except Exception as exc:
                print(
                    f"Camera service unavailable: {exc}"
                )
                cameras = []

            traffic = self._get_route_traffic(
                sampled_points
            )

            analyzed_route = {
                **route,
                "sampled_points": sampled_points,
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
                "cameras": cameras,
                "traffic": traffic,
            }

            analyzed_routes.append(
                analyzed_route
            )

        if not analyzed_routes:
            return {
                "success": False,
                "errors": [
                    "Route analysis returned no routes"
                ],
            }

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

            traffic_data = route.get(
                "traffic",
                {},
            )

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
                    "traffic_level": traffic_data.get(
                        "traffic_level",
                        "UNKNOWN",
                    ),
                    "traffic_score": traffic_data.get(
                        "traffic_score",
                        0,
                    ),
                    "congestion": traffic_data.get(
                        "congestion",
                        0.0,
                    ),
                    "camera_count": len(
                        route.get(
                            "cameras",
                            [],
                        )
                    ),
                    "poi_count": len(
                        route.get(
                            "pois",
                            [],
                        )
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

    def _get_route_traffic(
        self,
        sampled_points,
    ):
        if not sampled_points:
            return {
                "success": False,
                "traffic_level": "UNKNOWN",
                "traffic_score": 0,
                "congestion": 0.0,
                "current_speed": None,
                "free_flow_speed": None,
                "current_travel_time": None,
                "free_flow_travel_time": None,
                "confidence": None,
                "incidents": [],
            }

        traffic_results = []

        for point in sampled_points:
            try:
                traffic = self.traffic_service.get_traffic(
                    lat=point["lat"],
                    lon=point["lon"],
                )

                if isinstance(
                    traffic,
                    dict,
                ):
                    traffic_results.append(
                        traffic
                    )

            except Exception as exc:
                print(
                    f"Traffic service unavailable: {exc}"
                )

        if not traffic_results:
            return {
                "success": False,
                "traffic_level": "UNKNOWN",
                "traffic_score": 0,
                "congestion": 0.0,
                "current_speed": None,
                "free_flow_speed": None,
                "current_travel_time": None,
                "free_flow_travel_time": None,
                "confidence": None,
                "incidents": [],
            }

        valid_results = [
            result
            for result in traffic_results
            if result.get("success")
        ]

        if not valid_results:
            return {
                "success": False,
                "traffic_level": "UNKNOWN",
                "traffic_score": 0,
                "congestion": 0.0,
                "current_speed": None,
                "free_flow_speed": None,
                "current_travel_time": None,
                "free_flow_travel_time": None,
                "confidence": None,
                "incidents": [],
            }

        traffic_scores = [
            result.get("traffic_score", 0)
            for result in valid_results
        ]

        congestion_values = [
            result.get("congestion", 0.0)
            for result in valid_results
        ]

        current_speeds = [
            result.get("current_speed")
            for result in valid_results
            if result.get("current_speed") is not None
        ]

        free_flow_speeds = [
            result.get("free_flow_speed")
            for result in valid_results
            if result.get("free_flow_speed") is not None
        ]

        current_travel_times = [
            result.get("current_travel_time")
            for result in valid_results
            if result.get("current_travel_time") is not None
        ]

        free_flow_travel_times = [
            result.get("free_flow_travel_time")
            for result in valid_results
            if result.get("free_flow_travel_time") is not None
        ]

        confidence_values = [
            result.get("confidence")
            for result in valid_results
            if result.get("confidence") is not None
        ]

        incidents = []
        seen_incidents = set()

        for result in valid_results:
            for incident in result.get(
                "incidents",
                [],
            ):
                incident_key = (
                    incident.get("id")
                    or (
                        incident.get("geometry", {})
                        .get("coordinates", [])
                    )
                    or incident.get("description")
                )

                if incident_key in seen_incidents:
                    continue

                seen_incidents.add(
                    incident_key
                )
                incidents.append(
                    incident
                )

        average_traffic_score = round(
            sum(traffic_scores)
            / len(traffic_scores)
        )

        average_congestion = round(
            sum(congestion_values)
            / len(congestion_values),
            3,
        )

        average_current_speed = (
            round(
                sum(current_speeds)
                / len(current_speeds),
                2,
            )
            if current_speeds
            else None
        )

        average_free_flow_speed = (
            round(
                sum(free_flow_speeds)
                / len(free_flow_speeds),
                2,
            )
            if free_flow_speeds
            else None
        )

        average_current_travel_time = (
            round(
                sum(current_travel_times)
                / len(current_travel_times)
            )
            if current_travel_times
            else None
        )

        average_free_flow_travel_time = (
            round(
                sum(free_flow_travel_times)
                / len(free_flow_travel_times)
            )
            if free_flow_travel_times
            else None
        )

        average_confidence = (
            round(
                sum(confidence_values)
                / len(confidence_values),
                3,
            )
            if confidence_values
            else None
        )

        traffic_level = self._get_traffic_level(
            average_traffic_score
        )

        return {
            "success": True,
            "traffic_level": traffic_level,
            "traffic_score": average_traffic_score,
            "congestion": average_congestion,
            "current_speed": average_current_speed,
            "free_flow_speed": average_free_flow_speed,
            "current_travel_time": (
                average_current_travel_time
            ),
            "free_flow_travel_time": (
                average_free_flow_travel_time
            ),
            "confidence": average_confidence,
            "incidents": incidents,
            "sampled_points_count": len(
                valid_results
            ),
        }

    @staticmethod
    def _get_traffic_level(
        score: int,
    ) -> str:
        if score < 20:
            return "LOW"

        if score < 40:
            return "MODERATE"

        if score < 60:
            return "HIGH"

        if score < 80:
            return "VERY_HIGH"

        return "EXTREME"

    @staticmethod
    def _geometry_to_points(
        geometry,
    ):
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

        if max_points == 1:
            return [points[0]]

        step = (
            (len(points) - 1)
            / (max_points - 1)
        )

        return [
            points[int(i * step)]
            for i in range(max_points)
        ]
