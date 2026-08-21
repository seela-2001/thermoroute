from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import RouteAnalysisRequestSerializer
from .services.route_providers import RouteProvider


class RouteAnalysisView(APIView):

    def post(self, request):
        serializer = RouteAnalysisRequestSerializer(
            data=request.data
        )
        
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        provider = RouteProvider()
        routes = provider.get_routes(
            origin_lat=data["origin_lat"],
            origin_lng=data["origin_lng"],
            destination_lat=data["destination_lat"],
            destination_lng=data["destination_lng"],
        )

        return Response(
            {
                "status": "success",
                "routes": routes,
            },
            status=status.HTTP_200_OK,
        )
