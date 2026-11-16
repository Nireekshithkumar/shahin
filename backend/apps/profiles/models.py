from django.db import models
from django.conf import settings

class GenderChoices(models.TextChoices):
    MALE = 'MALE', 'Male'
    FEMALE = 'FEMALE', 'Female'
    TRANSGENDER = 'TRANSGENDER', 'Transgender'
    OTHER = 'OTHER', 'Other'
    PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY', 'Prefer not to say'

class EducationLevel(models.TextChoices):
    CLASS_1_10 = 'CLASS_1_10', 'School (Class 1-10)'
    CLASS_11_12 = 'CLASS_11_12', 'Higher Secondary (Class 11-12)'
    DIPLOMA = 'DIPLOMA', 'Diploma'
    UNDERGRADUATE = 'UNDERGRADUATE', 'Undergraduate (UG)'
    POSTGRADUATE = 'POSTGRADUATE', 'Postgraduate (PG)'
    PHD_RESEARCH = 'PHD_RESEARCH', 'M.Phil / PhD / Research'
    ITI_VOCATIONAL = 'ITI_VOCATIONAL', 'ITI / Vocational'
    OTHER = 'OTHER', 'Other'

class CategoryChoices(models.TextChoices):
    GENERAL = 'GENERAL', 'General / Unreserved'
    OBC = 'OBC', 'Other Backward Classes (OBC)'
    SC = 'SC', 'Scheduled Castes (SC)'
    ST = 'ST', 'Scheduled Tribes (ST)'
    EWS = 'EWS', 'Economically Weaker Section (EWS)'
    DNT = 'DNT', 'De-notified, Nomadic and Semi-Nomadic Tribes (DNT)'
    PVTG = 'PVTG', 'Particularly Vulnerable Tribal Group (PVTG)'

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    
    # Personal Information
    full_name = models.CharField(max_length=255, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=30, choices=GenderChoices.choices, default=GenderChoices.PREFER_NOT_TO_SAY)
    state_or_ut = models.CharField(max_length=100, blank=True, help_text="State or UT of residence")
    district = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    citizenship = models.CharField(max_length=50, default='Indian')
    domicile_state = models.CharField(max_length=100, blank=True)
    marital_status = models.CharField(max_length=50, blank=True)
    is_orphan = models.BooleanField(default=False)
    religion = models.CharField(max_length=50, blank=True)

    # Education Information
    current_education_level = models.CharField(
        max_length=50,
        choices=EducationLevel.choices,
        default=EducationLevel.UNDERGRADUATE
    )
    course_name = models.CharField(max_length=200, blank=True, help_text="e.g., B.Tech Computer Science, MBBS, B.Com")
    course_stream = models.CharField(max_length=100, blank=True, help_text="e.g., Engineering, Medical, Arts, Science")
    institution_name = models.CharField(max_length=255, blank=True)
    institution_type = models.CharField(max_length=100, blank=True, help_text="e.g., Government, Private, Central University")
    current_year_or_semester = models.CharField(max_length=50, blank=True)
    academic_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    previous_qualification = models.CharField(max_length=100, blank=True)
    previous_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Financial Information
    annual_family_income = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Annual total family income in INR"
    )
    income_certificate_available = models.BooleanField(default=False)
    bpl_card_holder = models.BooleanField(default=False)
    ration_card_type = models.CharField(max_length=50, blank=True)
    parent_occupation = models.CharField(max_length=100, blank=True)

    # Social & Reservation Categories
    category = models.CharField(max_length=20, choices=CategoryChoices.choices, default=CategoryChoices.GENERAL)
    caste_certificate_available = models.BooleanField(default=False)
    is_minority = models.BooleanField(default=False)
    minority_community = models.CharField(max_length=50, blank=True)
    is_disabled = models.BooleanField(default=False)
    disability_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    disability_type = models.CharField(max_length=100, blank=True)
    disability_certificate_available = models.BooleanField(default=False)
    single_girl_child = models.BooleanField(default=False)
    sports_achievements = models.CharField(max_length=100, blank=True)
    employment_status = models.CharField(max_length=50, default='Student')
    is_rural = models.BooleanField(default=False)

    # Completion Tracking
    profile_completion_percentage = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_completeness(self):
        """Calculates profile completion percentage and missing fields list."""
        tracked_fields = [
            ('full_name', 'Full Name'),
            ('gender', 'Gender'),
            ('state_or_ut', 'State or UT'),
            ('district', 'District'),
            ('current_education_level', 'Education Level'),
            ('course_name', 'Course / Program'),
            ('institution_name', 'Institution Name'),
            ('academic_percentage', 'Academic Marks or CGPA'),
            ('annual_family_income', 'Annual Family Income'),
            ('category', 'Social Category'),
        ]
        completed = 0
        missing = []
        for field, label in tracked_fields:
            val = getattr(self, field, None)
            if val is not None and str(val).strip() != '' and val != GenderChoices.PREFER_NOT_TO_SAY:
                completed += 1
            else:
                missing.append(label)

        pct = int((completed / len(tracked_fields)) * 100)
        self.profile_completion_percentage = pct
        return pct, missing

    def save(self, *args, **kwargs):
        # Auto calculate completion percentage
        self.calculate_completeness()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name or self.user.email} Profile ({self.profile_completion_percentage}%)"


