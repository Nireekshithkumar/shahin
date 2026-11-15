from rest_framework import serializers
from apps.profiles.models import (
    UserProfile, UserDocument, FamilyMemberProfile,
    ProfileUpdateProposal, ProfileUpdateAuditLog, CertificateValidityRule
)

class UserProfileSerializer(serializers.ModelSerializer):
    missing_fields = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'full_name', 'date_of_birth', 'age', 'gender',
            'state_or_ut', 'district', 'pincode', 'citizenship', 'domicile_state',
            'marital_status', 'is_orphan', 'religion',
            'current_education_level', 'course_name', 'course_stream',
            'institution_name', 'institution_type', 'current_year_or_semester',
            'academic_percentage', 'cgpa', 'previous_qualification', 'previous_percentage',
            'annual_family_income', 'income_certificate_available', 'bpl_card_holder',
            'ration_card_type', 'parent_occupation',
            'category', 'caste_certificate_available', 'is_minority', 'minority_community',
            'is_disabled', 'disability_percentage', 'disability_type', 'disability_certificate_available',
            'single_girl_child', 'sports_achievements', 'employment_status', 'is_rural',
            'profile_completion_percentage', 'missing_fields', 'updated_at'
        ]
        read_only_fields = ['id', 'profile_completion_percentage', 'updated_at']

    def get_missing_fields(self, obj):
        _, missing = obj.calculate_completeness()
        return missing


class ProfileUpdateProposalSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ProfileUpdateProposal
        fields = [
            'id', 'document', 'field_name', 'field_label',
            'current_value', 'extracted_value', 'ocr_confidence',
            'status', 'status_display', 'is_sensitive',
            'holder_mismatch_warning', 'created_at', 'decided_at'
        ]
        read_only_fields = ['id', 'document', 'created_at', 'decided_at']


class ProfileUpdateAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileUpdateAuditLog
        fields = [
            'id', 'document', 'field_name', 'previous_value',
            'new_value', 'decision', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class CertificateValidityRuleSerializer(serializers.ModelSerializer):
    certificate_type_display = serializers.CharField(source='get_certificate_type_display', read_only=True)

    class Meta:
        model = CertificateValidityRule
        fields = [
            'id', 'certificate_type', 'certificate_type_display',
            'state', 'district', 'issuing_authority',
            'validity_duration_months', 'has_no_general_expiry',
            'effective_date', 'official_source_url', 'source_verification_date',
            'rule_status', 'notes', 'is_active'
        ]


class UserDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    readability_status_display = serializers.CharField(source='get_readability_status_display', read_only=True)
    validity_status_display = serializers.CharField(source='get_validity_status_display', read_only=True)
    authenticity_status_display = serializers.CharField(source='get_authenticity_status_display', read_only=True)
    masked_certificate_number = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()
    pending_proposals_count = serializers.SerializerMethodField()
    family_member_name = serializers.CharField(source='family_member.name', read_only=True)

    class Meta:
        model = UserDocument
        fields = [
            'id', 'document_type', 'document_type_display', 'document_file',
            'original_filename', 'file_size_bytes', 'mime_type',
            'holder_name', 'certificate_number', 'masked_certificate_number',
            'issue_date', 'expiry_date', 'date_of_birth', 'remaining_days',
            'issuing_authority', 'state', 'district', 'annual_income',
            'validity_status', 'validity_status_display', 'warning_period_days',
            'authenticity_status', 'authenticity_status_display', 'authenticity_source',
            'authenticity_verified_at', 'authenticity_result',
            'readability_status', 'readability_status_display',
            'detected_financial_year', 'detected_expiry_date', 'is_expired',
            'masked_identifier', 'ocr_confidence', 'analysis_notes',
            'extracted_metadata', 'pending_proposals_count',
            'family_member', 'family_member_name',
            'uploaded_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'original_filename', 'file_size_bytes', 'mime_type',
            'readability_status', 'detected_financial_year', 'detected_expiry_date',
            'is_expired', 'masked_identifier', 'ocr_confidence', 'analysis_notes',
            'uploaded_at', 'updated_at'
        ]

    def get_masked_certificate_number(self, obj):
        return obj.get_masked_certificate_number()

    def get_remaining_days(self, obj):
        return obj.get_remaining_days()

    def get_pending_proposals_count(self, obj):
        return obj.proposals.filter(status='PENDING').count()


class FamilyMemberProfileSerializer(serializers.ModelSerializer):
    relationship_display = serializers.CharField(source='get_relationship_display', read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    education_level_display = serializers.CharField(source='get_education_level_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = FamilyMemberProfile
        fields = [
            'id', 'name', 'relationship', 'relationship_display', 'age',
            'gender', 'gender_display', 'education_level', 'education_level_display',
            'occupation', 'state_or_ut', 'district', 'annual_income',
            'category', 'category_display', 'is_disabled', 'disability_percentage',
            'is_bpl_card_holder', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
