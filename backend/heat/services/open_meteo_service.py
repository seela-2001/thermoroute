"""
Fallback heat source when FortyGuard has no coverage.

Open-Meteo's forecast API supports past and future hours with no API
key, and a single request returns the full hourly series for a point
— so one call serves every departure evaluation for that point.
"""
from datetime import datetime
import requests
from requests.adapters import HTTPAdapter


def calculate_heat_index(temp_c: float, humidity: float) -> float:
    """Same formulation as FortyGuardService._calculate_heat_index."""
    temp_f = temp_c * 9 / 5 + 32
    hi = 0.5 * (temp_f + 61.0 + (temp_f - 68.0) * 1.2 + humidity * 0.094)
    if hi >= 80:
        hi = (
            -42.379
            + 2.04901523 * temp_f
            + 10.14333127 * humidity
            - 0.22475541 * temp_f * humidity
            - 0.00683783 * temp_f ** 2
            - 0.05481717 * humidity ** 2
            + 0.00122874 * temp_f ** 2 * humidity
            + 0.00085282 * temp_f * humidity ** 2
            - 0.00000199 * temp_f ** 2 * humidity ** 2
        )
    return round((hi - 32) * 5 / 9, 1)


def calculate_risk_level(heat_index: float) -> str:
    if heat_index >= 45:
        return "EXTREME"
    if heat_index >= 40:
        return "VERY_HIGH"
    if heat_index >= 35:
        return "HIGH"
    if heat_index >= 30:
        return "MODERATE"
    return "LOW"


class OpenMeteoService:
    """Fallback heat source when FortyGuard has no coverage."""

    FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
    AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
    TIMEOUT = 15

    def __init__(self):
        adapter = HTTPAdapter()
        self.session = requests.Session()
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        self._cache: dict = {}

    def _point_key(self, lat: float, lon: float) -> str:
        return f"{round(lat, 2)}:{round(lon, 2)}"

    def _hour_key(self, moment: datetime) -> str:
        return moment.strftime("%Y-%m-%d %H:00")

    def get_hourly(self, lat: float, lon: float) -> dict:
        """Return {"hours": {hour_key: {temperature, humidity, uv_index,
        wind_speed_ms, precipitation_mm}}, "aqi": {hour_key: us_aqi}}
        for this point, cached per instance."""
        key = self._point_key(lat, lon)
        if key in self._cache:
            return self._cache[key]

        entry = {"hours": {}, "aqi": {}}

        try:
            response = self.session.get(
                self.FORECAST_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "temperature_2m,relative_humidity_2m,uv_index,wind_speed_10m,precipitation,precipitation_probability",
                    "past_days": 1,
                    "forecast_days": 3,
                    "timezone": "UTC",
                },
                timeout=self.TIMEOUT,
            )
            response.raise_for_status()
            data = response.json()
            hourly = data.get("hourly", {})
            times = hourly.get("time", [])
            temps = hourly.get("temperature_2m", [])
            humidity = hourly.get("relative_humidity_2m", [])
            uv = hourly.get("uv_index", [])
            wind_kph = hourly.get("wind_speed_10m", [])
            precip = hourly.get("precipitation", [])
            precip_prob = hourly.get("precipitation_probability", [])
            for index, stamp in enumerate(times):
                hour_key = self._hour_key(
                    datetime.fromisoformat(stamp.replace("T", " "))
                )
                entry["hours"][hour_key] = {
                    "temperature": float(temps[index]) if index < len(temps) and temps[index] is not None else None,
                    "humidity": float(humidity[index]) if index < len(humidity) and humidity[index] is not None else None,
                    "uv_index": float(uv[index]) if index < len(uv) and uv[index] is not None else None,
                    "wind_speed_ms": float(wind_kph[index]) / 3.6 if index < len(wind_kph) and wind_kph[index] is not None else None,
                    "precipitation_mm": float(precip[index]) if index < len(precip) and precip[index] is not None else None,
                    "precipitation_probability": float(precip_prob[index]) if index < len(precip_prob) and precip_prob[index] is not None else None,
                }
        except (requests.RequestException, ValueError, TypeError):
            pass

        try:
            aqi_response = self.session.get(
                self.AIR_QUALITY_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "us_aqi",
                    "past_days": 1,
                    "forecast_days": 3,
                    "timezone": "UTC",
                },
                timeout=self.TIMEOUT,
            )
            aqi_response.raise_for_status()
            aqi_data = aqi_response.json()
            aqi_hourly = aqi_data.get("hourly", {})
            aqi_times = aqi_hourly.get("time", [])
            aqi_values = aqi_hourly.get("us_aqi", [])
            for index, stamp in enumerate(aqi_times):
                hour_key = self._hour_key(
                    datetime.fromisoformat(stamp.replace("T", " "))
                )
                if index < len(aqi_values) and aqi_values[index] is not None:
                    entry["aqi"][hour_key] = float(aqi_values[index])
        except (requests.RequestException, ValueError, TypeError):
            pass

        self._cache[key] = entry
        return entry

    def get_point_result(self, lat: float, lon: float, rounded_eta: datetime) -> dict | None:
        """Build a heat-data dict for one point/hour from Open-Meteo.
        Returns None when no forecast data is available for the hour."""
        entry = self.get_hourly(lat, lon)
        hour_key = self._hour_key(rounded_eta)
        point_data = entry.get("hours", {}).get(hour_key)
        if not point_data:
            return None
        temperature = point_data.get("temperature")
        humidity = point_data.get("humidity")
        if temperature is None:
            return None
        heat_index = calculate_heat_index(temperature, humidity or 50)
        return {
            "lat": lat,
            "lon": lon,
            "temperature": round(temperature, 1),
            "humidity": round(humidity, 1) if humidity is not None else None,
            "heat_index": round(heat_index, 1),
            "uv_index": round(point_data["uv_index"], 1) if point_data.get("uv_index") is not None else None,
            "aqi": entry["aqi"].get(hour_key),
            "wind_speed_ms": round(point_data["wind_speed_ms"], 2) if point_data.get("wind_speed_ms") is not None else None,
            "precipitation_mm": round(point_data["precipitation_mm"], 2) if point_data.get("precipitation_mm") is not None else None,
            "precipitation_probability": round(point_data["precipitation_probability"], 0) if point_data.get("precipitation_probability") is not None else None,
            "risk_level": calculate_risk_level(heat_index),
            "timestamp": rounded_eta.strftime("%Y-%m-%d") + " " + rounded_eta.strftime("%H:%M"),
            "source": "fortyguard",
            "reason": None,
        }
