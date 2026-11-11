from django.db import models
from django.utils.text import slugify

class OpportunityType(models.TextChoices):
    SCHOLARSHIP = 'SCHOLARSHIP', 'Scholarship'
    FELLOWSHIP = 'FELLOWSHIP', 'Fellowship & Research Grant'
    STIPEND = 'STIPEND', 'Stipend & Internship'
    EDUCATION_LOAN = 'EDUCATION_LOAN', 'Education Loan & Interest Subsidy'
    SUBSIDY = 'SUBSIDY', 'Financial Subsidy'
    PENSION = 'PENSION', 'Pension Scheme'
    AGRICULTURE_BENEFIT = 'AGRICULTURE_BENEFIT', 'Agriculture & Farmer Benefit'
    HOUSING_SCHEME = 'HOUSING_SCHEME', 'Housing Scheme'
    HEALTH_SCHEME = 'HEALTH_SCHEME', 'Healthcare Benefit'
    EMPLOYMENT_BENEFIT = 'EMPLOYMENT_BENEFIT', 'Employment & Skill Development'
    DISABILITY_BENEFIT = 'DISABILITY_BENEFIT', 'Disability Benefit'
    OTHER_BENEFIT = 'OTHER_BENEFIT', 'Other Citizen Benefit'

class GovernmentLevel(models.TextChoices):
    CENTRAL = 'CENTRAL', 'Central Government of India'
    STATE = 'STATE', 'State Government'
    UNION_TERRITORY = 'UNION_TERRITORY', 'Union Territory Administration'
    PRIVATE = 'PRIVATE', 'Private Foundation / Trust'
    CORPORATE_CSR = 'CORPORATE_CSR', 'Corporate CSR Program'
    INTERNATIONAL = 'INTERNATIONAL', 'International / Bilateral'

class VerificationStatus(models.TextChoices):
    OFFICIAL_VERIFIED = 'OFFICIAL_VERIFIED', 'Official Source Verified'
    IMPORTED_UNVERIFIED = 'IMPORTED_UNVERIFIED', 'Imported, Not Yet Verified'
    NEEDS_MANUAL_REVIEW = 'NEEDS_MANUAL_REVIEW', 'Requires Manual Review'
    SOURCE_UNAVAILABLE = 'SOURCE_UNAVAILABLE', 'Source Unavailable'
    DEADLINE_CONFIRMATION_NEEDED = 'DEADLINE_CONFIRMATION_NEEDED', 'Deadline Needs Confirmation'
    EXPIRED = 'EXPIRED', 'Expired / Closed'
    DISCONTINUED = 'DISCONTINUED', 'Discontinued'
    ARCHIVED = 'ARCHIVED', 'Archived'

class ReliabilityStatus(models.TextChoices):
    HIGH = 'HIGH', 'High (Official Portal / Gazette)'
    MEDIUM = 'MEDIUM', 'Medium (Authorized Feed / Department Page)'
    LOW = 'LOW', 'Low (Unverified External Reference)'

class ApplicationStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    CLOSING_SOON = 'CLOSING_SOON', 'Closing Soon'
    UPCOMING = 'UPCOMING', 'Upcoming'
    CLOSED = 'CLOSED', 'Closed'
    EXPIRED = 'EXPIRED', 'Expired'
    ARCHIVED = 'ARCHIVED', 'Archived'

class BenefitFrequency(models.TextChoices):
    ONE_TIME = 'ONE_TIME', 'One-time Payment'
    MONTHLY = 'MONTHLY', 'Monthly'
    ANNUALLY = 'ANNUALLY', 'Per Annum'
    PER_SEMESTER = 'PER_SEMESTER', 'Per Semester'
    COURSE_DURATION = 'COURSE_DURATION', 'Entire Course Duration'
    SUBSIDY_PERCENTAGE = 'SUBSIDY_PERCENTAGE', 'Interest / Fee Subsidy %'
    IN_KIND = 'IN_KIND', 'Equipment / In-Kind Grant'

