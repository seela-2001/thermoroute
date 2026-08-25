import requests


class RouteProvider:
    BASE_URL = "https://router.project-osrm.org/route/v1/driving"

    MAX_ROUTES = 5
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
        seen_geometries = set()

        for route in data.get("routes", []):
            geometry = route.get("geometry")

            if not geometry:
                continue

            geometry_key = self._geometry_key(geometry)

            # OSRM can theoretically return very similar/duplicate
            # alternatives. Do not expose duplicates to the backend.
            if geometry_key in seen_geometries:
                continue

            seen_geometries.add(geometry_key)

            routes.append(
                {
                    "id": f"route_{len(routes) + 1}",
                    "distance_km": round(
                        route["distance"] / 1000,
                        2,
                    ),
                    "duration_min": round(
                        route["duration"] / 60,
                        2,
                    ),
                    "geometry": geometry,
                }
            )

            if len(routes) >= self.MAX_ROUTES:
                break

        return routes

    @staticmethod
    def _geometry_key(geometry):
        """
        Create a stable key from the route geometry.

        We intentionally use the full coordinate sequence so that
        two genuinely different OSRM alternatives are preserved.
        """
        coordinates = geometry.get("coordinates", [])

        return tuple(
            (
                round(float(coordinate[0]), 6),
                round(float(coordinate[1]), 6),
            )
            for coordinate in coordinates
            if len(coordinate) >= 2
        )
