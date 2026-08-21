"""
Section 6: Shared AI Context Builder

Builds the AIContext object from deterministic services output.

No API calls. No database queries. Pure transformation of existing data.
"""
from typing import Optional, Any

from .schemas import (
    AIContext,
    TripInput,
    RouteInput,
    WeatherInput,
    HeatInput,
    POIInput,
    RoadConditionInput,
    RouteScoreInput,
    CameraInput,
)


class ContextBuilder:
    """
    Builds AIContext from service outputs.

    Section 6: Every AI request receives exactly one context object.
    """

    def build(self, data: dict[str, Any]) -> AIContext:
        """
        Build AIContext from raw data.

        Args:
            data: Dictionary containing all required data from services

        Returns:
            Validated AIContext

        Raises:
            ValidationError: If required data is missing
        """
        # Extract trip data
        trip_data = data.get("trip", {})
        trip = TripInput(
            origin=trip_data.get("origin", ""),
            destination=trip_data.get("destination", ""),
            departure_time=trip_data.get("departure_time"),
            vehicle_type=trip_data.get("vehicle_type"),
        )

        # Extract routes
        routes_data = data.get("routes", [])
        candidate_routes = [
            self._build_route_input(r) for r in routes_data
        ]

        # Extract selected route if provided
        selected_route = None
        if data.get("selected_route"):
            selected_route = self._build_route_input(data["selected_route"])

        # Extract risk scores
        risk_scores = {}
        for route_id, score_data in data.get("risk_scores", {}).items():
            risk_scores[route_id] = RouteScoreInput(
                route_id=route_id,
                heat_risk_score=score_data.get("heat_risk_score", 0.0),
                comfort_score=score_data.get("comfort_score", 0.0),
                exposure_time_min=score_data.get("exposure_time_min", 0.0),
                overall_score=score_data.get("overall_score", 0.0),
                risk_level=score_data.get("risk_level", "UNKNOWN"),
            )

        # Extract weather forecast
        forecast = []
        for w_data in data.get("forecast", []):
            forecast.append(WeatherInput(
                temperature_c=w_data.get("temperature_c", 0.0),
                humidity_percent=w_data.get("humidity_percent", 0.0),
                heat_index_c=w_data.get("heat_index_c", 0.0),
                wind_speed_kmh=w_data.get("wind_speed_kmh", 0.0),
                condition=w_data.get("condition", "unknown"),
                time=w_data.get("time", ""),
            ))

        # Extract heat data
        heat = {}
        for route_id, heat_data in data.get("heat", {}).items():
            heat[route_id] = HeatInput(
                temperature=heat_data.get("temperature", 0.0),
                heat_index=heat_data.get("heat_index", 0.0),
                exposure_time_min=heat_data.get("exposure_time_min", 0.0),
                risk_level=heat_data.get("risk_level", "UNKNOWN"),
            )

        # Extract road conditions
        road_conditions = []
        for rc_data in data.get("road_conditions", []):
            road_conditions.append(RoadConditionInput(
                segment_id=rc_data.get("segment_id", ""),
                road_name=rc_data.get("road_name", ""),
                condition=rc_data.get("condition", "unknown"),
                severity=rc_data.get("severity"),
            ))

        # Extract POIs
        rest_stops = [
            self._build_poi_input(poi, "rest_stop")
            for poi in data.get("rest_stops", [])
        ]
        gas_stations = [
            self._build_poi_input(poi, "gas_station")
            for poi in data.get("gas_stations", [])
        ]
        charging_stations = [
            self._build_poi_input(poi, "charging_station")
            for poi in data.get("charging_stations", [])
        ]
        emergency_locations = [
            self._build_poi_input(poi, "emergency")
            for poi in data.get("emergency_locations", [])
        ]

        # Extract cameras
        cameras = []
        for cam_data in data.get("cameras", []):
            cameras.append(CameraInput(
                camera_id=cam_data.get("camera_id", ""),
                location=cam_data.get("location", ""),
                stream_url=cam_data.get("stream_url", ""),
                is_available=cam_data.get("is_available", False),
            ))

        context = AIContext(
            trip=trip,
            candidate_routes=candidate_routes,
            selected_route=selected_route,
            risk_scores=risk_scores,
            forecast=forecast,
            heat=heat,
            road_conditions=road_conditions,
            rest_stops=rest_stops,
            gas_stations=gas_stations,
            charging_stations=charging_stations,
            emergency_locations=emergency_locations,
            cameras=cameras,
        )

        # Validate context
        is_valid, error = context.validate()
        if not is_valid:
            from exceptions import ValidationError
            raise ValidationError(f"Invalid context: {error}")

        return context

    def _build_route_input(self, data: dict[str, Any]) -> RouteInput:
        """Build RouteInput from dict."""
        return RouteInput(
            id=data.get("id", ""),
            name=data.get("name", ""),
            distance_km=data.get("distance_km", 0.0),
            duration_min=data.get("duration_min", 0.0),
            geometry=data.get("geometry", []),
            road_identifiers=data.get("road_identifiers", []),
        )

    def _build_poi_input(self, data: dict[str, Any], poi_type: str) -> POIInput:
        """Build POIInput from dict."""
        return POIInput(
            poi_type=poi_type,
            name=data.get("name", ""),
            distance_from_route_km=data.get("distance_from_route_km", 0.0),
            is_available=data.get("is_available", True),
        )

    def calculate_confidence(self, context: AIContext) -> float:
        """
        Calculate confidence score based on data completeness.

        Section 9: Confidence reflects completeness of input data.

        Scoring:
        - Full route data: +0.3
        - Risk scores for all routes: +0.3
        - Weather forecast: +0.2
        - POI data (rest stops, gas): +0.2
        """
        confidence = 0.0

        # Check route data (30%)
        if context.candidate_routes:
            has_complete_routes = all(
                r.distance_km > 0 and r.duration_min > 0
                for r in context.candidate_routes
            )
            if has_complete_routes:
                confidence += 0.3

        # Check risk scores (30%)
        route_ids = {r.id for r in context.candidate_routes}
        score_ids = set(context.risk_scores.keys())
        if route_ids == score_ids and context.risk_scores:
            confidence += 0.3

        # Check weather forecast (20%)
        if context.forecast:
            has_forecast_data = all(
                w.temperature_c > 0 for w in context.forecast
            )
            if has_forecast_data:
                confidence += 0.2

        # Check POI data (20%)
        if context.rest_stops or context.gas_stations:
            confidence += 0.2

        # Round to 2 decimal places
        return round(confidence, 2)


def build_ai_context(data: dict[str, Any]) -> AIContext:
    """
    Convenience function to build AIContext.

    Args:
        data: Raw data from deterministic services

    Returns:
        Validated AIContext
    """
    builder = ContextBuilder()
    return builder.build(data)


def calculate_confidence(context: AIContext) -> float:
    """
    Convenience function to calculate confidence.

    Args:
        context: Validated AIContext

    Returns:
        Confidence score (0.0 to 1.0)
    """
    builder = ContextBuilder()
    return builder.calculate_confidence(context)