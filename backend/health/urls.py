from django.urls import path
from .views import ReadinessAPIView, LivenessAPIView

urlpatterns = [
    path("liveness/", LivenessAPIView.as_view(), name="liveness-probe"),
    path("readness/", ReadinessAPIView.as_view(), name="readness-probe")
]