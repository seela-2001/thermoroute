from django.db import connection
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status


class LivenessAPIView(APIView):
    """
    Liveness probe.
    Checks whether the Django application process is alive.
    Does not depend on external services.
    """

    def get(self, request):
        return Response(
            {
                "status": "alive"
            },
            status=status.HTTP_200_OK,
        )


class ReadinessAPIView(APIView):
    """
    Readiness probe.
    Checks whether the application is ready to receive traffic.
    Currently verifies database connectivity.
    """

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")

            return Response(
                {
                    "status": "ready"
                },
                status=status.HTTP_200_OK,
            )

        except Exception:
            return Response(
                {
                    "status": "not_ready"
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
