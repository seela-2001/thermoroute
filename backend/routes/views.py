import asyncio
import logging
import os
from rest_framework.views import APIView

logger = logging.getLogger(__name__)
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .serializers import RouteAnalysisRequestSerializer
from .services.route_analysis_service import RouteAnalysisService
from .services.location_services import LocationService


_RISK_ORDER = {"EXTREME": 4, "HIGH": 3, "MODERATE": 2, "LOW": 1, "UNKNOWN": 0}


class RouteAnalysisView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RouteAnalysisRequestSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )
        data = serializer.validated_data
        data = self._resolve_text_endpoints(data)

        if isinstance(data, Response):
            return data

        service = RouteAnalysisService()
        result = service.analyze(
            origin_lat=data["origin_lat"],
            origin_lng=data["origin_lng"],
            destination_lat=data["destination_lat"],
            destination_lng=data["destination_lng"],
            jurisdiction=data["jurisdiction"],
            departure_start=data.get(
                "departure_start"
            ),
            departure_end=data.get(
                "departure_end"
            ),
            step_minutes=data.get(
                "step_minutes",
                30,
            ),
            weather_weight=data.get(
                "weather_weight",
                0.7,
            ),
            time_weight=data.get(
                "time_weight",
                0.3,
            ),
            traffic_aware=data.get(
                "traffic_aware",
                False,
            ),
        )

        if not result.get("success"):
            return Response(
                {
                    "status": "error",
                    "errors": result.get(
                        "errors",
                        [],
                    ),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        recommendation = self._generate_recommendation(result, data)

        return Response(
            {
                "status": "success",
                "recommended_route_id": result.get(
                    "recommended_route_id"
                ),
                "routes_count": result.get(
                    "routes_count",
                    0,
                ),
                "weights": result.get(
                    "weights",
                    {},
                ),
                "departure_count": result.get(
                    "departure_count",
                    0,
                ),
                "best_departure": result.get(
                    "best_departure"
                ),
                "departure_recommendations": result.get(
                    "departure_recommendations",
                    [],
                ),
                "routes": result.get(
                    "routes",
                    [],
                ),
                "alternatives": result.get(
                    "alternatives",
                    [],
                ),
                "recommendation": recommendation,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _generate_recommendation(result: dict, data: dict) -> dict | None:
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key:
            return None
        try:
            from ai.context_builder import build_ai_context
            from ai.agents.travel_explanation_agent import TravelExplanationAgent
            from ai.agents.stop_suggester_agent import StopSuggesterAgent
            from ai.providers.openrouter import OpenRouterProvider
            from ai.schemas import AIResponseStatus

            context_data = RouteAnalysisView._build_context_dict(result, data)
            context = build_ai_context(context_data)

            provider = OpenRouterProvider(api_key=api_key)
            agent = TravelExplanationAgent(llm_provider=provider)

            loop = asyncio.new_event_loop()
            try:
                output = loop.run_until_complete(agent.explain(context))
            finally:
                loop.close()

            if output.status != AIResponseStatus.SUCCESS.value:
                return None

            decision = RouteAnalysisView._derive_decision(
                output.good_to_go, context_data
            )
            alerts = RouteAnalysisView._build_alerts(result)

            rec_route_id = result.get("recommended_route_id")
            best_pois: list[dict] = []
            best_heat: list[dict] = []
            for route in result.get("routes", []):
                if route.get("id") == rec_route_id:
                    best_pois = route.get("pois", [])
                    scored = [
                        e for e in route.get("evaluations", [])
                        if e.get("route_score") is not None
                    ]
                    best_eval = min(scored, key=lambda e: e["route_score"], default=None)
                    if best_eval:
                        best_heat = best_eval.get("heat_data", [])
                    break

            cooling_stops = StopSuggesterAgent().suggest(best_heat, best_pois)

            return {
                "headline": output.headline,
                "decision": decision,
                "reason": output.summary,
                "key_factors": list(output.details) if output.details else [],
                "safety_tip": output.tips[0] if output.tips else "",
                "best_departure_times": list(output.best_departure_times) if output.best_departure_times else [],
                "alerts": alerts,
                "cooling_stops": cooling_stops,
            }
        except Exception as exc:
            logger.error("AI recommendation failed: %s", exc, exc_info=True)
            return None

    @staticmethod
    def _build_context_dict(result: dict, data: dict) -> dict:
        routes_raw = result.get("routes", [])
        rec_route_id = result.get("recommended_route_id")
        best_departure = result.get("best_departure") or {}

        route_inputs = []
        risk_scores: dict[str, dict] = {}
        heat: dict[str, dict] = {}
        forecast: list[dict] = []
        gas_stations: list[dict] = []
        rest_stops: list[dict] = []

        for route in routes_raw:
            route_id = route.get("id", "")
            evaluations = route.get("evaluations", [])
            scored = [e for e in evaluations if e.get("route_score") is not None]
            best_eval = min(scored, key=lambda e: e["route_score"], default=None) or (
                evaluations[0] if evaluations else {}
            )
            risk_info = best_eval.get("risk") or {}
            heat_data = best_eval.get("heat_data", [])

            route_inputs.append({
                "id": route_id,
                "name": route.get("name", ""),
                "distance_km": route.get("distance_km", 0.0),
                "duration_min": route.get("duration_min", 0.0),
                "geometry": [],
                "road_identifiers": [],
            })

            heat_risk = risk_info.get("score") or 0
            risk_scores[route_id] = {
                "heat_risk_score": heat_risk,
                "comfort_score": max(0, 100 - heat_risk),
                "exposure_time_min": route.get("duration_min") or 0,
                "overall_score": best_eval.get("weather_score") or heat_risk,
                "risk_level": risk_info.get("level") or "UNKNOWN",
            }

            if heat_data:
                temps = [h.get("temperature") or 0 for h in heat_data]
                his = [h.get("heat_index") or 0 for h in heat_data]
                worst = max(
                    (h.get("risk_level", "UNKNOWN") for h in heat_data),
                    key=lambda r: _RISK_ORDER.get(r, 0),
                    default="UNKNOWN",
                )
                heat[route_id] = {
                    "temperature": max(temps),
                    "heat_index": max(his),
                    "exposure_time_min": route.get("duration_min") or 0,
                    "risk_level": worst,
                }

            if route_id == rec_route_id:
                for hp in heat_data[:5]:
                    forecast.append({
                        "temperature_c": hp.get("temperature") or 0,
                        "humidity_percent": hp.get("humidity") or 0,
                        "heat_index_c": hp.get("heat_index") or 0,
                        "wind_speed_kmh": (hp.get("wind_speed_ms") or 0) * 3.6,
                        "condition": (hp.get("risk_level") or "unknown").lower(),
                        "time": hp.get("eta") or "",
                    })

                for poi in route.get("pois", []):
                    poi_input = {
                        "name": poi.get("name", ""),
                        "distance_from_route_km": (poi.get("distance") or 0),
                        "is_available": True,
                    }
                    if poi.get("type") == "gas_station":
                        gas_stations.append(poi_input)
                    else:
                        rest_stops.append(poi_input)

        selected_route = next(
            (r for r in route_inputs if r["id"] == rec_route_id), None
        )

        # Build per-departure-hour summary so the AI can compare times correctly.
        # The forecast[] array only has waypoint ETAs for one departure — the AI
        # must NOT treat those ETA timestamps as candidate departure times.
        departure_comparison: list[dict] = []
        for route in routes_raw:
            if route.get("id") != rec_route_id:
                continue
            for ev in route.get("evaluations", []):
                dep_time = ev.get("departure_time", "")
                if not dep_time:
                    continue
                hd = ev.get("heat_data", [])
                temps = [h.get("temperature") or 0 for h in hd]
                avg_temp = round(sum(temps) / len(temps), 1) if temps else 0
                max_temp = max(temps) if temps else 0
                risk_info = ev.get("risk") or {}
                departure_comparison.append({
                    "departure_time": dep_time,
                    "avg_temp_c": avg_temp,
                    "max_temp_c": max_temp,
                    "risk_level": (risk_info.get("level") or "UNKNOWN").upper(),
                    "route_score": ev.get("route_score"),
                })
            break

        return {
            "trip": {
                "origin": f"{data.get('origin_lat', 0)},{data.get('origin_lng', 0)}",
                "destination": f"{data.get('destination_lat', 0)},{data.get('destination_lng', 0)}",
                "departure_time": best_departure.get("departure_time", ""),
                "vehicle_type": "car",
            },
            "routes": route_inputs,
            "selected_route": selected_route,
            "risk_scores": risk_scores,
            "forecast": forecast,
            "heat": heat,
            "gas_stations": gas_stations,
            "rest_stops": rest_stops,
            "departure_comparison": departure_comparison,
        }

    @staticmethod
    def _derive_decision(good_to_go: bool, context_data: dict) -> str:
        if good_to_go:
            return "GO"
        risk_scores = context_data.get("risk_scores", {})
        if risk_scores:
            # Check by risk level string first (most reliable)
            risk_levels = [
                (v.get("risk_level") or "UNKNOWN").upper()
                for v in risk_scores.values()
            ]
            max_risk = max(
                (_RISK_ORDER.get(r, 0) for r in risk_levels), default=0
            )
            if max_risk <= 1:  # all LOW
                return "GO"
            if max_risk >= 3:  # HIGH or EXTREME
                return "DELAY"
        return "CAUTION"

    @staticmethod
    def _build_alerts(result: dict) -> list[dict]:
        rec_route_id = result.get("recommended_route_id")
        alerts: list[dict] = []
        for route in result.get("routes", []):
            if route.get("id") != rec_route_id:
                continue
            scored = [
                e for e in route.get("evaluations", [])
                if e.get("route_score") is not None
            ]
            best_eval = min(scored, key=lambda e: e["route_score"], default=None)
            if not best_eval:
                break
            risk_info = best_eval.get("risk") or {}
            all_heat = best_eval.get("heat_data", [])
            all_temps = [h.get("temperature") or 0 for h in all_heat]
            avg_temp = round(sum(all_temps) / len(all_temps), 1) if all_temps else 35.0
            weather_score = best_eval.get("weather_score") or risk_info.get("score") or 0
            for hp in all_heat:
                if _RISK_ORDER.get(hp.get("risk_level", ""), 0) < 3:
                    continue
                temp = hp.get("temperature") or 0
                alerts.append({
                    "risk_level": hp.get("risk_level", "HIGH"),
                    "risk_score": weather_score,
                    "distance_km": round((hp.get("distance_from_origin_m") or 0) / 1000, 1),
                    "temperature": temp,
                    "temp_above_avg": round(temp - avg_temp, 1),
                    "eta_time": hp.get("eta", ""),
                    "message": (
                        f"{hp.get('risk_level', 'HIGH')} heat risk — "
                        f"{round(temp * 9 / 5 + 32)}°F at {RouteAnalysisView._fmt_eta(hp.get('eta', ''))}"
                    ),
                })
                if len(alerts) >= 3:
                    break
            break
        return alerts

    @staticmethod
    def _fmt_eta(iso: str) -> str:
        """Convert ISO timestamp to a short readable time like '1:19 PM'."""
        if not iso:
            return "this segment"
        try:
            from datetime import datetime, timezone
            dt = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
            h = dt.hour % 12 or 12
            period = "AM" if dt.hour < 12 else "PM"
            return f"{h}:{dt.minute:02d} {period}"
        except Exception:
            return iso

    @staticmethod
    def _resolve_text_endpoints(data):
        location_service = LocationService()
        resolved = dict(data)
        errors = []

        for endpoint in ("origin", "destination"):
            text = str(
                resolved.pop(f"{endpoint}_text", "") or ""
            ).strip()

            if not text:
                continue

            result = location_service.geocode(text)

            if not result.get("success"):
                errors.append(
                    f"Failed to geocode {endpoint}: "
                    f"{result.get('error', 'unknown error')}"
                )
                continue

            resolved[f"{endpoint}_lat"] = result["lat"]
            resolved[f"{endpoint}_lng"] = result["lon"]

        if errors:
            return Response(
                {
                    "status": "error",
                    "errors": errors,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return resolved


class LocationAutocompleteView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get(
            "q",
            "",
        ).strip()

        if len(query) < 2:
            return Response(
                {
                    "success": True,
                    "results": [],
                },
                status=status.HTTP_200_OK,
            )

        try:
            limit = int(
                request.query_params.get(
                    "limit",
                    5,
                )
            )
        except ValueError:
            limit = 5

        service = LocationService()

        result = service.autocomplete(
            text=query,
            limit=limit,
        )

        if not result.get("success"):
            return Response(
                result,
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )
