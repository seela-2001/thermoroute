from concurrent.futures import ThreadPoolExecutor, as_completed
from ai.fortyguard_service import FortyGuardService


class HeatDataService:

    def __init__(self):
        self.fortyguard = FortyGuardService(
            load_from_parent_env=False
        )

    def get_route_heat(
        self,
        route_geometry: list[dict[str, float]],
        start_date: str | None = None,
        start_time: str | None = None,
    ):
        results = [None] * len(route_geometry)

        def fetch_point(index, point):
            try:
                heat_data = self.fortyguard.get_heat_data(
                    lat=point["lat"],
                    lon=point["lon"],
                    start_date=start_date,
                    start_time=start_time,
                )

                return index, {
                    "lat": point["lat"],
                    "lon": point["lon"],
                    "temperature": heat_data.temperature,
                    "humidity": heat_data.humidity,
                    "heat_index": heat_data.heat_index,
                    "uv_index": heat_data.uv_index,
                    "aqi": heat_data.aqi,
                    "risk_level": heat_data.risk_level,
                    "timestamp": heat_data.timestamp,
                }

            except Exception as e:
                return index, {
                    "lat": point["lat"],
                    "lon": point["lon"],
                    "error": str(e),
                }

        max_workers = min(4, len(route_geometry))

        with ThreadPoolExecutor(
            max_workers=max_workers
        ) as executor:

            futures = [
                executor.submit(
                    fetch_point,
                    index,
                    point,
                )
                for index, point in enumerate(route_geometry)
            ]

            for future in as_completed(futures):
                index, result = future.result()
                results[index] = result

        return results
