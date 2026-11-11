from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.workflows.views import EligibilityWorkflowViewSet, ExecuteWorkflowView

router = DefaultRouter()
router.register(r'', EligibilityWorkflowViewSet, basename='workflow')

urlpatterns = [
    path('execute-direct/', ExecuteWorkflowView.as_view(), name='workflow-execute-direct'),
    path('<int:id>/execute/', ExecuteWorkflowView.as_view(), name='workflow-execute'),
    path('', include(router.urls)),
]
