from datetime import datetime
from typing import Any
import os
import requests


class TomTomRoutingService:
    BASE_URL = "https://api.tomtom.com/routing/1/calculateRoute"

    DEFAULT_TIMEOUT = 8

    def __init__(self, timeout: int = DEFAULT_TIMEOUT):
        self.timeout = timeout
        self.api_key = os.getenv("TOMTOM_API_KEY")

        self.session = requests.Session()

        self.session.headers.update(
            {
                "User-Agent": "ThermoRoute/1.0",
                "Accept": "application/json",
            }
        )

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def get_travel_time(
        self,
        route_geometry: list[dict[str, float]],
        departure_time: datetime,
    ) -> dict[str, Any]:

        if not self.api_key:
            return {
                "success": False,
                "error": "TOMTOM_API_KEY is not configured",
            }

        if len(route_geometry) < 2:
            return {
                "success": False,
                "error": "Route geometry needs at least 2 points",
            }

        origin = route_geometry[0]
        destination = route_geometry[-1]
        intermediates = route_geometry[1:-1]

        locations = (
            f"{origin['lat']},{origin['lon']}"
            f":{destination['lat']},{destination['lon']}"
        )
        url = f"{self.BASE_URL}/{locations}/json"

        params: dict[str, Any] = {
            "key": self.api_key,
            "travelMode": "car",
            "departAt": departure_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "computeTravelTimeFor": "all",
        }

        # Pass intermediate points in the POST body so TomTom follows
        # the same road geometry as OSRM instead of its own best route
        body: dict[str, Any] = {}
        if intermediates:
            body["supportingPoints"] = [
                {"latitude": p["lat"], "longitude": p["lon"]}
                for p in intermediates
            ]

        try:
            response = self.session.post(
                url,
                params=params,
                json=body if body else None,
                timeout=self.timeout,
            )

            response.raise_for_status()

            data = response.json()

            summary = (
                data.get("routes", [{}])[0]
                .get("summary", {})
            )

            travel_time = summary.get("travelTimeInSeconds")

            if travel_time is None:
                return {
                    "success": False,
                    "error": "TomTom response missing travelTimeInSeconds",
                }

            return {
                "success": True,
                "travel_time_seconds": float(travel_time),
            }

        except requests.RequestException as exc:
            print(f"TomTom Routing error: {exc}")
            return {
                "success": False,
                "error": str(exc),
            }

        except ValueError as exc:
            print(f"TomTom Routing invalid JSON: {exc}")
            return {
                "success": False,
                "error": str(exc),
            }
