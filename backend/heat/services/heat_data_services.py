from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from ai.fortyguard_service import FortyGuardService
from .open_meteo_service import OpenMeteoService


class HeatDataService:
    MAX_WORKERS = 8

    def __init__(self):
        self.fortyguard = FortyGuardService(
            load_from_parent_env=False
        )
        self._open_meteo = OpenMeteoService()

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
                try:
                    if start_date and start_time:
                        rounded_eta = datetime.strptime(
                            f"{start_date} {start_time}", "%Y-%m-%d %H:%M"
                        ).replace(tzinfo=timezone.utc)
                    else:
                        rounded_eta = datetime.now(timezone.utc).replace(
                            minute=0, second=0, microsecond=0
                        )
                    om_result = self._open_meteo.get_point_result(
                        point["lat"], point["lon"], rounded_eta
                    )
                    if om_result is not None:
                        om_result["name"] = point.get("name")
                        return index, om_result
                except Exception:
                    pass
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
        heat_cache: dict | None = None,
    ) -> list[dict]:
        if not temporal_points:
            return []

        results = [None] * len(temporal_points)

        def fetch_point(index, point):
            eta = point["eta"]
            rounded_eta = (
                eta + timedelta(minutes=30)
            ).replace(
                minute=0,
                second=0,
                microsecond=0,
            )
            cache_key = (
                f"{round(point['lat'], 4)}:{round(point['lon'], 4)}:"
                f"{rounded_eta.strftime('%Y-%m-%d %H:%M')}"
            )

            if heat_cache is not None and cache_key in heat_cache:
                return index, {
                    **heat_cache[cache_key],
                    "eta": eta.isoformat(),
                    "distance_from_origin_m": point.get("distance_from_origin_m"),
                    "cumulative_duration_seconds": point.get("cumulative_duration_seconds"),
                }

            try:
                heat_data = self.fortyguard.get_heat_data(
                    lat=point["lat"],
                    lon=point["lon"],
                    start_date=rounded_eta.strftime("%Y-%m-%d"),
                    start_time=rounded_eta.strftime("%H:%M"),
                    use_cache=False,
                )
                payload = self._success_result(point, heat_data)
                if heat_cache is not None:
                    heat_cache[cache_key] = payload
                return index, {
                    **payload,
                    "eta": eta.isoformat(),
                    "distance_from_origin_m": point.get("distance_from_origin_m"),
                    "cumulative_duration_seconds": point.get("cumulative_duration_seconds"),
                }
            except Exception as exc:
                try:
                    om_result = self._open_meteo.get_point_result(
                        point["lat"], point["lon"], rounded_eta
                    )
                    if om_result is not None:
                        payload = {
                            **om_result,
                            "name": point.get("name"),
                            "distance_from_origin_m": point.get("distance_from_origin_m"),
                            "cumulative_duration_seconds": point.get("cumulative_duration_seconds"),
                        }
                        if heat_cache is not None:
                            heat_cache[cache_key] = {
                                k: v for k, v in payload.items()
                                if k not in ("distance_from_origin_m", "cumulative_duration_seconds")
                            }
                        return index, {**payload, "eta": eta.isoformat()}
                except Exception:
                    pass
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
            "name": point.get("name"),
            "temperature": heat_data.temperature,
            "humidity": heat_data.humidity,
            "heat_index": heat_data.heat_index,
            "uv_index": heat_data.uv_index,
            "aqi": heat_data.aqi,
            "risk_level": heat_data.risk_level,
            "timestamp": heat_data.timestamp,
            "source": heat_data.source,
            "reason": heat_data.reason,
            "precipitation_mm": heat_data.precipitation_mm,
            "wind_speed_ms": heat_data.wind_speed_ms,
        }

    @staticmethod
    def _error_result(point, exc):
        return {
            "lat": point["lat"],
            "lon": point["lon"],
            "name": point.get("name"),
            "error": str(exc),
            "source": "error",
        }
