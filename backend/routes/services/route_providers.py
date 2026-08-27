import requests


class RouteProvider:
    BASE_URL = "https://router.project-osrm.org/route/v1/driving"
    MAX_ROUTES = 3
    TIMEOUT = 15

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
            "steps": "true",
        }
        response = requests.get(
            url,
            params=params,
            timeout=self.TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()

        if data.get("code") != "Ok":
            raise ValueError("Unable to find routes")

        return self._normalize_routes(data)

    def _normalize_routes(self, data):
        routes = []
        seen = set()

        for route in data.get("routes", []):
            geometry = route.get("geometry")
            if not geometry:
                continue

            key = self._geometry_key(geometry)
            if key in seen:
                continue

            seen.add(key)
            duration_seconds = float(route.get("duration", 0))

            routes.append(
                {
                    "id": f"route_{len(routes) + 1}",
                    "distance_km": round(
                        float(route.get("distance", 0)) / 1000,
                        2,
                    ),
                    "duration_min": round(
                        duration_seconds / 60,
                        2,
                    ),
                    "duration_seconds": duration_seconds,
                    "geometry": geometry,
                    "legs": route.get("legs", []),
                }
            )

            if len(routes) >= self.MAX_ROUTES:
                break

        return routes

    @staticmethod
    def _geometry_key(geometry):
        coordinates = geometry.get("coordinates", [])
        if not coordinates:
            return ()

        return tuple(
            (
                round(float(coordinate[0]), 5),
                round(float(coordinate[1]), 5),
            )
            for coordinate in coordinates
            if len(coordinate) >= 2
        )
