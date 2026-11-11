from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from apps.applications.models import SavedOpportunity, ApplicationTracker, ApplicationStatusHistory
from apps.applications.serializers import SavedOpportunitySerializer, ApplicationTrackerSerializer

class SavedOpportunityViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SavedOpportunitySerializer

    def get_queryset(self):
        return SavedOpportunity.objects.filter(user=self.request.user).select_related('opportunity')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ApplicationTrackerViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ApplicationTrackerSerializer

    def get_queryset(self):
        return ApplicationTracker.objects.filter(user=self.request.user).select_related('opportunity')

    def perform_create(self, serializer):
        tracker = serializer.save(user=self.request.user)
        # Initialize document checklist from opportunity requirements
        docs = tracker.opportunity.required_documents or []
        checklist = [{'name': d, 'status': 'Not Started'} for d in docs]
        tracker.documents_checklist = checklist
        tracker.save()
        ApplicationStatusHistory.objects.create(
            tracker=tracker,
            old_status='NONE',
            new_status=tracker.status,
            comment='Application tracking initialized'
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        updated = serializer.save()
        if old_status != updated.status:
            ApplicationStatusHistory.objects.create(
                tracker=updated,
                old_status=old_status,
                new_status=updated.status,
                comment=f"Status updated from {old_status} to {updated.status}"
            )
