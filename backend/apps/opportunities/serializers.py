from rest_framework import serializers
from apps.opportunities.models import Opportunity, OpportunityDocumentRequirement, OpportunitySource

class OpportunityDocumentRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpportunityDocumentRequirement
        fields = ['id', 'document_name', 'is_mandatory', 'description']

class OpportunityListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Opportunity
        fields = [
            'id', 'title', 'slug', 'opportunity_type', 'short_description',
            'provider', 'government_level', 'applicable_state', 'eligible_states',
            'education_levels', 'eligible_courses', 'max_annual_income', 'min_academic_percentage',
            'eligible_genders', 'eligible_categories', 'disability_eligible_only', 'minority_only',
            'benefit_amount', 'benefit_frequency', 'benefit_description',
            'application_opening_date', 'application_closing_date', 'application_status',
            'application_method', 'official_application_url', 'official_information_url',
            'source_name', 'verification_status', 'reliability_status', 'is_featured'
        ]

class OpportunityDetailSerializer(serializers.ModelSerializer):
    document_requirements = OpportunityDocumentRequirementSerializer(many=True, read_only=True)

    class Meta:
        model = Opportunity
        fields = '__all__'

class OpportunitySourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpportunitySource
        fields = '__all__'

class ScholarshipVisitSerializer(serializers.ModelSerializer):
    opportunity = OpportunityListSerializer(read_only=True)
    opportunity_id = serializers.IntegerField(source='opportunity.id', read_only=True)

    class Meta:
        model = __import__('apps.opportunities.models', fromlist=['ScholarshipVisit']).ScholarshipVisit
        fields = [
            'id', 'opportunity', 'opportunity_id',
            'first_viewed_at', 'last_viewed_at',
            'deadline_at_first_view', 'view_count'
        ]

class OpportunityDeadlineHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = __import__('apps.opportunities.models', fromlist=['OpportunityDeadlineHistory']).OpportunityDeadlineHistory
        fields = [
            'id', 'opportunity', 'previous_deadline', 'new_deadline',
            'source_url', 'verification_status', 'change_summary',
            'detected_at', 'verified_at', 'recorded_by'
        ]

class OpportunityAuditLogSerializer(serializers.ModelSerializer):
    admin_email = serializers.SerializerMethodField()

    class Meta:
        model = __import__('apps.opportunities.models', fromlist=['OpportunityAuditLog']).OpportunityAuditLog
        fields = [
            'id', 'admin_user', 'admin_email', 'opportunity',
            'action', 'object_repr', 'old_values', 'new_values',
            'change_summary', 'ip_address', 'timestamp'
        ]

    def get_admin_email(self, obj):
        return obj.admin_user.email if obj.admin_user else 'System'

