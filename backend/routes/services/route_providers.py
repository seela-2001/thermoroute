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
            legs = route.get("legs", [])

            routes.append(
                {
                    "id": f"route_{len(routes) + 1}",
                    "name": self._extract_route_name(legs),
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
                    "legs": legs,
                    "waypoints": self._extract_waypoints(legs),
                }
            )

            if len(routes) >= self.MAX_ROUTES:
                break

        return routes

    @staticmethod
    def _extract_route_name(legs):
        """Extract the primary highway reference from OSRM step refs."""
        refs = []
        names = []
        for leg in legs:
            for step in leg.get("steps", []):
                ref = (step.get("ref") or "").strip()
                name = (step.get("name") or "").strip()
                if ref and ref not in refs:
                    refs.append(ref)
                elif name and name not in names and name.lower() not in ("", "unnamed road"):
                    names.append(name)
        if refs:
            return refs[0]
        if names:
            return names[0]
        return None

    @staticmethod
    def _extract_waypoints(legs):
        """Return only the user-specified intermediate stop locations
        (leg boundaries), not every step maneuver.

        Each leg in OSRM corresponds to one segment between the user's
        waypoints (origin → stop1 → stop2 → destination). The first
        step of leg[i+1] is the intermediate stop between leg[i] and
        leg[i+1]. For a direct A→B route with no stops, there is only
        one leg, so this returns an empty list (origin and destination
        are already covered by the even-spacing samples)."""
        waypoints = []
        seen = set()

        # Leg boundaries: for N legs, the stops are between legs 0→1,
        # 1→2, ... i.e. the start of legs 1, 2, … (not leg 0 = origin,
        # not the end of the last leg = destination).
        for leg in legs[1:]:
            steps = leg.get("steps") or []
            if not steps:
                continue
            maneuver = (steps[0].get("maneuver") or {})
            location = maneuver.get("location")
            if not location or len(location) < 2:
                continue
            key = (
                round(float(location[0]), 5),
                round(float(location[1]), 5),
            )
            if key in seen:
                continue
            seen.add(key)
            waypoints.append(
                {
                    "lon": float(location[0]),
                    "lat": float(location[1]),
                }
            )

        return waypoints

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
