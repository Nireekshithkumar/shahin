from django.urls import path
from apps.recommendations.views import RecommendationsView

urlpatterns = [
    path('', RecommendationsView.as_view(), name='recommendations-list'),
]
