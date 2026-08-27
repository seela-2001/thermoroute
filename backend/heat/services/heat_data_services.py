from concurrent.futures import ThreadPoolExecutor, as_completed
from ai.fortyguard_service import FortyGuardService


class HeatDataService:
    MAX_WORKERS = 8

    def __init__(self):
        self.fortyguard = FortyGuardService(
            load_from_parent_env=False
        )

    def get_route_heat(
        self,
        route_geometry: list[dict[str, float]],
        start_date: str | None = None,
        start_time: str | None = None,
        use_cache: bool = False,
    ) -> list[dict]:
        if not route_geometry:
            return []

        results = [None] * len(route_geometry)

        def fetch_point(index, point):
            try:
                heat_data = self.fortyguard.get_heat_data(
                    lat=point["lat"],
                    lon=point["lon"],
                    start_date=start_date,
                    start_time=start_time,
                    use_cache=use_cache,
                )
                return index, self._success_result(point, heat_data)
            except Exception as exc:
                return index, self._error_result(point, exc)

        workers = min(self.MAX_WORKERS, len(route_geometry))

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [
                executor.submit(fetch_point, index, point)
                for index, point in enumerate(route_geometry)
            ]
            for future in as_completed(futures):
                index, result = future.result()
                results[index] = result

        return results

    def get_route_heat_at_etas(
        self,
        temporal_points: list[dict],
    ) -> list[dict]:
        if not temporal_points:
            return []

        results = [None] * len(temporal_points)

        def fetch_point(index, point):
            eta = point["eta"]
            try:
                heat_data = self.fortyguard.get_heat_data(
                    lat=point["lat"],
                    lon=point["lon"],
                    start_date=eta.strftime("%Y-%m-%d"),
                    start_time=eta.strftime("%H:%M"),
                    use_cache=False,
                )
                return index, {
                    **self._success_result(point, heat_data),
                    "eta": eta.isoformat(),
                    "distance_from_origin_m": point.get("distance_from_origin_m"),
                    "cumulative_duration_seconds": point.get("cumulative_duration_seconds"),
                }
            except Exception as exc:
                return index, {
                    **self._error_result(point, exc),
                    "eta": eta.isoformat(),
                    "distance_from_origin_m": point.get("distance_from_origin_m"),
                    "cumulative_duration_seconds": point.get("cumulative_duration_seconds"),
                }

        workers = min(self.MAX_WORKERS, len(temporal_points))

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [
                executor.submit(fetch_point, index, point)
                for index, point in enumerate(temporal_points)
            ]
            for future in as_completed(futures):
                index, result = future.result()
                results[index] = result

        return results

    @staticmethod
    def _success_result(point, heat_data):
        return {
            "lat": point["lat"],
            "lon": point["lon"],
            "temperature": heat_data.temperature,
            "humidity": heat_data.humidity,
            "heat_index": heat_data.heat_index,
            "uv_index": heat_data.uv_index,
            "aqi": heat_data.aqi,
            "risk_level": heat_data.risk_level,
            "timestamp": heat_data.timestamp,
            "source": heat_data.source,
            "reason": heat_data.reason,
        }

    @staticmethod
    def _error_result(point, exc):
        return {
            "lat": point["lat"],
            "lon": point["lon"],
            "error": str(exc),
            "source": "error",
        }
