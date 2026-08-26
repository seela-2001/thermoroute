from typing import Any
import os

import requests


class CameraService:
    BASE_URL = os.getenv(
        "CAMERA_API_URL",
        "https://api.road511.com/api/v1/features",
    )

    DEFAULT_RADIUS_KM = 1.0
    DEFAULT_TIMEOUT = 5
    MAX_CAMERAS = 15
    MAX_ROUTE_POINTS = 5

    def __init__(
        self,
        radius_km: float = DEFAULT_RADIUS_KM,
        timeout: int = DEFAULT_TIMEOUT,
    ):
        self.radius_km = radius_km
        self.timeout = timeout

        self.api_key = os.getenv(
            "ROAD_511"
        )

        self.session = requests.Session()

        self.session.headers.update(
            {
                "User-Agent": "ThermoRoute/1.0",
                "Accept": "application/json",
            }
        )

    def get_nearby_cameras(
        self,
        lat: float,
        lon: float,
        jurisdiction: str,
        radius_km: float | None = None,
    ) -> list[dict[str, Any]]:
        if not self.api_key:
            print(
                "CAMERA_API_KEY is not configured"
            )
            return []

        if not jurisdiction:
            print(
                "Road511 jurisdiction is required"
            )
            return []

        radius_km = (
            radius_km
            if radius_km is not None
            else self.radius_km
        )

        params = {
            "type": "cameras",
            "jurisdiction": jurisdiction,
            "lat": lat,
            "lng": lon,
            "radius_km": radius_km,
            "limit": self.MAX_CAMERAS,
        }

        headers = {
            "X-API-Key": self.api_key,
        }

        try:
            response = self.session.get(
                self.BASE_URL,
                params=params,
                headers=headers,
                timeout=self.timeout,
            )

            response.raise_for_status()

            data = response.json()

            return self._parse_cameras(data)

        except requests.exceptions.Timeout:
            print(
                "Road511 camera API timeout"
            )
            return []

        except requests.exceptions.ConnectionError as exc:
            print(
                f"Road511 camera API connection error: {exc}"
            )
            return []

        except requests.exceptions.HTTPError as exc:
            print(
                f"Road511 camera API error: {exc}"
            )

            if response is not None:
                print(
                    f"Road511 response status: "
                    f"{response.status_code}"
                )

                try:
                    print(
                        f"Road511 response body: "
                        f"{response.text}"
                    )
                except Exception:
                    pass

            return []

        except requests.exceptions.RequestException as exc:
            print(
                f"Road511 camera API request error: {exc}"
            )
            return []

        except ValueError:
            print(
                "Road511 camera API returned invalid JSON"
            )
            return []

    def get_cameras_for_route(
        self,
        route: dict[str, Any],
        jurisdiction: str,
        radius_km: float | None = None,
    ) -> list[dict[str, Any]]:
        if not jurisdiction:
            return []

        geometry = route.get(
            "geometry"
        )

        if not geometry:
            return []

        coordinates = geometry.get(
            "coordinates",
            [],
        )

        if not coordinates:
            return []

        route_points = self._sample_route_points(
            coordinates,
            max_points=self.MAX_ROUTE_POINTS,
        )

        cameras = []
        seen = set()

        for point_index, coordinate in enumerate(
            route_points
        ):
            if (
                not isinstance(
                    coordinate,
                    (list, tuple),
                )
                or len(coordinate) < 2
            ):
                continue

            lon = coordinate[0]
            lat = coordinate[1]

            nearby_cameras = (
                self.get_nearby_cameras(
                    lat=lat,
                    lon=lon,
                    jurisdiction=jurisdiction,
                    radius_km=radius_km,
                )
            )

            for camera in nearby_cameras:
                key = self._camera_key(
                    camera
                )

                if key in seen:
                    continue

                seen.add(key)

                camera["route_id"] = route.get(
                    "id"
                )

                camera["route_point_index"] = (
                    point_index
                )

                cameras.append(camera)

                if len(cameras) >= self.MAX_CAMERAS:
                    return cameras

        return cameras

    def get_cameras_for_routes(
        self,
        routes: list[dict[str, Any]],
        jurisdiction: str,
        radius_km: float | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        result = {}

        for route in routes:
            route_id = route.get(
                "id"
            )

            if not route_id:
                continue

            result[route_id] = (
                self.get_cameras_for_route(
                    route=route,
                    jurisdiction=jurisdiction,
                    radius_km=radius_km,
                )
            )

        return result

    @staticmethod
    def _camera_key(
        camera: dict[str, Any],
    ):
        camera_id = camera.get(
            "id"
        )

        if camera_id:
            return (
                "id",
                str(camera_id),
            )

        lat = camera.get(
            "lat"
        )

        lon = camera.get(
            "lon"
        )

        if (
            lat is not None
            and lon is not None
        ):
            return (
                "coordinates",
                round(float(lat), 6),
                round(float(lon), 6),
            )

        return (
            "camera",
            camera.get("name"),
            camera.get("road_name"),
        )

    @classmethod
    def _parse_cameras(
        cls,
        data: Any,
    ) -> list[dict[str, Any]]:
        if isinstance(data, list):
            items = data

        elif isinstance(data, dict):
            items = (
                data.get("features")
                or data.get("cameras")
                or data.get("data")
                or []
            )

        else:
            return []

        if not isinstance(
            items,
            list,
        ):
            return []

        cameras = []

        for item in items:
            if not isinstance(
                item,
                dict,
            ):
                continue

            camera = cls._normalize_camera(
                item
            )

            if camera is None:
                continue

            cameras.append(camera)

            if len(cameras) >= cls.MAX_CAMERAS:
                break

        return cameras

    @staticmethod
    def _normalize_camera(
        item: dict[str, Any],
    ) -> dict[str, Any] | None:
        properties = item.get(
            "properties",
            {},
        )

        if not isinstance(
            properties,
            dict,
        ):
            properties = {}

        geometry = item.get(
            "geometry",
            {},
        )

        if not isinstance(
            geometry,
            dict,
        ):
            geometry = {}

        coordinates = geometry.get(
            "coordinates",
            [],
        )

        lat = (
            item.get("lat")
            or item.get("latitude")
            or properties.get("lat")
            or properties.get("latitude")
        )

        lon = (
            item.get("lon")
            or item.get("lng")
            or item.get("longitude")
            or properties.get("lon")
            or properties.get("lng")
            or properties.get("longitude")
        )

        if (
            lat is None
            or lon is None
        ):
            if (
                isinstance(
                    coordinates,
                    list,
                )
                and len(coordinates) >= 2
            ):
                lon = coordinates[0]
                lat = coordinates[1]

        if (
            lat is None
            or lon is None
        ):
            return None

        camera_id = (
            item.get("id")
            or properties.get("id")
        )

        name = (
            item.get("name")
            or properties.get("name")
            or properties.get("description")
            or "Traffic Camera"
        )

        return {
            "id": camera_id,
            "type": "camera",
            "name": name,
            "lat": float(lat),
            "lon": float(lon),
            "road_name": (
                item.get("road_name")
                or item.get("roadway")
                or properties.get("road_name")
                or properties.get("roadway")
            ),
            "direction": (
                item.get("direction")
                or properties.get("direction")
            ),
            "image_url": (
                item.get("image_url")
                or item.get("image")
                or properties.get("image_url")
                or properties.get("image")
            ),
            "stream_url": (
                item.get("stream_url")
                or properties.get("stream_url")
            ),
            "source": (
                item.get("source")
                or properties.get("source")
                or "Road511"
            ),
        }

    @staticmethod
    def _sample_route_points(
        coordinates: list,
        max_points: int,
    ) -> list:
        if not coordinates:
            return []

        if len(coordinates) <= max_points:
            return coordinates

        if max_points == 1:
            return [coordinates[0]]

        indexes = [
            round(
                i * (len(coordinates) - 1)
                / (max_points - 1)
            )
            for i in range(max_points)
        ]

        return [
            coordinates[index]
            for index in indexes
        ]
