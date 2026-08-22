import requests


class RouteProvider:
    BASE_URL = "https://router.project-osrm.org/route/v1/driving"

    def get_routes(
        self,
        origin_lat: float,
        origin_lng: float,
        destination_lat: float,
        destination_lng: float,
    ):
        url = (
            f"{self.BASE_URL}/"
            f"{origin_lng},{origin_lat};"
            f"{destination_lng},{destination_lat}"
        )
        params = {
            "alternatives": "true",
            "overview": "full",
            "geometries": "geojson",
        }
        response = requests.get(
            url,
            params=params,
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()

        if data.get("code") != "Ok":
            raise ValueError("Unable to find routes")

        return self._normalize_routes(data)

    def _normalize_routes(self, data):
        routes = []

        for index, route in enumerate(data["routes"]):
            routes.append({
                "id": f"route_{index + 1}",
                "distance_km": round(
                    route["distance"] / 1000,
                    2
                ),
                "duration_min": round(
                    route["duration"] / 60,
                    2
                ),
                "geometry": route["geometry"],
            })

        return routes
