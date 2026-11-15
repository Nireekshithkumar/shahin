from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from apps.profiles.models import (
    UserDocument, CertificateValidityRule, DocumentTypeChoices,
    ValidityStatusChoices, AuthenticityStatusChoices
)

class CertificateValidityEngine:
    """
    Intelligent Rule-Based Certificate Validity Engine for Government Scheme Assist AI.
    Implements 3-tier priority resolution:
      - Priority 1: Explicit expiry date printed on certificate.
      - Priority 2: Official state/authority validity duration rule.
      - Priority 3: Scheme-specific or document-nature defaults (permanent vs session).
    Strictly separates Date Validity from Government Authenticity.
    """

    DEFAULT_WARNING_DAYS = 30

    @classmethod
    def evaluate_document_validity(cls, doc: UserDocument) -> dict:
        """
        Evaluates a UserDocument and returns {
          'validity_status': str,
          'expiry_date': date or None,
          'remaining_days': int or None,
          'validity_source': str,
          'authenticity_status': str,
          'notes': str
        }
        """
        today = date.today()
        doc_type = doc.document_type
        warning_days = doc.warning_period_days or cls.DEFAULT_WARNING_DAYS

        # Check non-expiring types inherently
        inherent_no_expiry_types = {
            DocumentTypeChoices.MARKS_CARD,
            DocumentTypeChoices.AADHAAR_CARD,
            DocumentTypeChoices.BANK_PASSBOOK,
        }
        if doc_type in inherent_no_expiry_types:
            return {
                'validity_status': ValidityStatusChoices.NO_EXPIRY_APPLICABLE,
                'expiry_date': None,
                'remaining_days': None,
                'validity_source': 'Inherent Document Nature: Permanent Academic / Identity Record',
                'authenticity_status': doc.authenticity_status or AuthenticityStatusChoices.AUTHENTICITY_NOT_VERIFIED,
                'notes': 'Document does not have a general expiry date under government guidelines.'
            }

        # Priority 1: Explicit expiry date printed on the certificate
        target_expiry = doc.expiry_date or doc.detected_expiry_date
        validity_source = ""

        if target_expiry:
            validity_source = "Priority 1: Explicit printed expiry date on certificate"
        else:
            # Priority 2: Check official validity rules database for (cert_type, state)
            state_query = doc.state.strip() if doc.state else 'All India'
            rule = CertificateValidityRule.objects.filter(
                certificate_type=doc_type,
                is_active=True
            ).filter(state__iexact=state_query).first()

            if not rule and state_query != 'All India':
                # Fallback to All India rule
                rule = CertificateValidityRule.objects.filter(
                    certificate_type=doc_type,
                    state__iexact='All India',
                    is_active=True
                ).first()

            if rule:
                if rule.has_no_general_expiry:
                    return {
                        'validity_status': ValidityStatusChoices.NO_EXPIRY_APPLICABLE,
                        'expiry_date': None,
                        'remaining_days': None,
                        'validity_source': f"Priority 2: Official Rule ({rule.state}) - Permanent / No Expiry",
                        'authenticity_status': doc.authenticity_status or AuthenticityStatusChoices.AUTHENTICITY_NOT_VERIFIED,
                        'notes': rule.notes or 'No general expiry applicable as per verified state notification.'
                    }
                elif rule.validity_duration_months and doc.issue_date:
                    target_expiry = doc.issue_date + relativedelta(months=rule.validity_duration_months)
                    validity_source = f"Priority 2: Official Rule ({rule.state}) - {rule.validity_duration_months} Months from Issue Date"

        # If no explicit date and no duration rule can calculate expiry
        if not target_expiry:
            # Check if this document type is generally considered permanent
            if doc_type in [DocumentTypeChoices.CASTE_CERTIFICATE, DocumentTypeChoices.NATIVITY_CERTIFICATE]:
                return {
                    'validity_status': ValidityStatusChoices.NO_EXPIRY_APPLICABLE,
                    'expiry_date': None,
                    'remaining_days': None,
                    'validity_source': 'Priority 3: General Government Notification (Permanent Caste/Nativity)',
                    'authenticity_status': doc.authenticity_status or AuthenticityStatusChoices.AUTHENTICITY_NOT_VERIFIED,
                    'notes': 'Permanent certificate. No expiry date applicable unless re-verification is ordered.'
                }

            return {
                'validity_status': ValidityStatusChoices.VERIFICATION_REQUIRED,
                'expiry_date': None,
                'remaining_days': None,
                'validity_source': 'No explicit expiry date or issue date available for rule evaluation',
                'authenticity_status': doc.authenticity_status or AuthenticityStatusChoices.AUTHENTICITY_NOT_VERIFIED,
                'notes': 'VERIFICATION REQUIRED: Expiry information is missing or unclear. Please verify certificate dates.'
            }

        # Calculate remaining days and determine status
        remaining_days = (target_expiry - today).days

        if remaining_days < 0:
            status = ValidityStatusChoices.EXPIRED
            notes = f"EXPIRED: Established validity expired on {target_expiry} ({abs(remaining_days)} days ago)."
        elif remaining_days <= warning_days:
            status = ValidityStatusChoices.EXPIRING_SOON
            notes = f"EXPIRING SOON: Certificate will expire in {remaining_days} days on {target_expiry}. Prepare renewal."
        else:
            status = ValidityStatusChoices.VALID
            notes = f"VALID: Certificate is valid until {target_expiry} ({remaining_days} days remaining)."

        return {
            'validity_status': status,
            'expiry_date': target_expiry,
            'remaining_days': remaining_days,
            'validity_source': validity_source,
            'authenticity_status': doc.authenticity_status or AuthenticityStatusChoices.AUTHENTICITY_NOT_VERIFIED,
            'notes': notes
        }

    @classmethod
    def apply_validity_evaluation(cls, doc: UserDocument, save: bool = True) -> UserDocument:
        """Evaluates and updates the document model fields."""
        res = cls.evaluate_document_validity(doc)
        doc.validity_status = res['validity_status']
        if res['expiry_date']:
            doc.expiry_date = res['expiry_date']
            doc.detected_expiry_date = res['expiry_date']
        doc.is_expired = (res['validity_status'] == ValidityStatusChoices.EXPIRED)
        if save:
            doc.save(update_fields=['validity_status', 'expiry_date', 'detected_expiry_date', 'is_expired'])
        return doc

    @classmethod
    def seed_default_rules(cls):
        """Seeds standard verified government certificate validity rules across India."""
        rules_data = [
            # Central & All India Rules
            {
                'certificate_type': DocumentTypeChoices.EWS_CERTIFICATE,
                'state': 'All India',
                'validity_duration_months': 12,
                'has_no_general_expiry': False,
                'official_source_url': 'https://dopt.gov.in',
                'notes': 'Central EWS certificate is valid for 1 Financial Year (April 1 to March 31).'
            },
            {
                'certificate_type': DocumentTypeChoices.CASTE_CERTIFICATE,
                'state': 'All India',
                'validity_duration_months': None,
                'has_no_general_expiry': True,
                'official_source_url': 'https://socialjustice.gov.in',
                'notes': 'SC/ST certificates issued under central format carry lifetime validity.'
            },
            {
                'certificate_type': DocumentTypeChoices.DISABILITY_CERTIFICATE,
                'state': 'All India',
                'validity_duration_months': None,
                'has_no_general_expiry': True,
                'official_source_url': 'https://www.swavlambancard.gov.in',
                'notes': 'Permanent Disability UDID cards have lifetime validity. Temporary certificates valid for 5 years.'
            },
            {
                'certificate_type': DocumentTypeChoices.MARKS_CARD,
                'state': 'All India',
                'validity_duration_months': None,
                'has_no_general_expiry': True,
                'official_source_url': 'https://cbse.gov.in',
                'notes': 'Official marks sheets and grade transcripts have permanent validity.'
            },
            {
                'certificate_type': DocumentTypeChoices.AADHAAR_CARD,
                'state': 'All India',
                'validity_duration_months': None,
                'has_no_general_expiry': True,
                'official_source_url': 'https://uidai.gov.in',
                'notes': 'Aadhaar identity proof does not expire. Biometrics may require periodic update.'
            },
            {
                'certificate_type': DocumentTypeChoices.BONAFIDE_CERTIFICATE,
                'state': 'All India',
                'validity_duration_months': 12,
                'has_no_general_expiry': False,
                'official_source_url': 'https://education.gov.in',
                'notes': 'Bonafide / Study certificate is valid for the registered academic session (1 year).'
            },

            # Karnataka State Rules
            {
                'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
                'state': 'Karnataka',
                'validity_duration_months': 12,
                'has_no_general_expiry': False,
                'official_source_url': 'https://nadakacheri.karnataka.gov.in',
                'notes': 'Karnataka Revenue Department (Nadakacheri) Income Certificates have a 1-year validity from issue date.'
            },
            {
                'certificate_type': DocumentTypeChoices.CASTE_CERTIFICATE,
                'state': 'Karnataka',
                'validity_duration_months': None,
                'has_no_general_expiry': True,
                'official_source_url': 'https://nadakacheri.karnataka.gov.in',
                'notes': 'Karnataka Category-1, SC and ST caste certificates have lifetime validity.'
            },
            {
                'certificate_type': DocumentTypeChoices.DOMICILE_CERTIFICATE,
                'state': 'Karnataka',
                'validity_duration_months': 60,
                'has_no_general_expiry': False,
                'official_source_url': 'https://sevasindhu.karnataka.gov.in',
                'notes': 'Karnataka Residence / Domicile certificate is valid for 5 years.'
            },

            # Maharashtra State Rules
            {
                'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
                'state': 'Maharashtra',
                'validity_duration_months': 36,
                'has_no_general_expiry': False,
                'official_source_url': 'https://aaplesarkar.mahaonline.gov.in',
                'notes': 'Maharashtra Aaple Sarkar 3-year income certificate option is valid for 3 Financial Years.'
            },

            # Tamil Nadu State Rules
            {
                'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
                'state': 'Tamil Nadu',
                'validity_duration_months': 12,
                'has_no_general_expiry': False,
                'official_source_url': 'https://tnesevai.tn.gov.in',
                'notes': 'Tamil Nadu e-Sevai Income Certificate valid for 6 months to 1 year.'
            },

            # Uttar Pradesh State Rules
            {
                'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
                'state': 'Uttar Pradesh',
                'validity_duration_months': 36,
                'has_no_general_expiry': False,
                'official_source_url': 'https://edistrict.up.gov.in',
                'notes': 'UP eDistrict Income Certificate is valid for 3 years from the date of issuance.'
            },
        ]

        created_count = 0
        for r in rules_data:
            obj, created = CertificateValidityRule.objects.get_or_create(
                certificate_type=r['certificate_type'],
                state=r['state'],
                defaults={
                    'validity_duration_months': r.get('validity_duration_months'),
                    'has_no_general_expiry': r.get('has_no_general_expiry', False),
                    'official_source_url': r.get('official_source_url', ''),
                    'notes': r.get('notes', ''),
                    'is_active': True
                }
            )
            if created:
                created_count += 1
        return created_count
