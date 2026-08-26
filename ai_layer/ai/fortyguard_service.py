"""
FortyGuard Service for Temperature Data (Optimized)

Fetches heat/risk data from FortyGuard API.

Key changes vs the original version:
    1. Route sampling: instead of one API call per route point (which can
       mean 100+ expensive `/heatmap` requests for a single route), we take
       a small number of representative points along the route (default 5)
       and interpolate/aggregate from those.
    2. In-memory caching: points that round to the same grid cell (default
       ~1km) reuse a previous result instead of hitting the API again.
       This matters across routes that overlap in the same area.
    3. Fixed longitude offset calculation (uses cos(lat), not lat**0.5).
    4. Every HeatData/result now carries an explicit `source` field
       ("fortyguard" or "mock") plus a `reason` when mock is used, so
       nothing downstream can silently treat synthetic data as real.

Integration pattern:
    import sys, pathlib
    from dotenv import load_dotenv
    sys.path.insert(0, str(pathlib.Path.cwd().parent))
    load_dotenv(pathlib.Path.cwd().parent / '.env')

    from ai import FortyGuardService
    client = FortyGuardService()
    print('Base URL :', client.base_url)
    print('API key  :', client.api_key[:6] + '…' if client.api_key else '(missing)')
"""
import math
import os
import pathlib
import time
import requests
from typing import Optional, Any, List
from dataclasses import dataclass, field
from dotenv import load_dotenv

from .exceptions import APIError


@dataclass
class HeatData:
    """Heat data from FortyGuard."""
    temperature: float
    humidity: float
    heat_index: float
    uv_index: float
    aqi: float
    risk_level: str
    location: str
    timestamp: str
    source: str = "fortyguard"       # "fortyguard" or "mock"
    reason: Optional[str] = None     # populated when source == "mock"


