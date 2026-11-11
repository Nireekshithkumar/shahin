import secrets
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.opportunities.models import Opportunity

class NotificationType(models.TextChoices):
    # Core opportunity lifecycle notifications
    NEW_SCHOLARSHIP = 'NEW_SCHOLARSHIP', 'New Scholarship Published'
    NEW_SCHEME = 'NEW_SCHEME', 'New Government Scheme Published'
    NEW_MATCHING_OPPORTUNITY = 'NEW_MATCHING_OPPORTUNITY', 'New Matching Opportunity'
    DEADLINE_APPROACHING = 'DEADLINE_APPROACHING', 'Scholarship Deadline Approaching'
    DEADLINE_EXTENDED = 'DEADLINE_EXTENDED', 'Deadline Extended'
    REQUIREMENTS_CHANGED = 'REQUIREMENTS_CHANGED', 'Eligibility Requirements Changed'
    BENEFITS_OR_DOCS_CHANGED = 'BENEFITS_OR_DOCS_CHANGED', 'Benefit Amount or Required Documents Changed'
    OPPORTUNITY_CLOSED_OR_EXPIRED = 'OPPORTUNITY_CLOSED_OR_EXPIRED', 'Opportunity Marked Closed or Expired'
    SAVED_OPPORTUNITY_CLOSING = 'SAVED_OPPORTUNITY_CLOSING', 'Saved Opportunity Closing Soon'
    TRACKER_REMINDER = 'TRACKER_REMINDER', 'Application Tracker Reminder'
    RENEWAL_REMINDER = 'RENEWAL_REMINDER', 'Scholarship Renewal Reminder'
    WEEKLY_DIGEST = 'WEEKLY_DIGEST', 'Weekly Opportunity Digest'
    
    # Account security and system notifications
    EMAIL_VERIFICATION = 'EMAIL_VERIFICATION', 'Email Verification'
    PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'
    TEST_EMAIL = 'TEST_EMAIL', 'Test Notification Email'
    
    # Legacy aliases preserved for backward compatibility
    SCHEME_CLOSING_SOON = 'SCHEME_CLOSING_SOON', 'Scheme Application Closing Soon'
    STATUS_REMINDER = 'STATUS_REMINDER', 'Application Status Reminder'
    MISSING_DOCUMENT_REMINDER = 'MISSING_DOCUMENT_REMINDER', 'Missing Document Reminder'
    PROFILE_COMPLETION = 'PROFILE_COMPLETION', 'Profile Completion Reminder'
    IMPORTANT_UPDATE = 'IMPORTANT_UPDATE', 'Important Opportunity Update'

class EmailDeliveryStatus(models.TextChoices):
    QUEUED = 'QUEUED', 'Queued'
    ACCEPTED = 'ACCEPTED', 'Provider Accepted'
    SENT = 'SENT', 'Sent'
    DELIVERED = 'DELIVERED', 'Delivered'
    FAILED = 'FAILED', 'Failed'
    BOUNCED = 'BOUNCED', 'Bounced'
    RETRYING = 'RETRYING', 'Retrying'
    CANCELLED = 'CANCELLED', 'Cancelled'
    SUPPRESSED_DUPLICATE = 'SUPPRESSED_DUPLICATE', 'Suppressed (Duplicate)'

class UserNotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    # Master switch
    email_notifications_enabled = models.BooleanField(
        default=True,
        help_text="Master toggle to enable or disable all optional notification emails"
    )

    # Granular notification types
    new_scholarships_enabled = models.BooleanField(
        default=True,
        help_text="Receive alerts when new verified scholarships are published"
    )
    new_schemes_enabled = models.BooleanField(
        default=True,
        help_text="Receive alerts when new central or state government schemes are published"
    )
    personalized_matches_enabled = models.BooleanField(
        default=True,
        help_text="Receive alerts when an opportunity strictly matches your verified eligibility profile"
    )
    include_potentially_eligible = models.BooleanField(
        default=False,
        help_text="Also receive alerts for opportunities where criteria are potentially met with partial profile data"
    )
    deadline_reminders_enabled = models.BooleanField(
        default=True,
        help_text="Receive interval alerts for approaching scholarship and scheme application deadlines"
    )
    saved_opportunity_alerts_enabled = models.BooleanField(
        default=True,
        help_text="Receive urgent alerts when opportunities you bookmarked or saved are closing soon"
    )
    deadline_extension_alerts_enabled = models.BooleanField(
        default=True,
        help_text="Receive prompt alerts whenever an official deadline is formally extended"
    )
    changes_alerts_enabled = models.BooleanField(
        default=True,
        help_text="Receive alerts when eligibility criteria, benefits, or document requirements are modified"
    )
    application_tracker_reminders_enabled = models.BooleanField(
        default=True,
        help_text="Receive follow-up reminders for tracked application milestones and pending documents"
    )
    weekly_digest_enabled = models.BooleanField(
        default=True,
        help_text="Receive a personalized weekly summary digest of new schemes and upcoming deadlines"
    )
    renewal_reminders_enabled = models.BooleanField(
        default=True,
        help_text="Receive annual/semester reminders to apply for scholarship renewal"
    )

    # Configurable interval list (e.g., [30, 14, 7, 3, 1, 0])
    reminder_days_before = models.JSONField(
        default=list,
        help_text="List of integer days before deadline e.g. [30, 14, 7, 3, 1]"
    )
    deadline_day_reminder_enabled = models.BooleanField(
        default=False,
        help_text="Send a reminder on the actual deadline day (0 days remaining)"
    )

    # Language, Timezone, and Timing
    preferred_language = models.CharField(
        max_length=10,
        default='en',
        help_text="Preferred language code for emails (en, hi, kn, te, ta, mr, bn)"
    )
    preferred_delivery_hour = models.PositiveIntegerField(
        default=9,
        help_text="Preferred hour of the day (0-23 in user's timezone) for non-urgent digests"
    )
    preferred_timezone = models.CharField(
        max_length=50,
        default='Asia/Kolkata',
        help_text="User's regional timezone (default: Asia/Kolkata for IST)"
    )
    max_emails_per_day = models.PositiveIntegerField(
        default=5,
        help_text="Maximum number of marketing/opportunity notification emails per day"
    )

    # Secure opaque token for one-click unsubscribe
    unsubscribe_token = models.CharField(
        max_length=128,
        unique=True,
        db_index=True,
        blank=True
    )
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    # Metadata & Tracking
    last_digest_sent = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.reminder_days_before:
            self.reminder_days_before = [30, 14, 7, 3, 1]
        if not self.unsubscribe_token:
            self.unsubscribe_token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @classmethod
    def get_default_intervals(cls):
        return [30, 14, 7, 3, 1]

    def __str__(self):
        return f"Preferences for {self.user.email}"

class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.IMPORTANT_UPDATE
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    related_opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    action_url = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.title}"

class EmailDeliveryLog(models.Model):
    recipient_email = models.EmailField(db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs'
    )
    subject = models.CharField(max_length=255)
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        db_index=True
    )
    related_opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs'
    )
    status = models.CharField(
        max_length=30,
        choices=EmailDeliveryStatus.choices,
        default=EmailDeliveryStatus.QUEUED,
        db_index=True
    )
    error_category = models.CharField(
        max_length=50,
        blank=True,
        help_text="Categorized error e.g. SMTP_AUTH, TIMEOUT, RATE_LIMIT, INVALID_RECIPIENT, GENERAL"
    )
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)
    scheduled_send_time = models.DateTimeField(default=timezone.now, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # Versioning & Idempotency
    deadline_version = models.CharField(
        max_length=100,
        blank=True,
        help_text="Identifier for the opportunity deadline version e.g. 2026-11-15-interval-7"
    )
    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Unique key ensuring strict single delivery for identical recipient, event, and version"
    )
    provider_message_id = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Email to {self.recipient_email} [{self.status}] - {self.subject[:40]}"

class OpportunitySubscription(models.Model):
    """Allows users to explicitly follow or subscribe to updates for a specific opportunity."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='opportunity_subscriptions'
    )
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name='subscribers'
    )
    notify_deadline = models.BooleanField(default=True)
    notify_changes = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'opportunity')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} subscribed to {self.opportunity.title}"

class OpportunityChangeEvent(models.Model):
    """Tracks detected changes in opportunities (deadline extension, rule changes, closed/expired)."""
    class ChangeType(models.TextChoices):
        DEADLINE_EXTENDED = 'DEADLINE_EXTENDED', 'Deadline Extended'
        REQUIREMENTS_CHANGED = 'REQUIREMENTS_CHANGED', 'Eligibility Requirements Changed'
        BENEFITS_CHANGED = 'BENEFITS_CHANGED', 'Benefits Amount or Frequency Changed'
        DOCUMENTS_CHANGED = 'DOCUMENTS_CHANGED', 'Required Documents Changed'
        STATUS_CHANGED = 'STATUS_CHANGED', 'Application Status Changed'
        CLOSED_OR_EXPIRED = 'CLOSED_OR_EXPIRED', 'Marked Closed or Expired'

    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name='change_events'
    )
    change_type = models.CharField(max_length=50, choices=ChangeType.choices)
    old_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    detected_at = models.DateTimeField(auto_now_add=True, db_index=True)
    processed = models.BooleanField(default=False, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-detected_at']

    def __str__(self):
        return f"{self.opportunity.title} [{self.change_type}] on {self.detected_at.strftime('%Y-%m-%d')}"

class EmailTemplate(models.Model):
    """Optional database-managed email templates with admin preview capabilities."""
    template_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        unique=True
    )
    name = models.CharField(max_length=150)
    subject_template = models.CharField(max_length=255)
    html_template = models.TextField()
    text_template = models.TextField()
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Template: {self.name} ({self.template_type})"
