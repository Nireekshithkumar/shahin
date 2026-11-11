from rest_framework import serializers
from apps.profiles.models import UserProfile

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
