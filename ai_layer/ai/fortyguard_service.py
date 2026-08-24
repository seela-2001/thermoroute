import os
import pathlib
import time
import requests
from typing import Optional, Any, List
from dataclasses import dataclass
from dotenv import load_dotenv

from .exceptions import APIError


@dataclass
class HeatData:
    temperature: float
    humidity: float
    heat_index: float
    uv_index: float
    aqi: float
    risk_level: str
    location: str
    timestamp: str


class FortyGuardService:

    DEFAULT_BASE_URL = "https://api.fortyguard.com/v1"
    DEFAULT_TIMEOUT = 10

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[int] = None,
        load_from_parent_env: bool = True
    ):
        if load_from_parent_env:
            parent_env = pathlib.Path.cwd().parent / '.env'
            if parent_env.exists():
                load_dotenv(parent_env)
            else:
                load_dotenv()

        self.api_key = api_key or os.getenv("FORTYGUARD_API_KEY", "")
        self.base_url = base_url or os.getenv("FORTYGUARD_BASE_URL", self.DEFAULT_BASE_URL)
        self.timeout = timeout or get_env_int("FORTYGUARD_TIMEOUT", self.DEFAULT_TIMEOUT)

        if not self.api_key:
            pass

    def __str__(self):
        key_display = f"{self.api_key[:6]}…" if self.api_key else "(missing)"
        return f"FortyGuardService(base_url={self.base_url}, api_key={key_display})"

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def get_heat_data(
        self,
        lat: float,
        lon: float,
        radius_km: float = 1.0,
        start_date: Optional[str] = None,
        start_time: Optional[str] = None
    ) -> HeatData:
        if not self.is_configured():
            raise APIError("FortyGuard API key is not configured", "fortyguard")

        from datetime import datetime

        if not start_date:
            start_date = datetime.now().strftime("%Y-%m-%d")

        if not start_time:
            start_time = datetime.now().strftime("%H:%M")

        lat_offset = (radius_km / 111.0)
        lon_offset = (radius_km / (111.0 * abs(lat) ** 0.5)) if lat != 0 else (radius_km / 111.0)

        polygon_coords = [
            [lon - lon_offset, lat - lat_offset],
            [lon + lon_offset, lat - lat_offset],
            [lon + lon_offset, lat + lat_offset],
            [lon - lon_offset, lat + lat_offset],
            [lon - lon_offset, lat - lat_offset]
        ]

        url = f"{self.base_url}/heatmap"
        payload = {
            "polygon_aoi": {
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "properties": {},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [polygon_coords]
                    }
                }]
            },
            "date_time": {
                "start_date": start_date,
                "start_time": start_time,
                "filter_type": 1
            },
            "granularity": 100,
            "analysis_type": "tcm"
        }

        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=self.timeout)
            response.raise_for_status()

            submit_data = response.json()

            result = submit_data.get("result") or submit_data.get("data", {}).get("result")
            if result:
                return self._parse_heatmap_result(result, lat, lon, start_date, start_time)

            activity_id = submit_data.get("activity_id") or submit_data.get("data", {}).get("activity_id")

            if not activity_id:
                raise APIError(f"No activity_id in response: {submit_data}", "fortyguard")

            status_url = f"{self.base_url}/status/{activity_id}"
            max_polls = 30
            poll_interval = 2

            for attempt in range(max_polls):
                time.sleep(poll_interval)
                status_response = requests.get(status_url, headers=headers, timeout=self.timeout)
                status_response.raise_for_status()
                status_data = status_response.json()

                status = status_data.get("data", {}).get("status", "").lower()
                if status == "completed":
                    result = status_data.get("data", {}).get("result", {})
                    return self._parse_heatmap_result(result, lat, lon, start_date, start_time)
                elif status in ["failed", "error"]:
                    raise APIError(f"FortyGuard job failed: {status_data}", "fortyguard")

            raise APIError(f"FortyGuard job timed out after {max_polls * poll_interval}s", "fortyguard")

        except requests.Timeout:
            raise APIError(f"FortyGuard API request timed out after {self.timeout}s", "fortyguard")
        except requests.HTTPError as e:
            status = e.response.status_code
            raise APIError(f"FortyGuard API error: {e.response.text}", "fortyguard", status)
        except Exception as e:
            raise APIError(f"FortyGuard API error: {str(e)}", "fortyguard")

    def _parse_heatmap_result(self, result: dict, lat: float, lon: float, start_date: str, start_time: str) -> HeatData:
        temp = self._extract_temperature(result)

        humidity = 65.0

        heat_index = self._calculate_heat_index(temp, humidity)

        return HeatData(
            temperature=temp,
            humidity=humidity,
            heat_index=heat_index,
            uv_index=0.0,
            aqi=0.0,
            risk_level=self._calculate_risk_level(heat_index),
            location=f"{lat},{lon}",
            timestamp=f"{start_date}T{start_time}",
        )

    def _extract_temperature(self, result: dict) -> float:
        if not isinstance(result, dict):
            return 30.0

        map_data = result.get("map_data") or {}
        features = map_data.get("features") or []
        if features:
            temps = []
            for feature in features:
                props = feature.get("properties", {})
                for key in ["average_temperature", "temperature", "tcm", "Temperature", "min_temperature", "max_temperature"]:
                    if key in props and props[key] is not None:
                        try:
                            temps.append(float(props[key]))
                            break
                        except (ValueError, TypeError):
                            pass
            if temps:
                return sum(temps) / len(temps)

        stats_data = result.get("stats_data") or {}
        temp_stats = stats_data.get("Temperature_stats") or stats_data.get("temperature_stats") or {}

        if temp_stats:
            for key in ["mean", "avg", "average", "temperature_mean", "average_temperature"]:
                if key in temp_stats:
                    try:
                        return float(temp_stats[key])
                    except (ValueError, TypeError):
                        pass

        dist = stats_data.get("Overall_temperature_distribution") or stats_data.get("overall_temperature_distribution")
        if dist and isinstance(dist, list) and dist:
            try:
                valid_temps = [float(t) for t in dist if t is not None]
                if valid_temps:
                    return sum(valid_temps) / len(valid_temps)
            except (ValueError, TypeError):
                pass

        return 30.0

    def _extract_humidity(self, result: dict) -> float:
        return 65.0

    def _calculate_heat_index(self, temp_c: float, humidity: float) -> float:
        temp_f = temp_c * 9/5 + 32
        if temp_f < 80:
            return temp_c
        hi = 0.5 * (temp_f + 61.0 + ((temp_f - 68.0) * 1.2) + (humidity * 0.094))
        return (hi - 32) * 5/9

    def _calculate_risk_level(self, heat_index: float) -> str:
        if heat_index >= 45:
            return "EXTREME"
        elif heat_index >= 40:
            return "VERY_HIGH"
        elif heat_index >= 35:
            return "HIGH"
        elif heat_index >= 30:
            return "MODERATE"
        else:
            return "LOW"

    def get_route_heat(
        self,
        route_geometry: List[dict[str, float]],
        start_date: Optional[str] = None,
        start_time: Optional[str] = None
    ) -> List[dict[str, Any]]:
        results = []

        for point in route_geometry:
            try:
                heat_data = self.get_heat_data(
                    point["lat"],
                    point["lon"],
                    start_date=start_date,
                    start_time=start_time
                )
                results.append({
                    "lat": point["lat"],
                    "lon": point["lon"],
                    "temperature": heat_data.temperature,
                    "humidity": heat_data.humidity,
                    "heat_index": heat_data.heat_index,
                    "uv_index": heat_data.uv_index,
                    "aqi": heat_data.aqi,
                    "risk_level": heat_data.risk_level,
                    "timestamp": heat_data.timestamp,
                })
            except APIError as e:
                results.append({
                    "lat": point["lat"],
                    "lon": point["lon"],
                    "error": str(e),
                    "error_code": e.code,
                })

        return results

    def mock_heat_data(
        self,
        lat: float,
        lon: float,
        base_temp: float = 30.0
    ) -> HeatData:
        import random
        from datetime import datetime

        temp_variation = random.uniform(-3, 5)
        temp = base_temp + temp_variation

        heat_index = temp + (temp * 0.1) if temp > 27 else temp

        if heat_index >= 45:
            risk_level = "EXTREME"
        elif heat_index >= 40:
            risk_level = "VERY_HIGH"
        elif heat_index >= 35:
            risk_level = "HIGH"
        elif heat_index >= 30:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        return HeatData(
            temperature=round(temp, 1),
            humidity=round(random.uniform(30, 80), 1),
            heat_index=round(heat_index, 1),
            uv_index=round(random.uniform(0, 10), 1),
            aqi=round(random.uniform(20, 100), 1),
            risk_level=risk_level,
            location=f"{lat},{lon}",
            timestamp=datetime.now().isoformat(),
        )

    def get_heat_or_mock(
        self,
        lat: float,
        lon: float,
        radius_km: float = 1.0,
        base_temp: float = 30.0,
        start_date: Optional[str] = None,
        start_time: Optional[str] = None
    ) -> HeatData:
        if not self.is_configured():
            return self.mock_heat_data(lat, lon, base_temp)

        try:
            return self.get_heat_data(lat, lon, radius_km, start_date, start_time)
        except APIError:
            return self.mock_heat_data(lat, lon, base_temp)


def get_env_int(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, default))
    except (ValueError, TypeError):
        return default
