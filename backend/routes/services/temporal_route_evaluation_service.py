from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
import math
import os

from .route_sampling_service import RouteSamplingService
from .poi_services import POIService
from .tomtom_routing_services import TomTomRoutingService
from heat.services.heat_analysis_services import HeatAnalysisService


class TemporalRouteEvaluationService:
    DEFAULT_STEP_MINUTES = 30
    DEFAULT_SPACING_METERS = 2000
    MAX_DEPARTURE_HOURS = 12
    MAX_DEPARTURES = 97
    MAX_HEAT_WORKERS = 12
    DEFAULT_WEATHER_WEIGHT = 0.7
    DEFAULT_TIME_WEIGHT = 0.3
    DEFAULT_MAX_HEAT_POINTS_PER_ROUTE = 5

    def __init__(self):
        self.sampling_service = RouteSamplingService()
        self.heat_analysis_service = HeatAnalysisService()
        self.poi_service = POIService()
        self.tomtom_service = TomTomRoutingService()
        try:
            self.max_heat_points_per_route = int(
                os.getenv(
                    "MAX_HEAT_POINTS_PER_ROUTE",
                    self.DEFAULT_MAX_HEAT_POINTS_PER_ROUTE,
                )
            )
        except (TypeError, ValueError):
            self.max_heat_points_per_route = (
                self.DEFAULT_MAX_HEAT_POINTS_PER_ROUTE
            )

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
        traffic_aware: bool = False,
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
                "errors": ["Departure window cannot exceed 12 hours"],
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
        heat_cache: dict = {}

        for departure_time in departure_times:
            evaluated_routes = self._evaluate_departure(
                route_context,
                departure_time,
                weather_weight,
                time_weight,
                traffic_aware,
                heat_cache,
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
            samples = self._annotate_sample_names(samples, route.get("legs", []))

            # POIs for EVERY route segment (same points used for heat)
            try:
                segments = self.poi_service.get_segment_pois(
                    self._subsample_for_heat(samples)
                )
                if not isinstance(segments, list):
                    segments = []
            except Exception as exc:
                print(f"POI service unavailable: {exc}")
                segments = []

            aggregate_pois = [
                poi
                for segment in segments
                for poi in segment.get("pois", [])
            ]

            contexts.append(
                {
                    "route": route,
                    "samples": samples,
                    "segments": segments,
                    "pois": aggregate_pois,
                }
            )

        return contexts

    def _evaluate_departure(
        self,
        route_context,
        departure_time,
        weather_weight,
        time_weight,
        traffic_aware,
        heat_cache,
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
                jobs.append(
                    (
                        context,
                        executor.submit(
                            self._evaluate_route_samples,
                            context,
                            departure_time,
                            traffic_aware,
                            heat_cache,
                        ),
                    )
                )

            for context, future in jobs:
                route = context["route"]
                try:
                    heat_result, duration_override = future.result()
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
                        duration_override,
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

    def _evaluate_route_samples(
        self,
        context,
        departure_time,
        traffic_aware,
        heat_cache,
    ):
        """Get traffic-aware travel time (TomTom, when opted in),
        rescale sample durations, attach ETAs, then run heat
        analysis at those ETAs."""
        samples = context["samples"]
        samples, tomtom_total = self._rescale_durations(
            samples,
            departure_time,
            traffic_aware,
        )

        samples = self._subsample_for_heat(samples)

        temporal_points = self._attach_etas(
            samples,
            departure_time,
        )

        heat_result = (
            self.heat_analysis_service.analyze_at_etas(
                temporal_points,
                heat_cache=heat_cache,
            )
        )

        return heat_result, tomtom_total

    @staticmethod
    def _annotate_sample_names(samples, legs):
        """Assign each sample the name of the nearest OSRM step (ref preferred)."""
        step_names = []
        for leg in legs:
            for step in leg.get("steps", []):
                loc = (step.get("maneuver") or {}).get("location")
                if not loc or len(loc) < 2:
                    continue
                ref = (step.get("ref") or "").strip()
                name = (step.get("name") or "").strip()
                display = ref if ref else (name if name.lower() not in ("", "unnamed road") else None)
                if display:
                    step_names.append((float(loc[1]), float(loc[0]), display))

        if not step_names:
            return samples

        result = []
        for sample in samples:
            s_lat, s_lon = sample["lat"], sample["lon"]
            best_name = None
            best_dist = float("inf")
            for st_lat, st_lon, sname in step_names:
                d = (s_lat - st_lat) ** 2 + (s_lon - st_lon) ** 2
                if d < best_dist:
                    best_dist = d
                    best_name = sname
            result.append({**sample, "name": best_name})
        return result

    def _subsample_for_heat(self, samples):
        """Cap FortyGuard queries per (route, departure) by picking
        points evenly distributed along travel time (not array index),
        so city-street waypoints near the origin don't crowd all slots."""
        cap = self.max_heat_points_per_route

        if cap <= 0 or len(samples) <= cap:
            return samples

        if cap == 1:
            return [samples[0]]

        total_duration = float(
            samples[-1].get("cumulative_duration_seconds", 0) or 0
        )

        # Fall back to index-based when duration data is absent.
        if total_duration <= 0:
            indices = [
                round(i * (len(samples) - 1) / (cap - 1))
                for i in range(cap)
            ]
            return [samples[index] for index in dict.fromkeys(indices)]

        # Build target times evenly spaced from 0 → total_duration.
        targets = [
            i * total_duration / (cap - 1) for i in range(cap)
        ]

        chosen = []
        chosen_indices: set[int] = set()
        for target_t in targets:
            best_idx = 0
            best_gap = float("inf")
            for idx, s in enumerate(samples):
                gap = abs(
                    float(s.get("cumulative_duration_seconds", 0) or 0)
                    - target_t
                )
                if gap < best_gap:
                    best_gap = gap
                    best_idx = idx
            if best_idx not in chosen_indices:
                chosen.append(samples[best_idx])
                chosen_indices.add(best_idx)

        return chosen

    @staticmethod
    def _traffic_factor(departure_time: datetime) -> float:
        """Time-of-day congestion multiplier (fallback when TomTom is unavailable)."""
        hour = departure_time.hour
        weekday = departure_time.weekday()  # 0=Monday, 6=Sunday
        if weekday >= 5:
            return 1.06  # light weekend traffic
        if 7 <= hour <= 8:
            return 1.30  # morning rush
        if 16 <= hour <= 18:
            return 1.35  # evening rush
        if hour == 9 or hour == 15 or hour == 19:
            return 1.15  # shoulder
        if 10 <= hour <= 14:
            return 1.08  # mid-day
        return 1.02  # overnight / early morning

    def _rescale_durations(
        self,
        samples,
        departure_time,
        traffic_aware,
    ):
        if not traffic_aware:
            return samples, None

        if not samples:
            return samples, None

        osrm_total = float(
            samples[-1].get("cumulative_duration_seconds", 0)
        )
        if osrm_total <= 0:
            return samples, None

        # ── TomTom live traffic ──────────────────────────────
        if self.tomtom_service.available:
            geometry = [
                {"lat": sample["lat"], "lon": sample["lon"]}
                for sample in samples
            ]
            result = self.tomtom_service.get_travel_time(geometry, departure_time)
            if result.get("success"):
                tomtom_total = float(result["travel_time_seconds"])
                ratio = tomtom_total / osrm_total
                if math.isfinite(ratio) and ratio > 0:
                    print(
                        f"TomTom travel time applied: ratio={ratio:.3f} "
                        f"(departure {departure_time.isoformat()})"
                    )
                    return [
                        {
                            **s,
                            "cumulative_duration_seconds": round(
                                float(s.get("cumulative_duration_seconds", 0)) * ratio, 2
                            ),
                        }
                        for s in samples
                    ], tomtom_total

        # TomTom unavailable or failed — keep base OSRM duration unchanged
        return samples, None

    @staticmethod
    def _build_evaluated_route(
        route,
        context,
        heat_result,
        duration_override=None,
    ):
        duration_min = route["duration_min"]

        if duration_override is not None:
            duration_min = round(
                float(duration_override) / 60,
                2,
            )

        if not heat_result.get("success"):
            return {
                "id": route["id"],
                "distance_km": route["distance_km"],
                "duration_min": duration_min,
                "geometry": route.get("geometry"),
                "weather_score": None,
                "time_score": None,
                "route_score": None,
                "risk": None,
                "heat_data": heat_result.get("heat_data", []),
                "error": heat_result.get("errors", ["Heat analysis failed"]),
                "pois": context["pois"],
                "segments": context["segments"],
                "samples": [],
            }

        analysis = heat_result["analysis"]

        return {
            "id": route["id"],
            "distance_km": route["distance_km"],
            "duration_min": duration_min,
            "geometry": route.get("geometry"),
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
            "segments": context["segments"],
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
            "geometry": route.get("geometry"),
            "weather_score": None,
            "time_score": None,
            "route_score": None,
            "risk": None,
            "heat_data": [],
            "error": [error],
            "pois": context["pois"],
            "segments": context["segments"],
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
        """Score each route's time penalty as % overhead vs the fastest route,
        capped at 100.  A route 5 min slower on a 4-hour trip = ~2 pts, not 100.
        This keeps time and weather scores on a calibrated scale so a tiny time
        gap doesn't override a meaningful heat difference."""
        valid = [
            route
            for route in routes
            if route.get("duration_min") is not None
        ]

        if not valid:
            return

        minimum = min(route["duration_min"] for route in valid)

        for route in routes:
            duration = route.get("duration_min")
            if duration is None:
                route["time_score"] = None
            elif minimum <= 0:
                route["time_score"] = 0.0
            else:
                overhead_pct = ((duration - minimum) / minimum) * 100
                route["time_score"] = round(min(overhead_pct, 100.0), 2)

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
                        "geometry": route.get("geometry"),
                        "evaluations": [],
                        "pois": route.get("pois", []),
                        "segments": route.get("segments", []),
                    }

                route_map[route_id]["evaluations"].append(
                    {
                        "departure_time": departure_time,
                        "duration_min": route.get("duration_min"),
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
