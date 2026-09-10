from django.urls import path
from .views import RouteAnalysisView, LocationAutocompleteView
from .ai_chat_views import AIChatView

urlpatterns = [
    path("analyze/", RouteAnalysisView.as_view(), name="route-analysis"),
    path("locations/autocomplete/", LocationAutocompleteView.as_view(), name="location-autocomplete"),
    path("ai/chat/", AIChatView.as_view(), name="ai-chat"),
]
