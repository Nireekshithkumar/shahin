from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.opportunities.views import (
    OpportunityViewSet, FeaturedOpportunitiesView,
    ClosingSoonOpportunitiesView, RecentOpportunitiesView, SourceListView,
    CalculateBenefitView
)

from apps.notifications.views import OpportunitySubscriptionSettingsView

router = DefaultRouter()
router.register(r'', OpportunityViewSet, basename='opportunity')

urlpatterns = [
    path('featured/', FeaturedOpportunitiesView.as_view(), name='opportunity-featured'),
    path('closing-soon/', ClosingSoonOpportunitiesView.as_view(), name='opportunity-closing-soon'),
    path('recent/', RecentOpportunitiesView.as_view(), name='opportunity-recent'),
    path('sources/', SourceListView.as_view(), name='opportunity-sources'),
    path('calculate-benefit/', CalculateBenefitView.as_view(), name='opportunity-calculate-benefit'),
    path('<int:id>/notification-settings/', OpportunitySubscriptionSettingsView.as_view(), name='opportunity-notification-settings'),
    path('<int:id>/subscribe/', OpportunitySubscriptionSettingsView.as_view(), name='opportunity-subscribe'),
    path('', include(router.urls)),
]