class ApplicationMethod(models.TextChoices):
    ONLINE_DIRECT = 'ONLINE_DIRECT', 'Direct Online Portal'
    NSP = 'NSP', 'National Scholarship Portal (NSP)'
    MYSCHEME = 'MYSCHEME', 'myScheme Direct Portal'
    STATE_PORTAL = 'STATE_PORTAL', 'State Government Scholarship Portal'
    OFFLINE = 'OFFLINE', 'Offline / Physical Submission'

class SourceCategory(models.TextChoices):
    CENTRAL_GOVERNMENT = 'CENTRAL_GOVERNMENT', 'Central Government Portal'
    STATE_GOVERNMENT = 'STATE_GOVERNMENT', 'State Government Portal'
    UNIVERSITY_INSTITUTION = 'UNIVERSITY_INSTITUTION', 'University / Institution'
    FOUNDATION_CORPORATE = 'FOUNDATION_CORPORATE', 'Foundation / Corporate CSR'
    AGGREGATOR = 'AGGREGATOR', 'Aggregator / Feed'
    OTHER = 'OTHER', 'Other'

class SourceHealthStatus(models.TextChoices):
    HEALTHY = 'HEALTHY', 'Healthy'
    DEGRADED = 'DEGRADED', 'Degraded'
    UNREACHABLE = 'UNREACHABLE', 'Unreachable'
    UNKNOWN = 'UNKNOWN', 'Unknown'
    RATE_LIMITED = 'RATE_LIMITED', 'Rate Limited'

class CollectionMethod(models.TextChoices):
    OFFICIAL_API = 'OFFICIAL_API', 'Official API'
    RSS_FEED = 'RSS_FEED', 'RSS / Atom Feed'
    DOWNLOADABLE_DATASET = 'DOWNLOADABLE_DATASET', 'Downloadable Dataset'
    PERMITTED_EXTRACTION = 'PERMITTED_EXTRACTION', 'Permitted Web Extraction'
    MANUAL = 'MANUAL', 'Manual Entry Only'

class OpportunitySource(models.Model):
    name = models.CharField(max_length=255, unique=True)
    organization = models.CharField(max_length=255, blank=True)
    domain = models.CharField(max_length=255)
    official_url = models.URLField(max_length=1000, blank=True)
    source_type = models.CharField(max_length=50, default='API')
    category = models.CharField(max_length=50, choices=SourceCategory.choices, default=SourceCategory.OTHER)
    collection_method = models.CharField(max_length=50, choices=CollectionMethod.choices, default=CollectionMethod.OFFICIAL_API)

    # Geographic scope
    applicable_state = models.CharField(max_length=100, default='All India')

    # Schedule
    collection_frequency_hours = models.PositiveIntegerField(default=24, help_text="How often to run collection, in hours")
    is_active = models.BooleanField(default=True)

    # Health & run tracking
    health_status = models.CharField(max_length=30, choices=SourceHealthStatus.choices, default=SourceHealthStatus.UNKNOWN)
    last_attempted_sync = models.DateTimeField(null=True, blank=True)
    last_successful_sync = models.DateTimeField(null=True, blank=True)
    last_error_message = models.TextField(blank=True)
    error_count = models.PositiveIntegerField(default=0)
    consecutive_failures = models.PositiveIntegerField(default=0)

    # Record counts
    records_imported = models.PositiveIntegerField(default=0)
    records_updated = models.PositiveIntegerField(default=0)
    records_discovered = models.PositiveIntegerField(default=0)

    # Verification
    verification_status = models.CharField(max_length=50, default='VERIFIED')
    terms_of_use_reviewed = models.BooleanField(default=False)
    robots_txt_compliant = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.domain})"