# ==============================================================================
# Feature 1 & 5: AI Document Readiness Checker & Rejection Analyzer Model
# ==============================================================================
class DocumentTypeChoices(models.TextChoices):
    INCOME_CERTIFICATE = 'INCOME_CERTIFICATE', 'Income Certificate'
    CASTE_CERTIFICATE = 'CASTE_CERTIFICATE', 'Caste / Community Certificate'
    EWS_CERTIFICATE = 'EWS_CERTIFICATE', 'Economically Weaker Section (EWS) Certificate'
    RESIDENCE_CERTIFICATE = 'RESIDENCE_CERTIFICATE', 'Residence Certificate'
    DOMICILE_CERTIFICATE = 'DOMICILE_CERTIFICATE', 'Domicile / Nativity Certificate'
    DISABILITY_CERTIFICATE = 'DISABILITY_CERTIFICATE', 'Disability (PwD / UDID) Certificate'
    NATIVITY_CERTIFICATE = 'NATIVITY_CERTIFICATE', 'Nativity Certificate'
    MARKS_CARD = 'MARKS_CARD', 'Marks Card / Grade Sheet / Transcript'
    BONAFIDE_CERTIFICATE = 'BONAFIDE_CERTIFICATE', 'Bonafide / Study Certificate'
    AADHAAR_CARD = 'AADHAAR_CARD', 'Aadhaar / Identity Proof'
    BANK_PASSBOOK = 'BANK_PASSBOOK', 'Bank Passbook / Cancelled Cheque'
    REJECTION_LETTER = 'REJECTION_LETTER', 'Official Rejection Notice / Letter'
    ADMISSION_RECEIPT = 'ADMISSION_RECEIPT', 'College Admission Proof / Fee Receipt'
    RATION_CARD = 'RATION_CARD', 'Ration Card (BPL / AAY)'
    OTHER = 'OTHER', 'Other Government-Issued Certificate'


class ReadabilityChoices(models.TextChoices):
    READABLE = 'READABLE', 'Clear & Fully Readable'
    BLURRY = 'BLURRY', 'Partially Blurry / Low Quality'
    UNREADABLE = 'UNREADABLE', 'Unreadable / Damaged'


class ValidityStatusChoices(models.TextChoices):
    VALID = 'VALID', 'Valid'
    EXPIRING_SOON = 'EXPIRING_SOON', 'Expiring Soon'
    EXPIRED = 'EXPIRED', 'Expired'
    VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED', 'Verification Required'
    NO_EXPIRY_APPLICABLE = 'NO_EXPIRY_APPLICABLE', 'No Expiry Applicable'


class AuthenticityStatusChoices(models.TextChoices):
    AUTHENTICITY_NOT_VERIFIED = 'AUTHENTICITY_NOT_VERIFIED', 'Authenticity Not Verified'
    VERIFIED_OFFICIAL = 'VERIFIED_OFFICIAL', 'Officially Verified'
    REJECTED_INVALID = 'REJECTED_INVALID', 'Verification Failed / Invalid'


