from django.urls import path
from apps.eligibility.views import EvaluateEligibilityView, EligibilityResultsListView

urlpatterns = [
    path('evaluate/', EvaluateEligibilityView.as_view(), name='eligibility-evaluate'),
    path('results/', EligibilityResultsListView.as_view(), name='eligibility-results'),
]
