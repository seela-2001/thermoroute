from datetime import datetime
from typing import Any
import os
import requests


class TomTomRoutingService:
    ROUTE_URL = (
        "https://api.tomtom.com/routing/route/1/basic/json"
    )

    DEFAULT_TIMEOUT = 5

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
                "error": (
                    "TOMTOM_API_KEY is not configured"
                ),
            }

        supporting_points = [
            f"{point['lon']},{point['lat']}"
            for point in route_geometry
        ]

        if len(supporting_points) < 2:
            return {
                "success": False,
                "error": (
                    "Route geometry needs at least "
                    "2 points"
                ),
            }

        params = {
            "key": self.api_key,
            "travelMode": "car",
            "departAt": departure_time.isoformat(),
            "supportingPoints": ";".join(
                supporting_points
            ),
            "computeTravelTimeFor": "all",
            "sectionType": "travelTime",
        }

        try:
            response = self.session.get(
                self.ROUTE_URL,
                params=params,
                timeout=self.timeout,
            )

            response.raise_for_status()

            data = response.json()

            summary = (
                data.get("routes", [{}])[0]
                .get("summary", {})
            )

            travel_time = summary.get(
                "travelTimeInSeconds"
            )

            if travel_time is None:
                return {
                    "success": False,
                    "error": (
                        "TomTom response missing "
                        "travelTimeInSeconds"
                    ),
                }

            return {
                "success": True,
                "travel_time_seconds": float(
                    travel_time
                ),
            }

        except requests.RequestException as exc:
            print(
                f"TomTom Routing error: {exc}"
            )

            return {
                "success": False,
                "error": str(exc),
            }

        except ValueError as exc:
            print(
                "TomTom Routing invalid JSON: "
                f"{exc}"
            )

            return {
                "success": False,
                "error": str(exc),
            }


