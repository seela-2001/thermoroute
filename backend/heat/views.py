from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .serializers import HeatAnalysisRequestSerializer
from .services.heat_analysis_services import HeatAnalysisService


class HeatAnalysisAPIView(APIView):
    """
    Analyze heat risk for a route geometry.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = HeatAnalysisRequestSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)
        service = HeatAnalysisService()
        result = service.analyze(
            serializer.validated_data["points"]
        )

        if not result["success"]:
            return Response(
                result,
                status=status.HTTP_502_BAD_GATEWAY,
            )

        analysis = result["analysis"]

        return Response(
            {
                "heat_data": result["heat_data"],
                "risk": {
                    "score": analysis.overall_risk_score,
                    "level": analysis.risk_level,
                    "critical_segments": analysis.critical_segments,
                    "metrics": analysis.metrics,
                },
            },
            status=status.HTTP_200_OK,
        )
