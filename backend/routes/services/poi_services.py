from typing import Any
import os
import requests


class POIService:
    """
    Service responsible for fetching and filtering Points of Interest
    around the route origin and destination.

    The backend strictly limits the final POI response to MAX_POIS.
    Hospitals and fuel stations are prioritized when available.
    """

    BASE_URL = "https://api.geoapify.com/v2/places"

    DEFAULT_RADIUS = 500
    DEFAULT_TIMEOUT = 5

    MAX_POIS = 30
    MAX_ROUTE_POINTS = 2

    CATEGORIES = (
        "catering.cafe,"
        "catering.restaurant,"
        "commercial.shopping_mall,"
        "commercial.supermarket,"
        "education.library,"
        "healthcare.hospital,"
        "healthcare.pharmacy,"
        "service.vehicle.fuel,"
        "leisure.park,"
        "natural.forest,"
        "natural.water,"
        "amenity.drinking_water"
    )
    PRIORITY_TYPES = (
        "hospital",
        "fuel_station",
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
        """
        Fetch nearby POIs from Geoapify.

        The API request itself is also limited to MAX_POIS.
        A second strict limit is applied after parsing/filtering.
        """

        if not self.api_key:
            print("GEOAPIFY_API_KEY is not configured")
            return []

        radius = radius or self.radius

        params = {
            "categories": self.CATEGORIES,
            "filter": f"circle:{lon},{lat},{radius}",

            # Ask Geoapify for a bounded number of results.
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
        points,
        radius: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Get POIs around the route origin and destination.

        The final response is strictly limited to MAX_POIS.

        Priority:
            1. Hospitals
            2. Fuel stations
            3. Restaurants / cafes / other POIs

        This guarantees that important emergency/travel-support
        locations are not accidentally removed by the final limit.
        """

        if not points:
            return []

        radius = radius or self.radius

        # We only need POIs around the beginning and end of the route.
        route_points = self._get_origin_destination_points(points)

        all_pois = []
        seen_pois = set()

        for point in route_points:
            lat = point.get("lat")
            lon = point.get("lon")

            if lat is None or lon is None:
                continue

            pois = self.get_nearby_pois(
                lat=lat,
                lon=lon,
                radius=radius,
            )

            for poi in pois:
                unique_key = self._build_unique_key(poi)

                if unique_key in seen_pois:
                    continue

                seen_pois.add(unique_key)
                all_pois.append(poi)

        # Apply strict final limit with priority handling.
        return self._limit_pois(
            all_pois,
            max_pois=self.MAX_POIS,
        )

    @staticmethod
    def _get_origin_destination_points(points):
        """
        Return only the route origin and destination.

        This prevents POIs from random points in the middle
        of the route from dominating the response.
        """

        if len(points) == 1:
            return [points[0]]

        return [
            points[0],
            points[-1],
        ]

    @staticmethod
    def _build_unique_key(
        poi: dict[str, Any],
    ):
        """
        Build a stable key for POI deduplication.
        """

        poi_id = poi.get("id")

        if poi_id:
            return ("id", poi_id)

        return (
            "location",
            poi.get("type"),
            poi.get("lat"),
            poi.get("lon"),
        )

    @classmethod
    def _limit_pois(
        cls,
        pois: list[dict[str, Any]],
        max_pois: int,
    ) -> list[dict[str, Any]]:
        """
        Strictly limit POIs while prioritizing hospitals
        and fuel stations.

        Example:

            max_pois = 15

        If hospitals and fuel stations exist, they are placed
        first, then the remaining slots are filled with other POIs.
        """

        if not pois:
            return []

        # Separate priority POIs.
        hospitals = [
            poi
            for poi in pois
            if poi.get("type") == "hospital"
        ]

        fuel_stations = [
            poi
            for poi in pois
            if poi.get("type") == "fuel_station"
        ]

        # Everything else.
        other_pois = [
            poi
            for poi in pois
            if poi.get("type")
            not in cls.PRIORITY_TYPES
        ]

        selected = []

        # Add hospitals first.
        selected.extend(hospitals)

        # Add fuel stations second.
        selected.extend(fuel_stations)

        # Fill remaining slots with other POIs.
        remaining_slots = max_pois - len(selected)

        if remaining_slots > 0:
            selected.extend(
                other_pois[:remaining_slots]
            )

        # Absolute backend safety limit.
        return selected[:max_pois]

    @staticmethod
    def _parse_pois(
        data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Parse Geoapify response into the ThermoRoute POI format.
        """

        features = data.get("features", [])

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
                or properties.get("address_line1")
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
        """
        Convert Geoapify categories into ThermoRoute POI types.

        Important:
            Hospitals and fuel stations have their own explicit
            types so they can be prioritized by _limit_pois().
        """

        categories = [
            category.lower()
            for category in categories
        ]

        for category in categories:
            if (
                "fuel" in category
                or "gas" in category
                or "service.vehicle.fuel" in category
            ):
                return "fuel_station"

        for category in categories:
            if (
                "hospital" in category
                or "healthcare.hospital" in category
            ):
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
                or "pharmacy" in category
            ):
                return "indoor"

        return "other"
