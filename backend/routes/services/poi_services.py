from typing import Any
import os
import requests


class POIService:
    BASE_URL = "https://api.geoapify.com/v2/places"

    DEFAULT_RADIUS = 500
    DEFAULT_TIMEOUT = 5

    CATEGORIES = (
        "leisure.park,"
        "natural.forest,"
        "natural.water,"
        "catering.cafe,"
        "catering.restaurant,"
        "commercial.shopping_mall,"
        "commercial.supermarket,"
        "education.library,"
        "healthcare.hospital,"
        "amenity.drinking_water"
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
            print("GEOAPIFY_API_KEY is not configured")
            return []

        radius = radius or self.radius

        params = {
            "categories": self.CATEGORIES,
            "filter": f"circle:{lon},{lat},{radius}",
            "limit": 50,
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
            print(f"Geoapify POI API error: {exc}")

            if hasattr(exc, "response") and exc.response is not None:
                print(
                    f"Geoapify response status: "
                    f"{exc.response.status_code}"
                )
                print(
                    f"Geoapify response body: "
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
        if not points:
            return []

        radius = radius or self.radius

        sampled_points = self._reduce_points(
            points,
            max_points=3,
        )

        all_pois = []
        seen_pois = set()

        for point in sampled_points:
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
                unique_key = (
                    poi.get("id"),
                    poi.get("type"),
                    poi.get("lat"),
                    poi.get("lon"),
                )

                if unique_key in seen_pois:
                    continue

                seen_pois.add(unique_key)
                all_pois.append(poi)

        return all_pois

    @staticmethod
    def _reduce_points(
        points,
        max_points: int = 3,
    ):
        if len(points) <= max_points:
            return points

        if max_points == 1:
            return [points[0]]

        indexes = [
            round(
                i * (len(points) - 1)
                / (max_points - 1)
            )
            for i in range(max_points)
        ]

        return [
            points[index]
            for index in indexes
        ]

    @staticmethod
    def _parse_pois(
        data: dict[str, Any],
    ) -> list[dict[str, Any]]:
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
        categories = [
            category.lower()
            for category in categories
        ]

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
                or "hospital" in category
            ):
                return "indoor"

        return "other"
