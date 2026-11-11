from rest_framework import serializers
from apps.profiles.models import UserProfile, UserDocument, FamilyMemberProfile

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

class UserDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    readability_status_display = serializers.CharField(source='get_readability_status_display', read_only=True)

    class Meta:
        model = UserDocument
        fields = [
            'id', 'document_type', 'document_type_display', 'document_file',
            'original_filename', 'file_size_bytes', 'mime_type',
            'readability_status', 'readability_status_display',
            'detected_financial_year', 'detected_expiry_date', 'is_expired',
            'masked_identifier', 'ocr_confidence', 'analysis_notes',
            'uploaded_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'original_filename', 'file_size_bytes', 'mime_type',
            'readability_status', 'detected_financial_year', 'detected_expiry_date',
            'is_expired', 'masked_identifier', 'ocr_confidence', 'analysis_notes',
            'uploaded_at', 'updated_at'
        ]

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
