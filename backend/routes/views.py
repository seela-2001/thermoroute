from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RouteAnalysisRequestSerializer
from .services.route_analysis_service import RouteAnalysisService


class RouteAnalysisView(APIView):

    def post(self, request):
        serializer = RouteAnalysisRequestSerializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )
        data = serializer.validated_data
        service = RouteAnalysisService()
        result = service.analyze(
            origin_lat=data["origin_lat"],
            origin_lng=data["origin_lng"],
            destination_lat=data["destination_lat"],
            destination_lng=data["destination_lng"],
        )
        if not result["success"]:
            return Response(
                {
                    "status": "error",
                    "errors": result.get("errors", []),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "status": "success",
                "recommended_route_id": result[
                    "recommended_route_id"
                ],
                "routes_count": result[
                    "routes_count"
                ],
                "routes": result["routes"],
                "alternatives": result[
                    "alternatives"
                ],
            },
            status=status.HTTP_200_OK,
        )