class Opportunity(models.Model):
    title = models.CharField(max_length=500, db_index=True)
    slug = models.SlugField(max_length=550, unique=True, blank=True)
    opportunity_type = models.CharField(max_length=50, choices=OpportunityType.choices, default=OpportunityType.SCHOLARSHIP)
    short_description = models.TextField(blank=True)
    detailed_description = models.TextField(blank=True)

    # Provider & Government Classification
    provider = models.CharField(max_length=255, db_index=True)
    government_level = models.CharField(max_length=30, choices=GovernmentLevel.choices, default=GovernmentLevel.CENTRAL)
    applicable_state = models.CharField(max_length=100, default='All India', db_index=True)
    eligible_states = models.JSONField(default=list, help_text="List of eligible states/UTs e.g. ['All India'] or ['Karnataka', 'Kerala']")

    # Eligibility Constraints (Deterministic Rule Fields)
    education_levels = models.JSONField(default=list, help_text="e.g. ['UNDERGRADUATE', 'POSTGRADUATE']")
    eligible_courses = models.JSONField(default=list, help_text="e.g. ['Engineering', 'Medical', 'Any']")
    institution_requirements = models.TextField(blank=True, help_text="e.g., Recognized UGC/AICTE accredited colleges")
    min_age = models.PositiveIntegerField(null=True, blank=True)
    max_age = models.PositiveIntegerField(null=True, blank=True)
    min_academic_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    min_cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    max_annual_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Max family income limit in INR")

    eligible_genders = models.JSONField(default=list, help_text="e.g. ['ALL'] or ['FEMALE']")
    eligible_categories = models.JSONField(default=list, help_text="e.g. ['ALL'] or ['SC', 'ST', 'OBC']")
    disability_eligible_only = models.BooleanField(default=False)
    min_disability_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    minority_only = models.BooleanField(default=False)
    citizenship_residency_requirement = models.CharField(max_length=255, default='Citizen of India')
    eligible_occupations = models.JSONField(default=list, help_text="Occupations eligible, e.g. ['Student', 'Farmer']")

    # Documents and Benefits
    required_documents = models.JSONField(default=list, help_text="List of required document names")
    benefit_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    benefit_frequency = models.CharField(max_length=30, choices=BenefitFrequency.choices, default=BenefitFrequency.ANNUALLY)
    benefit_description = models.TextField(blank=True, help_text="Formatted benefit details e.g. Rs 50,000 per year + maintenance allowance")

    # Application Dates & URLs
    application_opening_date = models.DateField(null=True, blank=True)
    application_closing_date = models.DateField(null=True, blank=True, db_index=True)
    application_status = models.CharField(max_length=30, choices=ApplicationStatus.choices, default=ApplicationStatus.OPEN)
    application_method = models.CharField(max_length=30, choices=ApplicationMethod.choices, default=ApplicationMethod.ONLINE_DIRECT)
    official_application_url = models.URLField(max_length=1000, blank=True)
    official_information_url = models.URLField(max_length=1000, blank=True)

    # Provenance & Verification
    source_name = models.CharField(max_length=255, default='National Scholarship Portal')
    source_organization = models.CharField(max_length=255, default='Government of India')
    source_verification_date = models.DateField(null=True, blank=True)
    last_verified_date = models.DateTimeField(null=True, blank=True)
    verification_status = models.CharField(max_length=50, choices=VerificationStatus.choices, default=VerificationStatus.OFFICIAL_VERIFIED)
    reliability_status = models.CharField(max_length=30, choices=ReliabilityStatus.choices, default=ReliabilityStatus.HIGH)

    # Structured JSON rules for custom workflow & RAG
    structured_eligibility_rules = models.JSONField(default=dict, blank=True)
    is_featured = models.BooleanField(default=False)

    # Draft/publish flow support
    is_draft = models.BooleanField(default=False, help_text="When True the record is not visible to regular users")
    published_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Opportunities'
        ordering = ['-is_featured', 'application_closing_date', '-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:500]
            self.slug = base_slug
            counter = 1
            while Opportunity.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{base_slug[:490]}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.provider})"

class OpportunityDocumentRequirement(models.Model):
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name='document_requirements')
    document_name = models.CharField(max_length=255)
    is_mandatory = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.document_name} for {self.opportunity.title}"

class OpportunitySourceSnapshot(models.Model):
    source = models.ForeignKey(OpportunitySource, on_delete=models.CASCADE, related_name='snapshots')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.SET_NULL, null=True, blank=True, related_name='snapshots')
    raw_payload = models.JSONField()
    captured_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Snapshot {self.id} from {self.source.name} at {self.captured_at}"


