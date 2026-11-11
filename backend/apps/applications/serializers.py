from rest_framework import serializers
from apps.applications.models import SavedOpportunity, ApplicationTracker, ApplicationStatusHistory
from apps.opportunities.serializers import OpportunityListSerializer

class SavedOpportunitySerializer(serializers.ModelSerializer):
    opportunity_details = OpportunityListSerializer(source='opportunity', read_only=True)

    class Meta:
        model = SavedOpportunity
        fields = ['id', 'opportunity', 'opportunity_details', 'notes', 'saved_at']
        read_only_fields = ['id', 'saved_at']

class ApplicationTrackerSerializer(serializers.ModelSerializer):
    opportunity_details = OpportunityListSerializer(source='opportunity', read_only=True)

    class Meta:
        model = ApplicationTracker
        fields = [
            'id', 'opportunity', 'opportunity_details', 'status',
            'submission_date', 'application_reference_number', 'personal_notes',
            'documents_checklist', 'reminder_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
