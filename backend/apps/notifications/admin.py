from django.contrib import admin
from apps.notifications.models import (
    Notification,
    UserNotificationPreference,
    EmailDeliveryLog,
    OpportunitySubscription,
    OpportunityChangeEvent,
    EmailTemplate,
    EmailDeliveryStatus
)
from apps.notifications.email_service import EmailService

@admin.register(UserNotificationPreference)
class UserNotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'email_notifications_enabled', 'preferred_language', 'preferred_delivery_hour', 'max_emails_per_day', 'updated_at')
    list_filter = ('email_notifications_enabled', 'preferred_language', 'weekly_digest_enabled', 'deadline_reminders_enabled')
    search_fields = ('user__email', 'unsubscribe_token')
    readonly_fields = ('unsubscribe_token', 'unsubscribed_at', 'updated_at')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'notification_type', 'title', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__email', 'title', 'message')
    readonly_fields = ('created_at', 'read_at')

@admin.register(EmailDeliveryLog)
class EmailDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ('recipient_email', 'notification_type', 'subject', 'status', 'error_category', 'retry_count', 'scheduled_send_time', 'sent_at')
    list_filter = ('status', 'notification_type', 'error_category', 'created_at')
    search_fields = ('recipient_email', 'subject', 'idempotency_key', 'error_message')
    readonly_fields = ('idempotency_key', 'created_at', 'sent_at')
    actions = ['retry_selected_failed_emails']

    @admin.action(description="Retry selected transient failed deliveries")
    def retry_selected_failed_emails(self, request, queryset):
        retried = 0
        for log in queryset.filter(status__in=[EmailDeliveryStatus.FAILED, EmailDeliveryStatus.RETRYING]):
            EmailService.send_email_message(
                recipient_email=log.recipient_email,
                subject=log.subject,
                html_content=log.metadata.get('html_content', f"<p>{log.subject}</p>"),
                text_content=log.metadata.get('text_content', log.subject),
                notification_type=log.notification_type,
                user=log.user,
                opportunity=log.related_opportunity,
                idempotency_key=None,
                deadline_version=log.deadline_version
            )
            retried += 1
        self.message_user(request, f"Attempted retry for {retried} delivery logs.")

@admin.register(OpportunitySubscription)
class OpportunitySubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'opportunity', 'notify_deadline', 'notify_changes', 'created_at')
    list_filter = ('notify_deadline', 'notify_changes', 'created_at')
    search_fields = ('user__email', 'opportunity__title')

@admin.register(OpportunityChangeEvent)
class OpportunityChangeEventAdmin(admin.ModelAdmin):
    list_display = ('opportunity', 'change_type', 'detected_at', 'processed', 'processed_at')
    list_filter = ('change_type', 'processed', 'detected_at')
    search_fields = ('opportunity__title',)

@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'template_type', 'is_active', 'updated_at')
    list_filter = ('template_type', 'is_active')
    search_fields = ('name', 'subject_template')
