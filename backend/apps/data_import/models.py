from django.db import models
from django.conf import settings
from apps.opportunities.models import Opportunity

class ImportSourceType(models.TextChoices):
    CSV = 'CSV', 'CSV Dataset Upload'
    JSON = 'JSON', 'JSON Structured Data Upload'
    NSP_CONNECTOR = 'NSP_CONNECTOR', 'National Scholarship Portal Connector'
    MYSCHEME_CONNECTOR = 'MYSCHEME_CONNECTOR', 'myScheme Ingestion Feed'
    STATE_PORTAL = 'STATE_PORTAL', 'State Portal Crawler/Feed'
    MANUAL = 'MANUAL', 'Manual Review & Entry'

class ImportJobStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    RUNNING = 'RUNNING', 'Running'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'

class DataImportJob(models.Model):
    source_type = models.CharField(max_length=50, choices=ImportSourceType.choices, default=ImportSourceType.CSV)
    file_name = models.CharField(max_length=255, blank=True)
    total_records = models.PositiveIntegerField(default=0)
    imported_count = models.PositiveIntegerField(default=0)
    updated_count = models.PositiveIntegerField(default=0)
    duplicate_count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=30, choices=ImportJobStatus.choices, default=ImportJobStatus.PENDING)
    report = models.JSONField(default=dict)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Import #{self.id} ({self.source_type}) - {self.status}"

class QualityIssueType(models.TextChoices):
    MISSING_DEADLINE = 'MISSING_DEADLINE', 'Missing Application Deadline'
    MISSING_OFFICIAL_URL = 'MISSING_OFFICIAL_URL', 'Missing Official Application URL'
    DUPLICATE_CANDIDATE = 'DUPLICATE_CANDIDATE', 'Potential Duplicate Record'
    UNVERIFIED_CRITERIA = 'UNVERIFIED_CRITERIA', 'Unverified Eligibility Criteria'
    EXPIRED_OPEN_STATUS = 'EXPIRED_OPEN_STATUS', 'Deadline Passed but Status Marked Open'
    BROKEN_URL = 'BROKEN_URL', 'Source URL Unreachable'

class DataQualityIssue(models.Model):
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name='quality_issues')
    issue_type = models.CharField(max_length=50, choices=QualityIssueType.choices)
    severity = models.CharField(max_length=20, default='MEDIUM')
    description = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Issue for {self.opportunity.title}: {self.issue_type}"
