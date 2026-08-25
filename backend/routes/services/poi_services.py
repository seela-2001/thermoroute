from typing import Any
import os
import requests


class POIService:
    BASE_URL = "https://api.geoapify.com/v2/places"

    DEFAULT_RADIUS = 500
    DEFAULT_TIMEOUT = 5

    MAX_POIS = 15
    MAX_POINTS_PER_ROUTE = 2

    CATEGORIES = (
        "catering.restaurant,"
        "catering.cafe,"
        "service.vehicle.fuel,"
        "healthcare.hospital,"
        "leisure.park,"
        "natural.forest,"
        "natural.water,"
        "commercial.shopping_mall,"
        "commercial.supermarket,"
        "education.library,"
        "amenity.drinking_water"
    )

    # These categories are important enough that we try
    # to preserve them when selecting the final 15 POIs.
    PRIORITY_TYPES = (
        "gas_station",
        "hospital",
    )

    def __init__(
        self,
        radius: int = DEFAULT_RADIUS,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        self.radius = radius
        self.timeout = timeout
        self.api_key = os.getenv("GEOAPIFY_API_KEY")

        self.session = requests.Session()

        self.session.headers.update(
            {
                "User-Agent": "ThermoRoute/1.0",
                "Accept": "application/json",
            }
        )

    def get_nearby_pois(
        self,
        lat: float,
        lon: float,
        radius: int | None = None,
    ) -> list[dict[str, Any]]:
        if not self.api_key:
            print(
                "GEOAPIFY_API_KEY is not configured"
            )
            return []

        radius = radius or self.radius

        params = {
            "categories": self.CATEGORIES,
            "filter": (
                f"circle:{lon},{lat},{radius}"
            ),
            # API-side limit.
            "limit": self.MAX_POIS,
            "apiKey": self.api_key,
        }

        try:
            response = self.session.get(
                self.BASE_URL,
                params=params,
                timeout=self.timeout,
            )

            response.raise_for_status()

            data = response.json()

            return self._parse_pois(data)

        except requests.exceptions.Timeout:
            print("Geoapify POI API timeout")
            return []

        except requests.exceptions.ConnectionError as exc:
            print(
                f"Geoapify POI API connection error: {exc}"
            )
            return []

        except requests.exceptions.RequestException as exc:
            print(
                f"Geoapify POI API error: {exc}"
            )

            if (
                hasattr(exc, "response")
                and exc.response is not None
            ):
                print(
                    "Geoapify response status: "
                    f"{exc.response.status_code}"
                )
                print(
                    "Geoapify response body: "
                    f"{exc.response.text}"
                )

            return []

        except ValueError:
            print(
                "Geoapify POI API returned invalid JSON"
            )
            return []

    def get_pois(
        self,
        origin: dict[str, float] | None = None,
        destination: dict[str, float] | None = None,
        route_points: list[dict[str, float]] | None = None,
        radius: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Get POIs for ONE route.

        POIs are intentionally searched only around:
        1. route origin
        2. route destination

        We do NOT search random points along the route, so
        `route_points` (the full route geometry) is accepted
        for interface compatibility with the caller but is not
        used for POI lookups.
        """

        search_points = self._resolve_search_points(
            origin,
            destination,
        )

        if not search_points:
            return []

        all_pois = []
        seen_pois = set()

        for point_type, point in search_points:
            pois = self.get_nearby_pois(
                lat=point["lat"],
                lon=point["lon"],
                radius=radius,
            )

            for poi in pois:
                unique_key = self._poi_key(poi)

                if unique_key in seen_pois:
                    continue

                seen_pois.add(unique_key)

                # Keep track of whether this POI belongs
                # to route origin or destination.
                poi["route_location"] = point_type

                all_pois.append(poi)

        return self._limit_pois(
            all_pois
        )

    @staticmethod
    def _resolve_search_points(
        origin: dict[str, float] | None,
        destination: dict[str, float] | None,
    ):
        points = []

        if (
            origin
            and origin.get("lat") is not None
            and origin.get("lon") is not None
        ):
            points.append(("origin", origin))

        if (
            destination
            and destination.get("lat") is not None
            and destination.get("lon") is not None
            and destination != origin
        ):
            points.append(("destination", destination))

        return points

    @staticmethod
    def _poi_key(
        poi: dict[str, Any],
    ):
        return (
            poi.get("id")
            or (
                poi.get("type"),
                poi.get("lat"),
                poi.get("lon"),
            )
        )

    @classmethod
    def _limit_pois(
        cls,
        pois: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Strict backend limit.

        Maximum response = 15 POIs.

        Priority:
        1. gas stations
        2. hospitals
        3. everything else

        Within each group, closest POIs are preferred.
        """

        if len(pois) <= cls.MAX_POIS:
            return pois

        priority = []
        others = []

        for poi in pois:
            if poi.get("type") in cls.PRIORITY_TYPES:
                priority.append(poi)
            else:
                others.append(poi)

        priority.sort(
            key=cls._distance_sort_key
        )

        others.sort(
            key=cls._distance_sort_key
        )

        selected = []

        # First preserve priority POIs.
        for poi in priority:
            if len(selected) >= cls.MAX_POIS:
                break

            selected.append(poi)

        # Then fill remaining slots.
        for poi in others:
            if len(selected) >= cls.MAX_POIS:
                break

            selected.append(poi)

        return selected[: cls.MAX_POIS]

    @staticmethod
    def _distance_sort_key(
        poi: dict[str, Any],
    ):
        distance = poi.get("distance")

        if distance is None:
            return float("inf")

        try:
            return float(distance)
        except (
            TypeError,
            ValueError,
        ):
            return float("inf")

    @staticmethod
    def _parse_pois(
        data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        features = data.get(
            "features",
            [],
        )

        pois = []

        for feature in features:
            properties = feature.get(
                "properties",
                {},
            )

            geometry = feature.get(
                "geometry",
                {},
            )

            coordinates = geometry.get(
                "coordinates",
                [],
            )

            if len(coordinates) < 2:
                continue

            lon = coordinates[0]
            lat = coordinates[1]

            categories = properties.get(
                "categories",
                [],
            )

            poi_type = POIService._classify_poi(
                categories
            )

            poi_id = properties.get(
                "place_id"
            )

            if poi_id is None:
                poi_id = feature.get("id")

            name = (
                properties.get("name")
                or properties.get(
                    "address_line1"
                )
                or "Unnamed"
            )

            pois.append(
                {
                    "id": poi_id,
                    "type": poi_type,
                    "name": name,
                    "lat": lat,
                    "lon": lon,
                    "distance": properties.get(
                        "distance"
                    ),
                    "address": properties.get(
                        "formatted"
                    ),
                    "categories": categories,
                }
            )

        return pois

    @staticmethod
    def _classify_poi(
        categories,
    ) -> str:
        categories = [
            category.lower()
            for category in categories
        ]

        # Fuel must be checked before generic
        # "service" categories.
        for category in categories:
            if (
                "fuel" in category
                or "gas_station" in category
                or "petrol" in category
            ):
                return "gas_station"

        for category in categories:
            if "hospital" in category:
                return "hospital"

        for category in categories:
            if (
                "drinking_water" in category
                or "fountain" in category
                or "water" in category
            ):
                return "water"

        for category in categories:
            if (
                "park" in category
                or "garden" in category
                or "forest" in category
                or "nature" in category
                or "tree" in category
            ):
                return "shade"

        for category in categories:
            if (
                "shopping_mall" in category
                or "supermarket" in category
                or "cafe" in category
                or "restaurant" in category
                or "library" in category
            ):
                return "indoor"

        return "other"
