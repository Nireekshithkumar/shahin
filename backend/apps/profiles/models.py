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
    DOMICILE_CERTIFICATE = 'DOMICILE_CERTIFICATE', 'Domicile / Residence Certificate'
    DISABILITY_CERTIFICATE = 'DISABILITY_CERTIFICATE', 'Disability (PwD / UDID) Certificate'
    MARKS_CARD = 'MARKS_CARD', 'Marks Card / Grade Sheet / Transcript'
    AADHAAR_CARD = 'AADHAAR_CARD', 'Aadhaar / Identity Proof'
    BANK_PASSBOOK = 'BANK_PASSBOOK', 'Bank Passbook / Cancelled Cheque'
    REJECTION_LETTER = 'REJECTION_LETTER', 'Official Rejection Notice / Letter'
    ADMISSION_RECEIPT = 'ADMISSION_RECEIPT', 'College Admission Proof / Fee Receipt'
    RATION_CARD = 'RATION_CARD', 'Ration Card (BPL / AAY)'
    OTHER = 'OTHER', 'Other Supporting Document'


class ReadabilityChoices(models.TextChoices):
    READABLE = 'READABLE', 'Clear & Fully Readable'
    BLURRY = 'BLURRY', 'Partially Blurry / Low Quality'
    UNREADABLE = 'UNREADABLE', 'Unreadable / Damaged'


class UserDocument(models.Model):
    """
    Stores encrypted/safe reference to user-uploaded verification documents,
    extracted text via OCR, document type classification, financial year and validity.
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

    # OCR Extraction and Analysis
    extracted_text = models.TextField(blank=True, help_text="OCR extracted text (sensitive numbers masked)")
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

    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.user.email} - {self.get_document_type_display()} ({self.original_filename})"


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

