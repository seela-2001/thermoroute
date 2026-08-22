import requests


class WeatherService:
    """
    Fetch current and hourly weather conditions for a location.
    Uses Open-Meteo and does not require an API key.
    """

    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def __init__(self, timeout=10):
        self.timeout = timeout

    def get_weather(self, lat: float, lon: float) -> dict:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": ",".join([
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "precipitation",
                "wind_speed_10m",
                "weather_code",
                "uv_index",
            ]),
            "hourly": ",".join([
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "precipitation_probability",
                "precipitation",
                "wind_speed_10m",
                "uv_index",
                "weather_code",
            ]),
            "forecast_days": 1,
            "timezone": "auto",
        }

        try:
            response = requests.get(
                self.BASE_URL,
                params=params,
                timeout=self.timeout,
            )
            response.raise_for_status()

            data = response.json()

            return {
                "success": True,
                "current": self._parse_current(data),
                "hourly": self._parse_hourly(data),
            }

        except requests.RequestException as e:
            return {
                "success": False,
                "error": str(e),
                "current": {},
                "hourly": [],
            }

    @staticmethod
    def _parse_current(data: dict) -> dict:
        current = data.get("current", {})

        return {
            "time": current.get("time"),
            "temperature": current.get("temperature_2m"),
            "feels_like": current.get("apparent_temperature"),
            "humidity": current.get("relative_humidity_2m"),
            "precipitation": current.get("precipitation"),
            "wind_speed": current.get("wind_speed_10m"),
            "uv_index": current.get("uv_index"),
            "weather_code": current.get("weather_code"),
        }

    @staticmethod
    def _parse_hourly(data: dict) -> list:
        hourly = data.get("hourly", {})

        times = hourly.get("time", [])
        temperatures = hourly.get("temperature_2m", [])
        humidity = hourly.get("relative_humidity_2m", [])
        feels_like = hourly.get("apparent_temperature", [])
        precipitation_probability = hourly.get(
            "precipitation_probability", []
        )
        precipitation = hourly.get("precipitation", [])
        wind_speed = hourly.get("wind_speed_10m", [])
        uv_index = hourly.get("uv_index", [])
        weather_code = hourly.get("weather_code", [])

        result = []

        for i, time in enumerate(times):
            result.append({
                "time": time,
                "temperature": temperatures[i] if i < len(temperatures) else None,
                "feels_like": feels_like[i] if i < len(feels_like) else None,
                "humidity": humidity[i] if i < len(humidity) else None,
                "precipitation_probability": (
                    precipitation_probability[i]
                    if i < len(precipitation_probability)
                    else None
                ),
                "precipitation": (
                    precipitation[i]
                    if i < len(precipitation)
                    else None
                ),
                "wind_speed": (
                    wind_speed[i]
                    if i < len(wind_speed)
                    else None
                ),
                "uv_index": (
                    uv_index[i]
                    if i < len(uv_index)
                    else None
                ),
                "weather_code": (
                    weather_code[i]
                    if i < len(weather_code)
                    else None
                ),
            })

        return result
