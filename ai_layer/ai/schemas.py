from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Any


class AIResponseStatus(Enum):

    SUCCESS = "SUCCESS"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    INVALID_INPUT = "INVALID_INPUT"
    API_FAILURE = "API_FAILURE"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class RiskLevel(Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"
    EXTREME = "EXTREME"


class Decision(Enum):
    RECOMMEND = "RECOMMEND"
    CAUTION = "CAUTION"
    AVOID = "AVOID"


@dataclass
class TripInput:
    origin: str
    destination: str
    departure_time: Optional[str] = None
    vehicle_type: Optional[str] = None


@dataclass
class RouteInput:
    id: str
    name: str
    distance_km: float
    duration_min: float
    geometry: list[dict] = field(default_factory=list)
    road_identifiers: list[str] = field(default_factory=list)


@dataclass
class WeatherInput:
    temperature_c: float
    humidity_percent: float
    heat_index_c: float
    wind_speed_kmh: float
    condition: str
    time: str


@dataclass
class HeatInput:
    temperature: float
    heat_index: float
    exposure_time_min: float
    risk_level: str


@dataclass
class POIInput:
    poi_type: str
    name: str
    distance_from_route_km: float
    is_available: bool


@dataclass
class RoadConditionInput:
    segment_id: str
    road_name: str
    condition: str
    severity: Optional[int] = None


@dataclass
class RouteScoreInput:
    route_id: str
    heat_risk_score: float
    comfort_score: float
    exposure_time_min: float
    overall_score: float
    risk_level: str


@dataclass
class CameraInput:
    camera_id: str
    location: str
    stream_url: str
    is_available: bool


@dataclass
class AIContext:
    trip: TripInput
    candidate_routes: list[RouteInput]
    selected_route: Optional[RouteInput] = None
    risk_scores: dict[str, RouteScoreInput] = field(default_factory=dict)
    forecast: list[WeatherInput] = field(default_factory=list)
    heat: dict[str, HeatInput] = field(default_factory=dict)
    road_conditions: list[RoadConditionInput] = field(default_factory=list)
    rest_stops: list[POIInput] = field(default_factory=list)
    gas_stations: list[POIInput] = field(default_factory=list)
    charging_stations: list[POIInput] = field(default_factory=list)
    emergency_locations: list[POIInput] = field(default_factory=list)
    cameras: list[CameraInput] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
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
        if not self.candidate_routes:
            return False, "No candidate routes provided"

        if not self.trip.origin or not self.trip.destination:
            return False, "Origin and destination are required"

        if not self.risk_scores:
            return False, "No risk scores provided"

        route_ids = {r.id for r in self.candidate_routes}
        score_ids = set(self.risk_scores.keys())
        missing = route_ids - score_ids
        if missing:
            return False, f"Missing risk scores for routes: {missing}"

        return True, None


@dataclass
class TravelExplanationOutput:
    status: str
    headline: str
    summary: str
    details: list[str]
    tips: list[str]
    good_to_go: bool = False
    best_departure_times: list[str] = field(default_factory=list)
    model_used: Optional[str] = None
    latency_ms: Optional[float] = None
    tokens_used: Optional[dict[str, int]] = None

    def to_dict(self) -> dict[str, Any]:
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