# ==============================================================================
# View Tracking — ScholarshipVisit
# Records when a logged-in user views a scholarship detail page.
# Repeated views update last_viewed_at instead of creating duplicates.
# ==============================================================================
class ScholarshipVisit(models.Model):
    """Records scholarship page views for logged-in users."""
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='scholarship_visits'
    )
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name='visits'
    )
    first_viewed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    last_viewed_at = models.DateTimeField(auto_now=True)
    # Snapshot the deadline version at time of first view for reminder deduplication
    deadline_at_first_view = models.DateField(null=True, blank=True)
    view_count = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('user', 'opportunity')
        ordering = ['-last_viewed_at']
        indexes = [
            models.Index(fields=['user', 'last_viewed_at']),
        ]

    def __str__(self):
        return f"{self.user_id} viewed {self.opportunity.title} ({self.view_count}x)"


# ==============================================================================
# Deadline History — tracks every verified deadline change for an opportunity.
# ==============================================================================
class OpportunityDeadlineHistory(models.Model):
    """Immutable record of deadline changes for an opportunity."""
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name='deadline_history'
    )
    previous_deadline = models.DateField(null=True, blank=True)
    new_deadline = models.DateField(null=True, blank=True)
    source_url = models.URLField(max_length=1000, blank=True)
    verification_status = models.CharField(max_length=50, default='PENDING')
    change_summary = models.TextField(blank=True)
    detected_at = models.DateTimeField(auto_now_add=True, db_index=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    recorded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='recorded_deadline_changes'
    )

    class Meta:
        ordering = ['-detected_at']

    def __str__(self):
        return f"{self.opportunity.title}: {self.previous_deadline} to {self.new_deadline}"


# ==============================================================================
# Audit Log — tracks all admin actions on opportunities.
# ==============================================================================
class AuditLogAction(models.TextChoices):
    CREATE = 'CREATE', 'Created'
    UPDATE = 'UPDATE', 'Updated'
    PUBLISH = 'PUBLISH', 'Published'
    UNPUBLISH = 'UNPUBLISH', 'Unpublished'
    VERIFY = 'VERIFY', 'Verified'
    REJECT = 'REJECT', 'Rejected'
    ARCHIVE = 'ARCHIVE', 'Archived'
    DELETE = 'DELETE', 'Deleted'
    IMPORT = 'IMPORT', 'Imported (Bulk)'
    STATUS_CHANGE = 'STATUS_CHANGE', 'Status Changed'
    SEND_TEST_EMAIL = 'SEND_TEST_EMAIL', 'Sent Test Email'
    SOURCE_SYNC = 'SOURCE_SYNC', 'Source Sync Triggered'


class OpportunityAuditLog(models.Model):
    """Tracks all admin actions on opportunities for accountability."""
    admin_user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='audit_logs'
    )
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=30, choices=AuditLogAction.choices)
    object_repr = models.CharField(max_length=500, blank=True)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    change_summary = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['admin_user', 'timestamp']),
            models.Index(fields=['opportunity', 'timestamp']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        admin = self.admin_user.email if self.admin_user else 'System'
        opp = self.object_repr or f"Opportunity {self.opportunity_id}"
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {admin} {self.action} {opp}"


# ==============================================================================
# Source Collection Run — log every automated or manual collection attempt.
# ==============================================================================
class CollectionRunStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    RUNNING = 'RUNNING', 'Running'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'
    PARTIAL = 'PARTIAL', 'Partial (Some Errors)'


class SourceCollectionRun(models.Model):
    """Records every automated or manual collection run for a source."""
    source = models.ForeignKey(
        OpportunitySource,
        on_delete=models.CASCADE,
        related_name='collection_runs'
    )
    status = models.CharField(max_length=20, choices=CollectionRunStatus.choices, default=CollectionRunStatus.PENDING)
    triggered_by = models.CharField(max_length=50, default='scheduler', help_text="'scheduler', 'admin', or 'manual'")
    triggered_by_user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='triggered_collection_runs'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)
    records_fetched = models.PositiveIntegerField(default=0)
    records_new = models.PositiveIntegerField(default=0)
    records_updated = models.PositiveIntegerField(default=0)
    records_skipped = models.PositiveIntegerField(default=0)
    records_errored = models.PositiveIntegerField(default=0)
    error_log = models.TextField(blank=True)
    http_status_code = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"Run for {self.source.name} [{self.status}] at {self.started_at:%Y-%m-%d %H:%M}"
