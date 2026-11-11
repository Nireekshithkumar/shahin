from rest_framework import serializers
from django.contrib.auth import authenticate
from apps.accounts.models import User, UserRole

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    full_name = serializers.CharField(write_only=True, required=False, default='')

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'full_name', 'phone_number', 'role']

    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        password = validated_data.pop('password')
        email = validated_data.get('email')
        username = email.split('@')[0]
        
        user = User.objects.create(
            username=username,
            email=email,
            role=validated_data.get('role', UserRole.CITIZEN),
            phone_number=validated_data.get('phone_number', '')
        )
        user.set_password(password)
        user.save()

        # Initialize Profile
        from apps.profiles.models import UserProfile
        UserProfile.objects.get_or_create(user=user, defaults={'full_name': full_name})
        
        # Initialize Notification Preferences
        from apps.notifications.models import UserNotificationPreference
        UserNotificationPreference.objects.get_or_create(user=user, defaults={'reminder_days_before': [30, 14, 7, 3, 1]})

        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'role', 'is_email_verified', 'avatar_url', 'phone_number', 'created_at']

class GoogleAuthSerializer(serializers.Serializer):
    credential = serializers.CharField(required=True)
