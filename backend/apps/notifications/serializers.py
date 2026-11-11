from rest_framework import serializers
from apps.notifications.models import (
    Notification,
    UserNotificationPreference,
    EmailDeliveryLog,
    OpportunitySubscription,
    EmailTemplate,
)

class UserNotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotificationPreference
        fields = [
            'id',
            'email_notifications_enabled',
            'new_scholarships_enabled',
            'new_schemes_enabled',
            'personalized_matches_enabled',
            'include_potentially_eligible',
            'deadline_reminders_enabled',
            'saved_opportunity_alerts_enabled',
            'deadline_extension_alerts_enabled',
            'changes_alerts_enabled',
            'application_tracker_reminders_enabled',
            'weekly_digest_enabled',
            'renewal_reminders_enabled',
            'reminder_days_before',
            'deadline_day_reminder_enabled',
            'preferred_language',
            'preferred_delivery_hour',
            'preferred_timezone',
            'max_emails_per_day',
            'unsubscribe_token',
            'unsubscribed_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'unsubscribe_token', 'unsubscribed_at', 'updated_at']

    def validate_reminder_days_before(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("reminder_days_before must be a list of integer days.")
        for item in value:
            if not isinstance(item, int) or item < 0:
                raise serializers.ValidationError("Each reminder day must be a non-negative integer.")
        return sorted(list(set(value)), reverse=True)

    def validate_preferred_delivery_hour(self, value):
        if value < 0 or value > 23:
            raise serializers.ValidationError("preferred_delivery_hour must be between 0 and 23.")
        return value

    def validate_max_emails_per_day(self, value):
        if value < 1 or value > 50:
            raise serializers.ValidationError("max_emails_per_day must be between 1 and 50.")
        return value

class NotificationSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.CharField(source='related_opportunity.title', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'related_opportunity',
            'opportunity_title',
            'action_url',
            'is_read',
            'read_at',
            'created_at'
        ]

class EmailDeliveryLogSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.CharField(source='related_opportunity.title', read_only=True)

    class Meta:
        model = EmailDeliveryLog
        fields = [
            'id',
            'recipient_email',
            'subject',
            'notification_type',
            'status',
            'error_category',
            'error_message',
            'retry_count',
            'max_retries',
            'scheduled_send_time',
            'sent_at',
            'deadline_version',
            'idempotency_key',
            'related_opportunity',
            'opportunity_title',
            'created_at'
        ]

class OpportunitySubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpportunitySubscription
        fields = [
            'id',
            'user',
            'opportunity',
            'notify_deadline',
            'notify_changes',
            'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']

class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = [
            'id',
            'template_type',
            'name',
            'subject_template',
            'html_template',
            'text_template',
            'is_active',
            'updated_at'
        ]
