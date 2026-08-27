import math


class RouteSamplingService:
    DEFAULT_SPACING_METERS = 2000
    MIN_POINTS = 2
    MAX_POINTS = 6

    def sample_route(
        self,
        route: dict,
        spacing_meters: int = DEFAULT_SPACING_METERS,
    ) -> list[dict]:
        geometry = route.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []

        if len(coordinates) < 2:
            return []

        cumulative_distances = self._cumulative_distances(coordinates)
        total_distance = cumulative_distances[-1]

        target_count = max(
            self.MIN_POINTS,
            math.ceil(total_distance / max(spacing_meters, 1)) + 1,
        )
        target_count = min(target_count, self.MAX_POINTS)

        targets = self._build_targets(total_distance, target_count)
        samples = []

        for target_distance in targets:
            index = self._find_segment(
                cumulative_distances,
                target_distance,
            )

            if index >= len(coordinates) - 1:
                index = len(coordinates) - 2

            start_distance = cumulative_distances[index]
            end_distance = cumulative_distances[index + 1]
            segment_distance = end_distance - start_distance

            fraction = 0.0
            if segment_distance > 0:
                fraction = (
                    target_distance - start_distance
                ) / segment_distance

            start = coordinates[index]
            end = coordinates[index + 1]

            lon = float(start[0]) + (float(end[0]) - float(start[0])) * fraction
            lat = float(start[1]) + (float(end[1]) - float(start[1])) * fraction

            cumulative_duration = self._estimate_duration(
                route,
                target_distance,
                total_distance,
            )

            samples.append(
                {
                    "lat": lat,
                    "lon": lon,
                    "distance_from_origin_m": round(target_distance, 2),
                    "cumulative_duration_seconds": round(
                        cumulative_duration,
                        2,
                    ),
                }
            )

        return samples

    @staticmethod
    def _estimate_duration(
        route: dict,
        target_distance: float,
        total_distance: float,
    ) -> float:
        duration_seconds = float(route.get("duration_seconds") or 0)
        if duration_seconds <= 0:
            duration_seconds = float(route.get("duration") or 0)

        if duration_seconds <= 0 or total_distance <= 0:
            return 0.0

        return duration_seconds * (target_distance / total_distance)

    @staticmethod
    def _build_targets(total_distance: float, count: int) -> list[float]:
        if count <= 1:
            return [0.0]

        step = total_distance / (count - 1)
        return [i * step for i in range(count)]

    @classmethod
    def _cumulative_distances(cls, coordinates: list) -> list[float]:
        distances = [0.0]

        for index in range(1, len(coordinates)):
            previous = coordinates[index - 1]
            current = coordinates[index]
            distances.append(
                distances[-1]
                + cls._haversine_distance(
                    previous[1],
                    previous[0],
                    current[1],
                    current[0],
                )
            )

        return distances

    @staticmethod
    def _find_segment(
        cumulative_distances: list[float],
        target_distance: float,
    ) -> int:
        for index in range(1, len(cumulative_distances)):
            if cumulative_distances[index] >= target_distance:
                return index - 1

        return max(len(cumulative_distances) - 2, 0)

    @staticmethod
    def _haversine_distance(
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        radius = 6371000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2) ** 2
            + math.cos(phi1)
            * math.cos(phi2)
            * math.sin(delta_lambda / 2) ** 2
        )

        return 2 * radius * math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a),
        )
