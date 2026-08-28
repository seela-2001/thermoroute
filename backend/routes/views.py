from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .serializers import RouteAnalysisRequestSerializer
from .services.route_analysis_service import RouteAnalysisService
from .services.location_services import LocationService


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
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _resolve_text_endpoints(data):
        """Return (resolved_data, error_response). Resolves
        origin_text/destination_text to coordinates via geocoding."""
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