class UserDocument(models.Model):
    """
    Stores encrypted/safe reference to user-uploaded verification documents,
    extracted text via OCR, document type classification, certificate validity,
    authenticity tracking, and parsed structured metadata.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(
        max_length=50,
        choices=DocumentTypeChoices.choices,
        default=DocumentTypeChoices.OTHER,
        db_index=True
    )
    document_file = models.FileField(upload_to='user_documents/%Y/%m/')
    original_filename = models.CharField(max_length=255)
    file_size_bytes = models.PositiveIntegerField(default=0)
    mime_type = models.CharField(max_length=100, default='application/pdf')

    # Structured Certificate Fields
    holder_name = models.CharField(max_length=255, blank=True)
    certificate_number = models.CharField(max_length=100, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    issuing_authority = models.CharField(max_length=255, blank=True)
    state = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    annual_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Validity & Monitoring
    validity_status = models.CharField(
        max_length=30,
        choices=ValidityStatusChoices.choices,
        default=ValidityStatusChoices.VERIFICATION_REQUIRED,
        db_index=True
    )
    warning_period_days = models.PositiveIntegerField(default=30)
    last_validity_check = models.DateTimeField(auto_now=True)

    # Independent Government Authenticity Verification
    authenticity_status = models.CharField(
        max_length=35,
        choices=AuthenticityStatusChoices.choices,
        default=AuthenticityStatusChoices.AUTHENTICITY_NOT_VERIFIED,
        db_index=True
    )
    authenticity_source = models.CharField(max_length=255, blank=True)
    authenticity_verified_at = models.DateTimeField(null=True, blank=True)
    authenticity_result = models.TextField(blank=True)

    # OCR Extraction and Analysis
    extracted_text = models.TextField(blank=True, help_text="OCR extracted text (sensitive numbers masked)")
    extracted_metadata = models.JSONField(default=dict, blank=True)
    readability_status = models.CharField(
        max_length=30,
        choices=ReadabilityChoices.choices,
        default=ReadabilityChoices.READABLE
    )
    detected_financial_year = models.CharField(max_length=20, blank=True, help_text="e.g. 2024-2025")
    detected_expiry_date = models.DateField(null=True, blank=True)
    is_expired = models.BooleanField(default=False)
    masked_identifier = models.CharField(max_length=100, blank=True, help_text="Masked certificate or Aadhaar reference")
    ocr_confidence = models.FloatField(default=1.0)
    analysis_notes = models.TextField(blank=True)

    # RAG Document Intelligence
    rag_explanation = models.TextField(blank=True, help_text="RAG-grounded AI explanation citing official guidelines and circulars")
    rag_citations = models.JSONField(default=list, blank=True, help_text="List of official citations: title, authority, state, url, circular_ref")
    rag_validity_period = models.CharField(max_length=150, blank=True, help_text="e.g. 1 Year from Issue Date or Permanent / Lifetime")
    rag_renewal_guidance = models.TextField(blank=True, help_text="Specific renewal instructions grounded in official guidelines")
    retrieval_confidence = models.FloatField(default=0.0, help_text="RAG retrieval and grounded analysis confidence score (0.0 to 1.0)")

    # Family Association
    family_member = models.ForeignKey(
        'FamilyMemberProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents'
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.user.email} - {self.get_document_type_display()} ({self.original_filename})"

    def get_remaining_days(self):
        """Calculates remaining days until certificate expiry."""
        target_exp = self.expiry_date or self.detected_expiry_date
        if not target_exp or self.validity_status == ValidityStatusChoices.NO_EXPIRY_APPLICABLE:
            return None
        from datetime import date
        today = date.today()
        return (target_exp - today).days

    def get_masked_certificate_number(self):
        """Returns safe masked certificate number."""
        num = self.certificate_number or self.masked_identifier
        if not num:
            return "Not Available"
        clean = str(num).strip()
        if len(clean) > 4:
            return f"XXXX{clean[-4:]}"
        return clean


# ==============================================================================
# Feature 7: Family-Based Scheme Discovery Model
# ==============================================================================
class FamilyRelationship(models.TextChoices):
    FATHER = 'FATHER', 'Father'
    MOTHER = 'MOTHER', 'Mother'
    BROTHER = 'BROTHER', 'Brother'
    SISTER = 'SISTER', 'Sister'
    SPOUSE = 'SPOUSE', 'Spouse'
    CHILD = 'CHILD', 'Child / Son / Daughter'
    GRANDPARENT = 'GRANDPARENT', 'Grandparent'
    OTHER_DEPENDANT = 'OTHER_DEPENDANT', 'Other Dependant'


class FamilyMemberProfile(models.Model):
    """
    Dedicated private profile for family members to discover scholarships for children,
    farmer subsidies, pensions, women-focused schemes, and senior citizen benefits.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='family_members')
    name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=30, choices=FamilyRelationship.choices)
    age = models.PositiveIntegerField()
    gender = models.CharField(max_length=30, choices=GenderChoices.choices)
    education_level = models.CharField(
        max_length=50,
        choices=EducationLevel.choices,
        default=EducationLevel.CLASS_1_10
    )
    occupation = models.CharField(
        max_length=100,
        default='Student',
        help_text="e.g. Farmer, Senior Citizen, Homemaker, Student, Artisan, Unemployed"
    )
    state_or_ut = models.CharField(max_length=100, default='All India')
    district = models.CharField(max_length=100, blank=True)
    annual_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    category = models.CharField(max_length=20, choices=CategoryChoices.choices, default=CategoryChoices.GENERAL)
    is_disabled = models.BooleanField(default=False)
    disability_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_bpl_card_holder = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['relationship', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_relationship_display()}) for {self.user.email}"


