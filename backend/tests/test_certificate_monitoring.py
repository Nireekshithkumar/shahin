from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.profiles.models import (
    UserProfile, UserDocument, DocumentTypeChoices,
    ValidityStatusChoices, AuthenticityStatusChoices,
    CertificateValidityRule, ProfileUpdateProposal, ProfileProposalStatus
)
from apps.profiles.document_service import DocumentAnalysisService
from apps.profiles.validity_engine import CertificateValidityEngine
from apps.profiles.profile_sync_service import ProfileSyncService
from apps.profiles.renewal_service import CertificateRenewalService
from apps.notifications.models import Notification

User = get_user_model()

class CertificateMonitoringSystemTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='citizen',
            email='citizen@example.com',
            password='Password@123'
        )
        self.profile, _ = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                'full_name': 'Aarav Sharma',
                'annual_family_income': Decimal('150000.00'),
                'state_or_ut': 'Karnataka',
                'district': 'Bengaluru Urban'
            }
        )
        CertificateValidityEngine.seed_default_rules()

    def test_structured_ocr_extraction_and_field_parsing(self):
        sample_ocr = (
            "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT\n"
            "NADAKACHERI ATALJI JANASNEHI KENDRA\n"
            "This is to certify that Shri Aarav Sharma son of Ramesh Sharma,\n"
            "residing at Bengaluru Urban, Karnataka has an annual family income of Rs. 1,20,000/-.\n"
            "Certificate No: RD0039482910\n"
            "Date of Issue: 15/01/2026\n"
            "Valid up to: 14/01/2027\n"
            "Issued by: Tahasildar Bengaluru South"
        )
        data = DocumentAnalysisService.extract_structured_certificate_data(
            sample_ocr, "income_cert.pdf", DocumentTypeChoices.INCOME_CERTIFICATE
        )
        self.assertEqual(data['holder_name'], 'Aarav Sharma')
        self.assertEqual(data['certificate_number'], 'RD0039482910')
        self.assertEqual(data['annual_income'], Decimal('120000'))
        self.assertEqual(data['issue_date'], date(2026, 1, 15))
        self.assertEqual(data['expiry_date'], date(2027, 1, 14))
        self.assertEqual(data['state'], 'Karnataka')
        self.assertEqual(data['district'], 'Bengaluru Urban')
        self.assertIn('Tahsildar', data['issuing_authority'])

    def test_mandatory_user_consent_prevents_silent_profile_overwrite(self):
        """Profile MUST NOT be updated before user explicitly consents."""
        extracted_data = {
            'holder_name': 'Aarav Sharma',
            'annual_income': Decimal('120000.00'),
            'state': 'Karnataka',
            'district': 'Dakshina Kannada',
            'confidence': 0.95
        }
        test_file = SimpleUploadedFile("cert.pdf", b"%PDF-1.4 dummy", content_type="application/pdf")
        doc = UserDocument.objects.create(
            user=self.user,
            document_type=DocumentTypeChoices.INCOME_CERTIFICATE,
            document_file=test_file,
            original_filename="income.pdf"
        )

        # Generate proposals
        proposals = ProfileSyncService.generate_proposals_for_document(self.user, doc, extracted_data)
        self.assertTrue(len(proposals) > 0)

        # Verify user profile in DB STILL has original values!
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.annual_family_income, Decimal('150000.00'))
        self.assertEqual(self.profile.district, 'Bengaluru Urban')

        # Test Reject Proposal: profile remains unchanged
        district_proposal = [p for p in proposals if p.field_name == 'district'][0]
        res_reject = ProfileSyncService.decide_proposal(self.user, district_proposal.id, 'REJECTED')
        self.assertFalse(res_reject['applied'])
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.district, 'Bengaluru Urban')

        # Test Accept Proposal: profile is updated ONLY after explicit acceptance
        income_proposal = [p for p in proposals if p.field_name == 'annual_family_income'][0]
        res_accept = ProfileSyncService.decide_proposal(self.user, income_proposal.id, 'ACCEPTED')
        self.assertTrue(res_accept['applied'])
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.annual_family_income, Decimal('120000.00'))
        self.assertTrue(self.profile.income_certificate_available)

    def test_holder_name_mismatch_warning(self):
        """Certificates belonging to another person must trigger mismatch warning."""
        extracted_data = {
            'holder_name': 'Vikramaditya Rao',  # Differs from Aarav Sharma
            'annual_income': Decimal('90000.00'),
            'confidence': 0.95
        }
        test_file = SimpleUploadedFile("cert2.pdf", b"%PDF-1.4 dummy", content_type="application/pdf")
        doc = UserDocument.objects.create(
            user=self.user,
            document_type=DocumentTypeChoices.INCOME_CERTIFICATE,
            document_file=test_file,
            original_filename="income2.pdf"
        )
        proposals = ProfileSyncService.generate_proposals_for_document(self.user, doc, extracted_data)
        for p in proposals:
            self.assertTrue(p.holder_mismatch_warning)

    def test_validity_engine_priorities_and_non_expiring_rules(self):
        today = date.today()

        # 1. Non-expiring document (Marks card) -> NO_EXPIRY_APPLICABLE
        test_file = SimpleUploadedFile("marks.pdf", b"%PDF-1.4", content_type="application/pdf")
        marks_doc = UserDocument.objects.create(
            user=self.user,
            document_type=DocumentTypeChoices.MARKS_CARD,
            document_file=test_file,
            original_filename="marks.pdf"
        )
        CertificateValidityEngine.apply_validity_evaluation(marks_doc)
        self.assertEqual(marks_doc.validity_status, ValidityStatusChoices.NO_EXPIRY_APPLICABLE)
        self.assertIsNone(marks_doc.get_remaining_days())

        # 2. Expired document
        past_exp = today - timedelta(days=10)
        exp_file = SimpleUploadedFile("expired.pdf", b"%PDF-1.4", content_type="application/pdf")
        expired_doc = UserDocument.objects.create(
            user=self.user,
            document_type=DocumentTypeChoices.INCOME_CERTIFICATE,
            document_file=exp_file,
            original_filename="expired.pdf",
            expiry_date=past_exp
        )
        CertificateValidityEngine.apply_validity_evaluation(expired_doc)
        self.assertEqual(expired_doc.validity_status, ValidityStatusChoices.EXPIRED)
        self.assertTrue(expired_doc.is_expired)
        self.assertEqual(expired_doc.get_remaining_days(), -10)

        # 3. Expiring soon document (within 30 days)
        near_exp = today + timedelta(days=12)
        soon_file = SimpleUploadedFile("soon.pdf", b"%PDF-1.4", content_type="application/pdf")
        soon_doc = UserDocument.objects.create(
            user=self.user,
            document_type=DocumentTypeChoices.INCOME_CERTIFICATE,
            document_file=soon_file,
            original_filename="soon.pdf",
            expiry_date=near_exp
        )
        CertificateValidityEngine.apply_validity_evaluation(soon_doc)
        self.assertEqual(soon_doc.validity_status, ValidityStatusChoices.EXPIRING_SOON)
        self.assertEqual(soon_doc.get_remaining_days(), 12)

        # 4. Valid document (greater than 30 days)
        far_exp = today + timedelta(days=90)
        valid_file = SimpleUploadedFile("valid.pdf", b"%PDF-1.4", content_type="application/pdf")
        valid_doc = UserDocument.objects.create(
            user=self.user,
            document_type=DocumentTypeChoices.INCOME_CERTIFICATE,
            document_file=valid_file,
            original_filename="valid.pdf",
            expiry_date=far_exp
        )
        CertificateValidityEngine.apply_validity_evaluation(valid_doc)
        self.assertEqual(valid_doc.validity_status, ValidityStatusChoices.VALID)
        self.assertEqual(valid_doc.get_remaining_days(), 90)

    def test_authenticity_status_is_separate_from_date_validity(self):
        """Date validity must never be conflated with government authenticity."""
        test_file = SimpleUploadedFile("valid.pdf", b"%PDF-1.4", content_type="application/pdf")
        doc = UserDocument.objects.create(
            user=self.user,
            document_type=DocumentTypeChoices.INCOME_CERTIFICATE,
            document_file=test_file,
            original_filename="valid.pdf",
            expiry_date=date.today() + timedelta(days=60)
        )
        CertificateValidityEngine.apply_validity_evaluation(doc)
        # Valid date
        self.assertEqual(doc.validity_status, ValidityStatusChoices.VALID)
        # BUT Authenticity remains NOT VERIFIED unless official verification API is integrated
        self.assertEqual(doc.authenticity_status, AuthenticityStatusChoices.AUTHENTICITY_NOT_VERIFIED)

    def test_renewal_guidance_generation(self):
        test_file = SimpleUploadedFile("income.pdf", b"%PDF-1.4", content_type="application/pdf")
        doc = UserDocument.objects.create(
            user=self.user,
            document_type=DocumentTypeChoices.INCOME_CERTIFICATE,
            document_file=test_file,
            original_filename="income.pdf",
            state='Karnataka'
        )
        guidance = CertificateRenewalService.get_guidance_for_document(doc)
        self.assertIn('Nadakacheri', guidance['portal_name'])
        self.assertIn('https://nadakacheri.karnataka.gov.in', guidance['portal_url'])
        self.assertTrue(len(guidance['procedure']) > 0)
        self.assertTrue(len(guidance['required_documents']) > 0)
