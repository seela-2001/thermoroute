"""
FortyGuard Service for Temperature Data

Fetches heat/risk data from FortyGuard API.

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
import os
import pathlib
import time
import requests
from typing import Optional, Any, List
from dataclasses import dataclass
from dotenv import load_dotenv

from exceptions import APIError


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


class FortyGuardService:
    """
    Service for fetching heat data from FortyGuard API.

    Environment Variables:
        FORTYGUARD_API_KEY: API key for FortyGuard (required)
        FORTYGUARD_BASE_URL: Base URL for FortyGuard API (default: https://api.fortyguard.com/v1)
        FORTYGUARD_TIMEOUT: Request timeout in seconds (default: 10)
    """

    # Default values (can be overridden by env vars)
    DEFAULT_BASE_URL = "https://api.fortyguard.com/v1"
    DEFAULT_TIMEOUT = 10

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[int] = None,
        load_from_parent_env: bool = True
    ):
        """
        Initialize FortyGuard service.

        Args:
            api_key: FortyGuard API key (defaults to FORTYGUARD_API_KEY env var)
            base_url: Base URL for API (defaults to FORTYGUARD_BASE_URL env var)
            timeout: Request timeout in seconds (defaults to FORTYGUARD_TIMEOUT env var)
            load_from_parent_env: Load .env from parent directory (for Jupyter usage)
        """
        # Load .env from parent directory if requested (for Jupyter/notebook usage)
        if load_from_parent_env:
            parent_env = pathlib.Path.cwd().parent / '.env'
            if parent_env.exists():
                load_dotenv(parent_env)
            else:
                load_dotenv()

        # Set configuration
        self.api_key = api_key or os.getenv("FORTYGUARD_API_KEY", "")
        self.base_url = base_url or os.getenv("FORTYGUARD_BASE_URL", self.DEFAULT_BASE_URL)
        self.timeout = timeout or get_env_int("FORTYGUARD_TIMEOUT", self.DEFAULT_TIMEOUT)

        if not self.api_key:
            # Don't raise error - allow mock data usage
            pass

    def __str__(self):
        """String representation for debugging."""
        key_display = f"{self.api_key[:6]}…" if self.api_key else "(missing)"
        return f"FortyGuardService(base_url={self.base_url}, api_key={key_display})"

    def is_configured(self) -> bool:
        """Check if API key is configured."""
        return bool(self.api_key)

    def get_heat_data(
        self,
        lat: float,
        lon: float,
        radius_km: float = 1.0,
        start_date: Optional[str] = None,
        start_time: Optional[str] = None
    ) -> HeatData:
        """
        Get heat data for a location.

        Args:
            lat: Latitude
            lon: Longitude
            radius_km: Search radius in kilometers
            start_date: Start date for analysis (YYYY-MM-DD), defaults to today
            start_time: Start time for analysis (HH:MM), defaults to current hour

        Returns:
            HeatData object

        Raises:
            APIError: On API failure
        """
        if not self.is_configured():
            raise APIError("FortyGuard API key is not configured", "fortyguard")

        from datetime import datetime

        if not start_date:
            start_date = datetime.now().strftime("%Y-%m-%d")

        if not start_time:
            start_time = datetime.now().strftime("%H:%M")

        # Create a small polygon around the point (radius_km)
        # Using approximate degrees: 1 degree lat ≈ 111km
        lat_offset = (radius_km / 111.0)
        lon_offset = (radius_km / (111.0 * abs(lat) ** 0.5)) if lat != 0 else (radius_km / 111.0)

        polygon_coords = [
            [lon - lon_offset, lat - lat_offset],
            [lon + lon_offset, lat - lat_offset],
            [lon + lon_offset, lat + lat_offset],
            [lon - lon_offset, lat + lat_offset],
            [lon - lon_offset, lat - lat_offset]  # Close the polygon
        ]

        # Submit heatmap request
        # polygon_aoi must be a FeatureCollection
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
                "filter_type": 1  # Single hour
            },
            "granularity": 100,  # 100 meters
            "analysis_type": "tcm"  # Temperature in °C
        }

        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            # Submit the job
            response = requests.post(url, json=payload, headers=headers, timeout=self.timeout)
            response.raise_for_status()

            submit_data = response.json()

            # Check if result is already in response (for small areas)
            # Result could be in submit_data.result or submit_data.data.result
            result = submit_data.get("result") or submit_data.get("data", {}).get("result")
            if result:
                return self._parse_heatmap_result(result, lat, lon, start_date, start_time)

            # activity_id may be in data.activity_id or directly in response
            activity_id = submit_data.get("activity_id") or submit_data.get("data", {}).get("activity_id")

            if not activity_id:
                raise APIError(f"No activity_id in response: {submit_data}", "fortyguard")

            # Poll for completion
            status_url = f"{self.base_url}/status/{activity_id}"
            max_polls = 60  # 10 minutes max
            poll_interval = 10  # seconds

            for attempt in range(max_polls):
                time.sleep(poll_interval)
                status_response = requests.get(status_url, headers=headers, timeout=self.timeout)
                status_response.raise_for_status()
                status_data = status_response.json()

                # Status is in data.status
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
        """Parse the heatmap result from FortyGuard API."""
        # Extract temperature from the result
        temp = self._extract_temperature(result)

        # Extract humidity (not available in heatmap, use default)
        humidity = 65.0

        # Calculate heat index
        heat_index = self._calculate_heat_index(temp, humidity)

        return HeatData(
            temperature=temp,
            humidity=humidity,
            heat_index=heat_index,
            uv_index=0.0,  # Not provided by heatmap endpoint
            aqi=0.0,  # Not provided by heatmap endpoint
            risk_level=self._calculate_risk_level(heat_index),
            location=f"{lat},{lon}",
            timestamp=f"{start_date}T{start_time}",
        )

    def _extract_temperature(self, result: dict) -> float:
        """Extract temperature from API result."""
        if not isinstance(result, dict):
            return 30.0

        # Try to get temperature from map_data features (primary source)
        map_data = result.get("map_data") or {}
        features = map_data.get("features") or []
        if features:
            temps = []
            for feature in features:
                props = feature.get("properties", {})
                # The API returns average_temperature, min_temperature, max_temperature
                for key in ["average_temperature", "temperature", "tcm", "Temperature", "min_temperature", "max_temperature"]:
                    if key in props and props[key] is not None:
                        try:
                            temps.append(float(props[key]))
                            break
                        except (ValueError, TypeError):
                            pass
            if temps:
                return sum(temps) / len(temps)

        # Try to get temperature from stats_data
        stats_data = result.get("stats_data") or {}
        temp_stats = stats_data.get("Temperature_stats") or stats_data.get("temperature_stats") or {}

        if temp_stats:
            # Try various key names for temperature stats
            for key in ["mean", "avg", "average", "temperature_mean", "average_temperature"]:
                if key in temp_stats:
                    try:
                        return float(temp_stats[key])
                    except (ValueError, TypeError):
                        pass

        # Try to get temperature from overall distribution
        dist = stats_data.get("Overall_temperature_distribution") or stats_data.get("overall_temperature_distribution")
        if dist and isinstance(dist, list) and dist:
            try:
                valid_temps = [float(t) for t in dist if t is not None]
                if valid_temps:
                    return sum(valid_temps) / len(valid_temps)
            except (ValueError, TypeError):
                pass

        return 30.0  # Default fallback

    def _extract_humidity(self, result: dict) -> float:
        """Extract humidity from API result (not available in heatmap, use default)."""
        # Heatmap endpoint doesn't provide humidity, use reasonable default
        return 65.0

    def _calculate_heat_index(self, temp_c: float, humidity: float) -> float:
        """Calculate heat index (simplified formula)."""
        # Convert to Fahrenheit for heat index calculation
        temp_f = temp_c * 9/5 + 32
        # Simplified heat index formula
        if temp_f < 80:
            return temp_c
        hi = 0.5 * (temp_f + 61.0 + ((temp_f - 68.0) * 1.2) + (humidity * 0.094))
        return (hi - 32) * 5/9  # Convert back to Celsius

    def _calculate_risk_level(self, heat_index: float) -> str:
        """Calculate risk level based on heat index."""
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
        """
        Get heat data for multiple points along a route.

        Args:
            route_geometry: List of {lat, lon} coordinates
            start_date: Start date for analysis (YYYY-MM-DD), defaults to today
            start_time: Start time for analysis (HH:MM), defaults to current hour

        Returns:
            List of heat data points

        Note:
            Continues on individual point failures - includes error marker for failed points
        """
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
                # Continue on error, include error marker
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
        """
        Generate mock heat data for testing.

        Use this when FortyGuard API is unavailable or for testing.

        Args:
            lat: Latitude (for interface consistency)
            lon: Longitude (for interface consistency)
            base_temp: Base temperature for mock data

        Returns:
            HeatData object with synthetic values
        """
        import random
        from datetime import datetime

        # Add some variation
        temp_variation = random.uniform(-3, 5)
        temp = base_temp + temp_variation

        # Calculate heat index (simplified formula)
        heat_index = temp + (temp * 0.1) if temp > 27 else temp

        # Generate risk level based on heat index
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
        """
        Get heat data, falling back to mock data if API fails.

        Args:
            lat: Latitude
            lon: Longitude
            radius_km: Search radius in kilometers
            base_temp: Base temperature for mock data fallback
            start_date: Start date for analysis (YYYY-MM-DD), defaults to today
            start_time: Start time for analysis (HH:MM), defaults to current hour

        Returns:
            HeatData object (real or mock)
        """
        if not self.is_configured():
            return self.mock_heat_data(lat, lon, base_temp)

        try:
            return self.get_heat_data(lat, lon, radius_km, start_date, start_time)
        except APIError:
            return self.mock_heat_data(lat, lon, base_temp)


def get_env_int(key: str, default: int) -> int:
    """Get int from environment or return default."""
    try:
        return int(os.getenv(key, default))
    except (ValueError, TypeError):
        return default