# ==============================================================================
# Feature: AI Certificate Validity & Monitoring Models
# ==============================================================================
class CertificateValidityRule(models.Model):
    """
    Configurable official validity rules by certificate type, state, district,
    and issuing authority. Backed by verified official government sources.
    """
    certificate_type = models.CharField(
        max_length=50,
        choices=DocumentTypeChoices.choices,
        db_index=True
    )
    state = models.CharField(max_length=100, default='All India', db_index=True)
    district = models.CharField(max_length=100, blank=True)
    issuing_authority = models.CharField(max_length=255, blank=True)
    validity_duration_months = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Validity duration in months (e.g., 12 for 1 year, 36 for 3 years). Null if no expiry or variable."
    )
    has_no_general_expiry = models.BooleanField(
        default=False,
        help_text="True if certificates of this type do not expire generally (e.g. permanent caste or marks cards)"
    )
    effective_date = models.DateField(null=True, blank=True)
    official_source_url = models.URLField(max_length=500, blank=True)
    source_verification_date = models.DateField(null=True, blank=True)
    rule_status = models.CharField(max_length=30, default='ACTIVE')
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['state', 'certificate_type']

    def __str__(self):
        duration = "No Expiry" if self.has_no_general_expiry else f"{self.validity_duration_months} mo"
        return f"{self.get_certificate_type_display()} ({self.state}) - {duration}"


class ProfileProposalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending User Review'
    ACCEPTED = 'ACCEPTED', 'Accepted & Applied'
    REJECTED = 'REJECTED', 'Rejected by User'


class ProfileUpdateProposal(models.Model):
    """
    Stores proposed profile field updates extracted from certificates.
    MUST NEVER automatically update profile fields without explicit user consent.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile_update_proposals')
    document = models.ForeignKey(UserDocument, on_delete=models.CASCADE, related_name='proposals')
    field_name = models.CharField(max_length=100)
    field_label = models.CharField(max_length=150)
    current_value = models.CharField(max_length=500, blank=True)
    extracted_value = models.CharField(max_length=500)
    ocr_confidence = models.FloatField(default=1.0)
    status = models.CharField(
        max_length=20,
        choices=ProfileProposalStatus.choices,
        default=ProfileProposalStatus.PENDING,
        db_index=True
    )
    is_sensitive = models.BooleanField(default=False)
    holder_mismatch_warning = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Proposal for {self.user.email}: {self.field_label} ({self.status})"


class ProfileUpdateAuditLog(models.Model):
    """
    Audit history tracking confirmed and rejected profile updates.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile_audit_logs')
    document = models.ForeignKey(UserDocument, null=True, on_delete=models.SET_NULL, related_name='audit_logs')
    field_name = models.CharField(max_length=100)
    previous_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    decision = models.CharField(max_length=20)  # ACCEPTED or REJECTED
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.email} - {self.field_name}: {self.decision} at {self.timestamp}"


class CertificateExpiryMilestone(models.Model):
    """
    Prevents duplicate notifications for certificate expiry milestones (30d, 15d, 7d, 0d, expired).
    """
    document = models.ForeignKey(UserDocument, on_delete=models.CASCADE, related_name='milestones')
    milestone = models.CharField(max_length=30)  # e.g. '30_DAYS', '15_DAYS', '7_DAYS', 'EXPIRY_DAY', 'AFTER_EXPIRY'
    notified_at = models.DateTimeField(auto_now_add=True)
    channel = models.CharField(max_length=30, default='IN_APP_AND_EMAIL')

    class Meta:
        unique_together = ('document', 'milestone')
        ordering = ['-notified_at']

    def __str__(self):
        return f"Milestone {self.milestone} on Doc #{self.document_id} at {self.notified_at}"

