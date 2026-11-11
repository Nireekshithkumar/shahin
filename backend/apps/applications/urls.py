from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.applications.views import SavedOpportunityViewSet, ApplicationTrackerViewSet

router = DefaultRouter()
router.register(r'saved', SavedOpportunityViewSet, basename='saved-opportunity')
router.register(r'trackers', ApplicationTrackerViewSet, basename='application-tracker')

urlpatterns = [
    path('', include(router.urls)),
]
