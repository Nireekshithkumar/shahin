from django.db import models
from django.conf import settings
from apps.opportunities.models import Opportunity

class ApplicationStatusChoices(models.TextChoices):
    # Standard 9 Workflow Statuses
    NOT_APPLIED = 'NOT_APPLIED', 'Not Applied'
    APPLIED = 'APPLIED', 'Applied'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    DOCUMENTS_UNDER_VERIFICATION = 'DOCUMENTS_UNDER_VERIFICATION', 'Documents Under Verification'
    PENDING_APPROVAL = 'PENDING_APPROVAL', 'Pending Approval'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    BENEFIT_RECEIVED = 'BENEFIT_RECEIVED', 'Benefit Received'
    CLOSED = 'CLOSED', 'Closed'

    # Backward compatibility choices
    INTERESTED = 'INTERESTED', 'Interested'
    PLANNING = 'PLANNING', 'Planning to Apply'
    DOCUMENTS_PENDING = 'DOCUMENTS_PENDING', 'Documents Pending'
    READY_TO_APPLY = 'READY_TO_APPLY', 'Ready to Apply'
    APPLICATION_SUBMITTED = 'APPLICATION_SUBMITTED', 'Application Submitted'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    WITHDRAWN = 'WITHDRAWN', 'Withdrawn'

class SavedOpportunity(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_opportunities')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name='saved_by_users')
    notes = models.TextField(blank=True)
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'opportunity')
        ordering = ['-saved_at']

    def __str__(self):
        return f"{self.user.email} saved {self.opportunity.title}"

class ApplicationTracker(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tracked_applications')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=50, choices=ApplicationStatusChoices.choices, default=ApplicationStatusChoices.NOT_APPLIED)
    application_date = models.DateField(null=True, blank=True)
    submission_date = models.DateField(null=True, blank=True)
    expected_benefit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    application_reference_number = models.CharField(max_length=100, blank=True)
    personal_notes = models.TextField(blank=True)
    documents_checklist = models.JSONField(default=list, help_text="List of doc items with status")
    reminder_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'opportunity')
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.email} - {self.opportunity.title} [{self.status}]"

class ApplicationStatusHistory(models.Model):
    tracker = models.ForeignKey(ApplicationTracker, on_delete=models.CASCADE, related_name='history')
    old_status = models.CharField(max_length=50)
    new_status = models.CharField(max_length=50)
    comment = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.tracker.opportunity.title}: {self.old_status} -> {self.new_status}"
