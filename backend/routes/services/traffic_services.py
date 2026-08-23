from typing import Any
import os
import requests


class TrafficService:
    FLOW_URL = (
        "https://api.tomtom.com/traffic/services/4/flowSegmentData/"
        "absolute/10/json"
    )

    INCIDENTS_URL = (
        "https://api.tomtom.com/traffic/services/5/incidentDetails"
    )

    DEFAULT_TIMEOUT = 5

    def __init__(self, timeout: int = DEFAULT_TIMEOUT):
        self.timeout = timeout
        self.api_key = os.getenv("TOMTOM_API_KEY")

        self.session = requests.Session()

        self.session.headers.update(
            {
                "User-Agent": "ThermoRoute/1.0",
                "Accept": "application/json",
            }
        )

    def get_traffic(
        self,
        lat: float,
        lon: float,
    ) -> dict[str, Any]:

        if not self.api_key:
            return self._empty_result(
                "TOMTOM_API_KEY is not configured"
            )

        flow = self._get_flow(
            lat=lat,
            lon=lon,
        )

        incidents = self._get_incidents(
            lat=lat,
            lon=lon,
        )

        if not flow.get("success"):
            result = self._empty_result(
                flow.get("error")
            )

            result["incidents"] = incidents.get(
                "incidents",
                [],
            )

            return result

        flow_data = flow["data"]

        current_speed = flow_data.get(
            "current_speed"
        )

        free_flow_speed = flow_data.get(
            "free_flow_speed"
        )

        congestion = self._calculate_congestion(
            current_speed=current_speed,
            free_flow_speed=free_flow_speed,
        )

        traffic_score = self._calculate_traffic_score(
            congestion=congestion
        )

        traffic_level = self._get_traffic_level(
            traffic_score
        )

        return {
            "success": True,
            "traffic_level": traffic_level,
            "traffic_score": traffic_score,
            "congestion": congestion,
            "current_speed": current_speed,
            "free_flow_speed": free_flow_speed,
            "current_travel_time": flow_data.get(
                "current_travel_time"
            ),
            "free_flow_travel_time": flow_data.get(
                "free_flow_travel_time"
            ),
            "confidence": flow_data.get(
                "confidence"
            ),
            "incidents": incidents.get(
                "incidents",
                [],
            ),
        }

    def _get_flow(
        self,
        lat: float,
        lon: float,
    ) -> dict[str, Any]:

        params = {
            "point": f"{lat},{lon}",
            "key": self.api_key,
        }

        try:
            response = self.session.get(
                self.FLOW_URL,
                params=params,
                timeout=self.timeout,
            )

            response.raise_for_status()

            data = response.json()

            flow = data.get(
                "flowSegmentData",
                {},
            )

            return {
                "success": True,
                "data": {
                    "current_speed": flow.get(
                        "currentSpeed"
                    ),
                    "free_flow_speed": flow.get(
                        "freeFlowSpeed"
                    ),
                    "current_travel_time": flow.get(
                        "currentTravelTime"
                    ),
                    "free_flow_travel_time": flow.get(
                        "freeFlowTravelTime"
                    ),
                    "confidence": flow.get(
                        "confidence"
                    ),
                },
            }

        except requests.RequestException as exc:
            print(
                f"TomTom Traffic Flow error: {exc}"
            )

            return {
                "success": False,
                "error": str(exc),
            }

        except ValueError as exc:
            print(
                f"TomTom Traffic Flow invalid JSON: {exc}"
            )

            return {
                "success": False,
                "error": str(exc),
            }

    def _get_incidents(
        self,
        lat: float,
        lon: float,
    ) -> dict[str, Any]:

        delta = 0.01

        min_lat = lat - delta
        min_lon = lon - delta

        max_lat = lat + delta
        max_lon = lon + delta

        params = {
            "key": self.api_key,
            "bbox": (
                f"{min_lon},{min_lat},"
                f"{max_lon},{max_lat}"
            ),
            "fields": (
                "{incidents{"
                "type,"
                "properties{"
                "id,"
                "iconCategory,"
                "magnitudeOfDelay,"
                "startTime,"
                "endTime,"
                "from,"
                "to,"
                "length,"
                "delay,"
                "roadNumbers,"
                "timeValidity,"
                "probabilityOfOccurrence,"
                "numberOfReports,"
                "lastReportTime"
                "}"
                "}}"
            ),
            "language": "en-GB",
            "timeValidityFilter": "present",
        }

        try:
            response = self.session.get(
                self.INCIDENTS_URL,
                params=params,
                timeout=self.timeout,
            )

            if not response.ok:
                print(
                    "TomTom Traffic Incidents response:"
                )
                print(response.status_code)
                print(response.text)

            response.raise_for_status()

            data = response.json()

            incidents = data.get(
                "incidents",
                [],
            )

            return {
                "success": True,
                "incidents": self._parse_incidents(
                    incidents
                ),
            }

        except requests.RequestException as exc:
            print(
                f"TomTom Traffic Incidents error: {exc}"
            )

            return {
                "success": False,
                "incidents": [],
                "error": str(exc),
            }

        except ValueError as exc:
            print(
                "TomTom Traffic Incidents "
                f"invalid JSON: {exc}"
            )

            return {
                "success": False,
                "incidents": [],
                "error": str(exc),
            }

    @staticmethod
    def _parse_incidents(
        incidents: list,
    ) -> list[dict[str, Any]]:

        result = []

        for incident in incidents:
            properties = incident.get(
                "properties",
                {},
            )

            result.append(
                {
                    "id": properties.get(
                        "id"
                    ),
                    "type": incident.get(
                        "type"
                    ),
                    "icon_category": properties.get(
                        "iconCategory"
                    ),
                    "magnitude": properties.get(
                        "magnitudeOfDelay"
                    ),
                    "delay_seconds": properties.get(
                        "delay"
                    ),
                    "length_meters": properties.get(
                        "length"
                    ),
                    "start_time": properties.get(
                        "startTime"
                    ),
                    "end_time": properties.get(
                        "endTime"
                    ),
                    "from": properties.get(
                        "from"
                    ),
                    "to": properties.get(
                        "to"
                    ),
                    "road_numbers": properties.get(
                        "roadNumbers",
                        [],
                    ),
                    "time_validity": properties.get(
                        "timeValidity"
                    ),
                    "probability_of_occurrence": (
                        properties.get(
                            "probabilityOfOccurrence"
                        )
                    ),
                    "number_of_reports": (
                        properties.get(
                            "numberOfReports"
                        )
                    ),
                    "last_report_time": (
                        properties.get(
                            "lastReportTime"
                        )
                    ),
                }
            )

        return result

    @staticmethod
    def _calculate_congestion(
        current_speed: float | None,
        free_flow_speed: float | None,
    ) -> float:

        if not current_speed or not free_flow_speed:
            return 0.0

        if free_flow_speed <= 0:
            return 0.0

        ratio = (
            current_speed
            / free_flow_speed
        )

        congestion = 1.0 - ratio

        return round(
            max(
                0.0,
                min(
                    1.0,
                    congestion,
                ),
            ),
            3,
        )

    @staticmethod
    def _calculate_traffic_score(
        congestion: float,
    ) -> int:

        return round(
            congestion * 100
        )

    @staticmethod
    def _get_traffic_level(
        score: int,
    ) -> str:

        if score < 20:
            return "LOW"

        if score < 40:
            return "MODERATE"

        if score < 60:
            return "HIGH"

        if score < 80:
            return "VERY_HIGH"

        return "EXTREME"

    @staticmethod
    def _empty_result(
        error: str | None = None,
    ) -> dict[str, Any]:

        return {
            "success": False,
            "traffic_level": "UNKNOWN",
            "traffic_score": 0,
            "congestion": 0.0,
            "current_speed": None,
            "free_flow_speed": None,
            "current_travel_time": None,
            "free_flow_travel_time": None,
            "confidence": None,
            "incidents": [],
            "error": error,
        }
