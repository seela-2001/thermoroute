from django.urls import path
from .views import RouteAnalysisView

urlpatterns = [
    path("analyze/", RouteAnalysisView.as_view(), name="route-analysis"),
]