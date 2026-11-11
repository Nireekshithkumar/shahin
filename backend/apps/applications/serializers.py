from rest_framework import serializers
from apps.applications.models import SavedOpportunity, ApplicationTracker, ApplicationStatusHistory
from apps.opportunities.serializers import OpportunityListSerializer

class SavedOpportunitySerializer(serializers.ModelSerializer):
    opportunity_details = OpportunityListSerializer(source='opportunity', read_only=True)

    class Meta:
        model = SavedOpportunity
        fields = ['id', 'opportunity', 'opportunity_details', 'notes', 'saved_at']
        read_only_fields = ['id', 'saved_at']

class ApplicationStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationStatusHistory
        fields = ['id', 'old_status', 'new_status', 'comment', 'changed_at']

class ApplicationTrackerSerializer(serializers.ModelSerializer):
    opportunity_details = OpportunityListSerializer(source='opportunity', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    history = ApplicationStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = ApplicationTracker
        fields = [
            'id', 'opportunity', 'opportunity_details', 'status', 'status_display',
            'application_date', 'submission_date', 'expected_benefit',
            'application_reference_number', 'personal_notes',
            'documents_checklist', 'reminder_enabled', 'history',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
