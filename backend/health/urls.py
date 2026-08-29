from django.urls import path
from .views import ReadinessAPIView, LivenessAPIView

urlpatterns = [
    path("live/", LivenessAPIView.as_view(), name="liveness-probe"),
    path("read/", ReadinessAPIView.as_view(), name="readness-probe")
]
