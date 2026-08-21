from django.urls import path
from .views import HeatAnalysisAPIView

urlpatterns = [
    path("analyze/", HeatAnalysisAPIView.as_view(), name="heat-analysis"),
]
