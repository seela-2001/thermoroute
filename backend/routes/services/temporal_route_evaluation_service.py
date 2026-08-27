from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta

from .route_sampling_service import RouteSamplingService
from .poi_services import POIService
from .camera_services import CameraService
from heat.services.heat_analysis_services import HeatAnalysisService


class TemporalRouteEvaluationService:
    DEFAULT_STEP_MINUTES = 30
    DEFAULT_SPACING_METERS = 2000
    MAX_DEPARTURE_HOURS = 48
    MAX_DEPARTURES = 97
    MAX_TEMPORAL_POINTS_PER_ROUTE = 2
    MAX_HEAT_WORKERS = 12
    DEFAULT_WEATHER_WEIGHT = 0.7
    DEFAULT_TIME_WEIGHT = 0.3

    def __init__(self):
        self.sampling_service = RouteSamplingService()
        self.heat_analysis_service = HeatAnalysisService()
        self.poi_service = POIService()
        self.camera_service = CameraService()

    def evaluate(
        self,
        routes: list[dict],
        origin: dict[str, float],
        destination: dict[str, float],
        jurisdiction: str,
        departure_start: datetime,
        departure_end: datetime,
        step_minutes: int = DEFAULT_STEP_MINUTES,
        weather_weight: float = DEFAULT_WEATHER_WEIGHT,
        time_weight: float = DEFAULT_TIME_WEIGHT,
    ) -> dict:
        if not routes:
            return {"success": False, "errors": ["No routes found"]}

        if departure_end < departure_start:
            return {
                "success": False,
                "errors": ["departure_end must be after departure_start"],
            }

        if departure_end - departure_start > timedelta(hours=self.MAX_DEPARTURE_HOURS):
            return {
                "success": False,
                "errors": ["Departure window cannot exceed 48 hours"],
            }

        step_minutes = max(int(step_minutes), 1)
        departure_times = self._build_departure_times(
            departure_start,
            departure_end,
            step_minutes,
        )

        if len(departure_times) > self.MAX_DEPARTURES:
            return {
                "success": False,
                "errors": [
                    f"Too many departure evaluations. Maximum is {self.MAX_DEPARTURES}."
                ],
            }

        weight_total = weather_weight + time_weight
        if weight_total <= 0:
            return {
                "success": False,
                "errors": [
                    "weather_weight + time_weight must be greater than 0"
                ],
            }

        weather_weight /= weight_total
        time_weight /= weight_total

        route_context = self._build_route_context(
            routes,
            origin,
            destination,
            jurisdiction,
        )

        departure_results = []

        for departure_time in departure_times:
            evaluated_routes = self._evaluate_departure(
                route_context,
                departure_time,
                weather_weight,
                time_weight,
            )

            evaluated_routes.sort(
                key=lambda route: (
                    route["route_score"]
                    if route.get("route_score") is not None
                    else float("inf")
                )
            )

            departure_results.append(
                {
                    "departure_time": departure_time.isoformat(),
                    "recommended_route_id": (
                        evaluated_routes[0]["id"]
                        if evaluated_routes
                        and evaluated_routes[0].get("route_score") is not None
                        else None
                    ),
                    "routes": evaluated_routes,
                }
            )

        best_departure = self._best_departure(departure_results)

        return {
            "success": True,
            "weights": {
                "weather": round(weather_weight, 3),
                "time": round(time_weight, 3),
            },
            "departure_count": len(departure_results),
            "departure_recommendations": [
                {
                    "departure_time": result["departure_time"],
                    "recommended_route_id": result["recommended_route_id"],
                    "route_score": self._recommended_score(result),
                }
                for result in departure_results
            ],
            "best_departure": best_departure,
            "routes": self._build_route_summary(departure_results),
        }

    def _build_route_context(
        self,
        routes,
        origin,
        destination,
        jurisdiction,
    ):
        contexts = []

        for route in routes:
            samples = self.sampling_service.sample_route(
                route,
                spacing_meters=self.DEFAULT_SPACING_METERS,
            )

            if len(samples) > self.MAX_TEMPORAL_POINTS_PER_ROUTE:
                samples = self._select_temporal_points(samples)

            try:
                pois = self.poi_service.get_pois(
                    origin=origin,
                    destination=destination,
                    route_points=[
                        {"lat": point["lat"], "lon": point["lon"]}
                        for point in samples
                    ],
                )
                if not isinstance(pois, list):
                    pois = []
            except Exception as exc:
                print(f"POI service unavailable: {exc}")
                pois = []

            try:
                cameras = self.camera_service.get_cameras_for_route(
                    route=route,
                    jurisdiction=jurisdiction,
                )
                if not isinstance(cameras, list):
                    cameras = []
            except Exception as exc:
                print(f"Camera service unavailable: {exc}")
                cameras = []

            contexts.append(
                {
                    "route": route,
                    "samples": samples,
                    "pois": pois,
                    "cameras": cameras,
                }
            )

        return contexts

    def _evaluate_departure(
        self,
        route_context,
        departure_time,
        weather_weight,
        time_weight,
    ):
        evaluated_routes = []
        jobs = []

        with ThreadPoolExecutor(
            max_workers=min(
                self.MAX_HEAT_WORKERS,
                max(len(route_context), 1),
            )
        ) as executor:
            for context in route_context:
                temporal_points = self._attach_etas(
                    context["samples"],
                    departure_time,
                )
                jobs.append(
                    (
                        context,
                        executor.submit(
                            self.heat_analysis_service.analyze_at_etas,
                            temporal_points,
                        ),
                    )
                )

            for context, future in jobs:
                route = context["route"]
                try:
                    heat_result = future.result()
                except Exception as exc:
                    evaluated_routes.append(
                        self._failed_route(
                            route,
                            context,
                            str(exc),
                        )
                    )
                    continue

                evaluated_routes.append(
                    self._build_evaluated_route(
                        route,
                        context,
                        heat_result,
                    )
                )

        self._apply_time_scores(evaluated_routes)

        for route in evaluated_routes:
            weather_score = route.get("weather_score")
            time_score = route.get("time_score")

            if weather_score is None or time_score is None:
                route["route_score"] = None
                continue

            route["route_score"] = round(
                weather_score * weather_weight
                + time_score * time_weight,
                2,
            )

        return evaluated_routes

    @staticmethod
    def _select_temporal_points(samples):
        if len(samples) <= 2:
            return samples

        return [samples[0], samples[-1]]

    @staticmethod
    def _build_evaluated_route(route, context, heat_result):
        if not heat_result.get("success"):
            return {
                "id": route["id"],
                "distance_km": route["distance_km"],
                "duration_min": route["duration_min"],
                "weather_score": None,
                "time_score": None,
                "route_score": None,
                "risk": None,
                "heat_data": heat_result.get("heat_data", []),
                "error": heat_result.get("errors", ["Heat analysis failed"]),
                "pois": context["pois"],
                "cameras": context["cameras"],
                "samples": [],
            }

        analysis = heat_result["analysis"]

        return {
            "id": route["id"],
            "distance_km": route["distance_km"],
            "duration_min": route["duration_min"],
            "weather_score": float(analysis.overall_risk_score),
            "time_score": None,
            "route_score": None,
            "risk": {
                "score": analysis.overall_risk_score,
                "level": analysis.risk_level,
                "critical_segments": analysis.critical_segments,
                "metrics": analysis.metrics,
            },
            "heat_data": heat_result["heat_data"],
            "pois": context["pois"],
            "cameras": context["cameras"],
            "samples": heat_result["heat_data"],
            "partial": heat_result.get("partial", False),
            "errors": heat_result.get("errors", []),
        }

    @staticmethod
    def _failed_route(route, context, error):
        return {
            "id": route["id"],
            "distance_km": route["distance_km"],
            "duration_min": route["duration_min"],
            "weather_score": None,
            "time_score": None,
            "route_score": None,
            "risk": None,
            "heat_data": [],
            "error": [error],
            "pois": context["pois"],
            "cameras": context["cameras"],
            "samples": [],
        }

    @staticmethod
    def _build_departure_times(start, end, step_minutes):
        step = timedelta(minutes=step_minutes)
        times = []
        current = start

        while current <= end:
            times.append(current)
            current += step

        return times

    @staticmethod
    def _attach_etas(samples, departure_time):
        result = []

        for sample in samples:
            eta = departure_time + timedelta(
                seconds=float(
                    sample.get("cumulative_duration_seconds", 0)
                )
            )
            result.append({**sample, "eta": eta})

        return result

    @staticmethod
    def _apply_time_scores(routes):
        valid = [
            route
            for route in routes
            if route.get("duration_min") is not None
        ]

        if not valid:
            return

        durations = [route["duration_min"] for route in valid]
        minimum = min(durations)
        maximum = max(durations)
        spread = maximum - minimum

        for route in routes:
            duration = route.get("duration_min")
            if duration is None:
                route["time_score"] = None
            elif spread == 0:
                route["time_score"] = 0.0
            else:
                route["time_score"] = round(
                    ((duration - minimum) / spread) * 100,
                    2,
                )

    @staticmethod
    def _recommended_score(departure_result):
        routes = departure_result.get("routes", [])
        if not routes:
            return None
        return routes[0].get("route_score")

    @staticmethod
    def _best_departure(departure_results):
        valid = [
            result
            for result in departure_results
            if result.get("recommended_route_id")
            and result.get("routes")
            and result["routes"][0].get("route_score") is not None
        ]

        if not valid:
            return None

        best = min(
            valid,
            key=lambda result: result["routes"][0]["route_score"],
        )
        route = best["routes"][0]

        return {
            "departure_time": best["departure_time"],
            "recommended_route_id": route["id"],
            "route_score": route["route_score"],
            "weather_score": route["weather_score"],
            "time_score": route["time_score"],
        }

    @staticmethod
    def _build_route_summary(departure_results):
        route_map = {}

        for departure in departure_results:
            departure_time = departure["departure_time"]

            for route in departure.get("routes", []):
                route_id = route["id"]

                if route_id not in route_map:
                    route_map[route_id] = {
                        "id": route_id,
                        "distance_km": route["distance_km"],
                        "duration_min": route["duration_min"],
                        "evaluations": [],
                        "pois": route.get("pois", []),
                        "cameras": route.get("cameras", []),
                    }

                route_map[route_id]["evaluations"].append(
                    {
                        "departure_time": departure_time,
                        "route_score": route.get("route_score"),
                        "weather_score": route.get("weather_score"),
                        "time_score": route.get("time_score"),
                        "risk": route.get("risk"),
                        "heat_data": route.get("heat_data", []),
                        "partial": route.get("partial", False),
                        "errors": route.get("errors", []),
                    }
                )

        return list(route_map.values())
