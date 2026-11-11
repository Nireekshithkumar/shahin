from django.urls import path
from apps.data_import.views import (
    AdminDashboardStatsView, OpportunityImportView,
    VerifyOpportunityView, TriggerSourceSyncView
)

urlpatterns = [
    path('dashboard/', AdminDashboardStatsView.as_view(), name='admin-dashboard'),
    path('opportunities/import/', OpportunityImportView.as_view(), name='admin-opportunity-import'),
    path('opportunities/<int:id>/verify/', VerifyOpportunityView.as_view(), name='admin-opportunity-verify'),
    path('sources/<int:id>/sync/', TriggerSourceSyncView.as_view(), name='admin-source-sync'),
]
