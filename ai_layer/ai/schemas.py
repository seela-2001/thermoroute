"""
AI Layer Schemas

Defines all input/output structures for AI agents.
Ensures type safety and clear contracts.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Any


class AIResponseStatus(Enum):
    """Section 10: Error Handling statuses."""

    SUCCESS = "SUCCESS"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    INVALID_INPUT = "INVALID_INPUT"
    API_FAILURE = "API_FAILURE"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class RiskLevel(Enum):
    """Risk classification levels."""
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"
    EXTREME = "EXTREME"


class Decision(Enum):
    """Recommendation decisions."""
    RECOMMEND = "RECOMMEND"
    CAUTION = "CAUTION"
    AVOID = "AVOID"


# ==================== INPUT SCHEMAS ====================

@dataclass
class TripInput:
    """Trip information."""
    origin: str
    destination: str
    departure_time: Optional[str] = None
    vehicle_type: Optional[str] = None


@dataclass
class RouteInput:
    """Route information."""
    id: str
    name: str
    distance_km: float
    duration_min: float
    geometry: list[dict] = field(default_factory=list)
    road_identifiers: list[str] = field(default_factory=list)


@dataclass
class WeatherInput:
    """Weather forecast data."""
    temperature_c: float
    humidity_percent: float
    heat_index_c: float
    wind_speed_kmh: float
    condition: str
    time: str


@dataclass
class HeatInput:
    """Heat risk data from FortyGuard."""
    temperature: float
    heat_index: float
    exposure_time_min: float
    risk_level: str


@dataclass
class POIInput:
    """Points of Interest along route."""
    poi_type: str  # "rest_stop", "gas_station", "charging_station", "food", "emergency"
    name: str
    distance_from_route_km: float
    is_available: bool


@dataclass
class RoadConditionInput:
    """Road condition data."""
    segment_id: str
    road_name: str
    condition: str  # "clear", "construction", "congestion", "incident"
    severity: Optional[int] = None  # 1-5


@dataclass
class RouteScoreInput:
    """Score data for a route."""
    route_id: str
    heat_risk_score: float
    comfort_score: float
    exposure_time_min: float
    overall_score: float
    risk_level: str


@dataclass
class CameraInput:
    """Traffic camera data."""
    camera_id: str
    location: str
    stream_url: str
    is_available: bool


# ==================== SHARED AI CONTEXT ====================

@dataclass
class AIContext:
    """
    Shared AI Context

    Every AI request receives exactly one context object.
    Contains all data needed for AI to reason - no API calls needed.
    """
    # Trip information
    trip: TripInput

    # Route data
    candidate_routes: list[RouteInput]

    # Selected route (from recommendation engine)
    selected_route: Optional[RouteInput] = None

    # Risk scores
    risk_scores: dict[str, RouteScoreInput] = field(default_factory=dict)

    # Weather forecast
    forecast: list[WeatherInput] = field(default_factory=list)

    # Heat data
    heat: dict[str, HeatInput] = field(default_factory=dict)

    # Road conditions
    road_conditions: list[RoadConditionInput] = field(default_factory=list)

    # Points of interest
    rest_stops: list[POIInput] = field(default_factory=list)
    gas_stations: list[POIInput] = field(default_factory=list)
    charging_stations: list[POIInput] = field(default_factory=list)
    emergency_locations: list[POIInput] = field(default_factory=list)

    # Traffic cameras
    cameras: list[CameraInput] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {
            "trip": {
                "origin": self.trip.origin,
                "destination": self.trip.destination,
                "departure_time": self.trip.departure_time,
                "vehicle_type": self.trip.vehicle_type,
            },
            "candidate_routes": [
                {
                    "id": r.id,
                    "name": r.name,
                    "distance_km": r.distance_km,
                    "duration_min": r.duration_min,
                    "road_identifiers": r.road_identifiers,
                }
                for r in self.candidate_routes
            ],
            "selected_route": {
                "id": self.selected_route.id,
                "name": self.selected_route.name,
                "distance_km": self.selected_route.distance_km,
                "duration_min": self.selected_route.duration_min,
            } if self.selected_route else None,
            "risk_scores": {
                rid: {
                    "heat_risk_score": rs.heat_risk_score,
                    "comfort_score": rs.comfort_score,
                    "exposure_time_min": rs.exposure_time_min,
                    "overall_score": rs.overall_score,
                    "risk_level": rs.risk_level,
                }
                for rid, rs in self.risk_scores.items()
            },
            "forecast": [
                {
                    "temperature_c": w.temperature_c,
                    "humidity_percent": w.humidity_percent,
                    "heat_index_c": w.heat_index_c,
                    "wind_speed_kmh": w.wind_speed_kmh,
                    "condition": w.condition,
                    "time": w.time,
                }
                for w in self.forecast
            ],
            "heat": {
                rid: {
                    "temperature": h.temperature,
                    "heat_index": h.heat_index,
                    "exposure_time_min": h.exposure_time_min,
                    "risk_level": h.risk_level,
                }
                for rid, h in self.heat.items()
            },
            "road_conditions": [
                {
                    "segment_id": rc.segment_id,
                    "road_name": rc.road_name,
                    "condition": rc.condition,
                    "severity": rc.severity,
                }
                for rc in self.road_conditions
            ],
            "rest_stops": [
                {
                    "name": rs.name,
                    "distance_from_route_km": rs.distance_from_route_km,
                    "is_available": rs.is_available,
                }
                for rs in self.rest_stops
            ],
            "gas_stations": [
                {
                    "name": gs.name,
                    "distance_from_route_km": gs.distance_from_route_km,
                    "is_available": gs.is_available,
                }
                for gs in self.gas_stations
            ],
            "cameras": [
                {
                    "camera_id": c.camera_id,
                    "location": c.location,
                    "is_available": c.is_available,
                }
                for c in self.cameras
            ],
        }

    def validate(self) -> tuple[bool, Optional[str]]:
        """
        Validate context completeness.

        Returns:
            (is_valid, error_message)
        """
        if not self.candidate_routes:
            return False, "No candidate routes provided"

        if not self.trip.origin or not self.trip.destination:
            return False, "Origin and destination are required"

        if not self.risk_scores:
            return False, "No risk scores provided"

        # Check risk scores match routes
        route_ids = {r.id for r in self.candidate_routes}
        score_ids = set(self.risk_scores.keys())
        missing = route_ids - score_ids
        if missing:
            return False, f"Missing risk scores for routes: {missing}"

        return True, None


# ==================== OUTPUT SCHEMAS ====================

@dataclass
class TravelExplanationOutput:
    """
    Travel Explanation Agent Output

    Natural language explanation for UX.
    Converts structured analysis to human-friendly text.
    """
    status: str  # AIResponseStatus value
    headline: str
    summary: str
    details: list[str]
    tips: list[str]

    # Travel timing decision
    good_to_go: bool = False  # Whether current time is safe to travel
    best_departure_times: list[str] = field(default_factory=list)  # Times with LOW risk in 12-hr window

    # Observability
    model_used: Optional[str] = None
    latency_ms: Optional[float] = None
    tokens_used: Optional[dict[str, int]] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {
            "status": self.status,
            "headline": self.headline,
            "summary": self.summary,
            "details": self.details,
            "tips": self.tips,
            "good_to_go": self.good_to_go,
            "best_departure_times": self.best_departure_times,
            "model_used": self.model_used,
            "latency_ms": self.latency_ms,
            "tokens_used": self.tokens_used,
        }