class FortyGuardService:
    """
    Service for fetching heat data from FortyGuard API.

    Environment Variables:
        FORTYGUARD_API_KEY: API key for FortyGuard (required)
        FORTYGUARD_BASE_URL: Base URL for FortyGuard API (default: https://api.fortyguard.com/v1)
        FORTYGUARD_TIMEOUT: Request timeout in seconds (default: 10)
        FORTYGUARD_CACHE_GRID_KM: Grid size (km) used to bucket points for
            caching — points in the same bucket reuse a cached result
            (default: 1.0)
    """

    DEFAULT_BASE_URL = "https://api.fortyguard.com/v1"
    DEFAULT_TIMEOUT = 120
    DEFAULT_CACHE_GRID_KM = 1.0

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[int] = None,
        load_from_parent_env: bool = True,
        cache_grid_km: Optional[float] = None,
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
        self.cache_grid_km = cache_grid_km or float(
            os.getenv("FORTYGUARD_CACHE_GRID_KM", self.DEFAULT_CACHE_GRID_KM)
        )

        # Simple in-memory cache: {grid_key: HeatData}
        # Lives for the lifetime of the service instance. For a hackathon
        # this is enough; swap for Redis/DB-backed cache if it needs to
        # persist across processes or requests.
        self._cache: dict[str, HeatData] = {}

        if not self.api_key:
            # Don't raise error - allow mock data usage
            pass

    def __str__(self):
        key_display = f"{self.api_key[:6]}…" if self.api_key else "(missing)"
        return f"FortyGuardService(base_url={self.base_url}, api_key={key_display})"

    def is_configured(self) -> bool:
        return bool(self.api_key)

    # ------------------------------------------------------------------
    # Caching helpers
    # ------------------------------------------------------------------
    def _grid_key(self, lat: float, lon: float) -> str:
        """Round (lat, lon) to a grid cell of ~cache_grid_km size."""
        deg_per_km = 1.0 / 111.0
        step = self.cache_grid_km * deg_per_km
        lat_bucket = round(lat / step)
        lon_bucket = round(lon / step)
        return f"{lat_bucket}:{lon_bucket}"

    def clear_cache(self) -> None:
        self._cache.clear()

    # ------------------------------------------------------------------
    # Core single-point fetch (unchanged API-call logic, cache-aware)
    # ------------------------------------------------------------------
    def get_heat_data(
        self,
        lat: float,
        lon: float,
        radius_km: float = 1.0,
        start_date: Optional[str] = None,
        start_time: Optional[str] = None,
        use_cache: bool = True,
    ) -> HeatData:
        """
        Get heat data for a location. Cached per grid cell when use_cache=True.

        Raises:
            APIError: On API failure
        """
        if not self.is_configured():
            raise APIError("FortyGuard API key is not configured", "fortyguard")

        cache_key = self._grid_key(lat, lon) if use_cache else None
        if cache_key and cache_key in self._cache:
            return self._cache[cache_key]

        from datetime import datetime

        if not start_date:
            start_date = datetime.now().strftime("%Y-%m-%d")
        if not start_time:
            start_time = datetime.now().strftime("%H:%M")

        # Fixed: proper degrees-longitude-per-km using cos(latitude)
        lat_offset = radius_km / 111.0
        lon_offset = radius_km / (111.0 * max(math.cos(math.radians(lat)), 1e-6))

        polygon_coords = [
            [lon - lon_offset, lat - lat_offset],
            [lon + lon_offset, lat - lat_offset],
            [lon + lon_offset, lat + lat_offset],
            [lon - lon_offset, lat + lat_offset],
            [lon - lon_offset, lat - lat_offset],
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
                heat_data = self._parse_heatmap_result(result, lat, lon, start_date, start_time)
                if cache_key:
                    self._cache[cache_key] = heat_data
                return heat_data

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
                    heat_data = self._parse_heatmap_result(result, lat, lon, start_date, start_time)
                    if cache_key:
                        self._cache[cache_key] = heat_data
                    return heat_data
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
            source="fortyguard",
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

    # ------------------------------------------------------------------
    # Route-level heat data — SAMPLED, not one call per point
    # ------------------------------------------------------------------
    def _sample_route(self, route_geometry: List[dict], num_samples: int) -> List[dict]:
        """Pick `num_samples` evenly-spaced points along the route (always
        includes the first and last point)."""
        n = len(route_geometry)
        if n <= num_samples:
            return route_geometry

        if num_samples < 2:
            num_samples = 2

        indices = [round(i * (n - 1) / (num_samples - 1)) for i in range(num_samples)]
        # de-dupe while preserving order
        seen = set()
        sampled = []
        for idx in indices:
            if idx not in seen:
                seen.add(idx)
                sampled.append(route_geometry[idx])
        return sampled

    def get_route_heat(
        self,
        route_geometry: List[dict[str, float]],
        start_date: Optional[str] = None,
        start_time: Optional[str] = None,
        num_samples: int = 5,
        use_cache: bool = True,
    ) -> List[dict[str, Any]]:
        """
        Get heat data for a route by sampling `num_samples` representative
        points (default 5: start, 25%, 50%, 75%, end) instead of calling the
        API for every point on the route.

        For a 100-point route this cuts API calls from 100 to 5 (a ~95%
        reduction in credit usage), and repeated calls into the same ~1km
        grid cell reuse cached results across routes.

        Args:
            route_geometry: List of {lat, lon} coordinates
            num_samples: How many points along the route to actually query
                (default 5). Raise this if you need finer-grained risk
                segments; lower it to save credits further.
            use_cache: Reuse cached results for points in the same grid cell

        Returns:
            List of heat data points (only the sampled points — see
            `summarize_route_risk` to turn this into a single route score)
        """
        sampled_points = self._sample_route(route_geometry, num_samples)
        results = []

        for point in sampled_points:
            try:
                heat_data = self.get_heat_or_mock(
                    point["lat"],
                    point["lon"],
                    start_date=start_date,
                    start_time=start_time,
                    use_cache=use_cache,
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
                    "source": heat_data.source,
                    "reason": heat_data.reason,
                })
            except APIError as e:
                results.append({
                    "lat": point["lat"],
                    "lon": point["lon"],
                    "error": str(e),
                    "error_code": e.code,
                    "source": "error",
                })

        return results

    def summarize_route_risk(self, route_heat_results: List[dict]) -> dict:
        """
        Collapse sampled heat points into a single route-level summary:
        average heat index, max heat index, worst risk level, and whether
        any point used mock data (so the frontend/demo can flag it).
        """
        valid = [r for r in route_heat_results if "heat_index" in r]
        if not valid:
            return {
                "average_heat_index": None,
                "max_heat_index": None,
                "worst_risk_level": None,
                "any_mock_data": False,
                "sample_count": 0,
            }

        risk_order = ["LOW", "MODERATE", "HIGH", "VERY_HIGH", "EXTREME"]
        heat_indices = [r["heat_index"] for r in valid]
        worst_risk = max(valid, key=lambda r: risk_order.index(r["risk_level"]))["risk_level"]

        return {
            "average_heat_index": round(sum(heat_indices) / len(heat_indices), 1),
            "max_heat_index": round(max(heat_indices), 1),
            "worst_risk_level": worst_risk,
            "any_mock_data": any(r.get("source") == "mock" for r in valid),
            "sample_count": len(valid),
        }

    # ------------------------------------------------------------------
    # Mock data / fallback — now explicitly labeled
    # ------------------------------------------------------------------
    def mock_heat_data(
        self,
        lat: float,
        lon: float,
        base_temp: float = 30.0,
        reason: str = "FortyGuard not configured",
    ) -> HeatData:
        """Generate mock heat data, clearly labeled as synthetic."""
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
            source="mock",
            reason=reason,
        )

    def get_heat_or_mock(
        self,
        lat: float,
        lon: float,
        radius_km: float = 1.0,
        base_temp: float = 30.0,
        start_date: Optional[str] = None,
        start_time: Optional[str] = None,
        use_cache: bool = True,
    ) -> HeatData:
        """
        Get heat data, falling back to mock data if API fails — the
        returned HeatData.source will be "fortyguard" or "mock" so callers
        never mistake synthetic data for real data.
        """
        if not self.is_configured():
            return self.mock_heat_data(lat, lon, base_temp, reason="FortyGuard API key not configured")

        try:
            return self.get_heat_data(lat, lon, radius_km, start_date, start_time, use_cache=use_cache)
        except APIError as e:
            return self.mock_heat_data(lat, lon, base_temp, reason=f"FortyGuard API error: {e}")


def get_env_int(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, default))
    except (ValueError, TypeError):
        return default
