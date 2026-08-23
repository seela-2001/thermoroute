from django.urls import path
from .views import RouteAnalysisView, LocationAutocompleteView

urlpatterns = [
    path("analyze/", RouteAnalysisView.as_view(), name="route-analysis"),
    path("locations/autocomplete/", LocationAutocompleteView.as_view(), name="location-autocomplete"),
]