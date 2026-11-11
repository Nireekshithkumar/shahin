from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import User, UserRole
from apps.opportunities.models import Opportunity, VerificationStatus, ApplicationStatus
from apps.profiles.models import UserProfile, UserDocument, FamilyMemberProfile, DocumentTypeChoices
from apps.profiles.document_service import DocumentAnalysisService
from apps.ai_assistant.ai_services import VoiceAssistantEngine, FormAssistantEngine, RejectionAnalyzerEngine
from apps.opportunities.benefit_calculator import GovernmentBenefitCalculator

class RBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create(
            username='admin_test',
            email='admin@gamil.com',
            role=UserRole.ADMIN,
            is_staff=True,
            is_superuser=True
        )
        self.admin.set_password('admin@1234')
        self.admin.save()

        # Normal Citizen
        self.citizen = User.objects.create(
            username='citizen_test',
            email='citizen@example.com',
            role=UserRole.CITIZEN,
            is_staff=False,
            is_superuser=False
        )
        self.citizen.set_password('Citizen@123')
        self.citizen.save()

        # Sample Opportunity
        self.opportunity = Opportunity.objects.create(
            title='Central Post-Matric Scholarship',
            provider='Ministry of Social Justice',
            applicable_state='All India',
            benefit_amount=Decimal('50000.00'),
            max_annual_income=Decimal('250000.00'),
            verification_status=VerificationStatus.PENDING_VERIFICATION,
            is_draft=False
        )

    def test_single_admin_enforcement(self):
        """Ensures attempting to create a second ADMIN raises an error."""
        with self.assertRaises(ValueError):
            User.objects.create(
                username='second_admin',
                email='second_admin@example.com',
                role=UserRole.ADMIN
            )

    def test_public_registration_cannot_create_admin(self):
        """Ensures public registration ignores any passed role and sets role to CITIZEN."""
        res = self.client.post('/api/auth/register/', {
            'email': 'hacker@example.com',
            'password': 'Password@123',
            'full_name': 'Attacker',
            'role': 'ADMIN'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        registered_user = User.objects.get(email='hacker@example.com')
        self.assertEqual(registered_user.role, UserRole.CITIZEN)
        self.assertFalse(registered_user.is_staff)
        self.assertFalse(registered_user.is_superuser)

    def test_normal_user_cannot_access_admin_dashboard(self):
        """Ensures normal users receive HTTP 403 Forbidden on Admin Hub APIs."""
        self.client.force_authenticate(user=self.citizen)
        res = self.client.get('/api/admin-hub/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_normal_user_cannot_create_opportunity(self):
        """Ensures normal users receive HTTP 403 Forbidden when trying to create a scholarship."""
        self.client.force_authenticate(user=self.citizen)
        res = self.client.post('/api/opportunities/', {
            'title': 'Fake Scholarship by Citizen',
            'provider': 'Unauthorized Citizen',
            'applicable_state': 'All India'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_verify_and_publish_opportunity(self):
        """Ensures admin can successfully verify and publish schemes."""
        self.client.force_authenticate(user=self.admin)
        res_verify = self.client.post(f'/api/opportunities/{self.opportunity.id}/verify/')
        self.assertEqual(res_verify.status_code, status.HTTP_200_OK)

        self.opportunity.refresh_from_db()
        self.assertEqual(self.opportunity.verification_status, VerificationStatus.VERIFIED)

        res_pub = self.client.post(f'/api/opportunities/{self.opportunity.id}/publish/')
        self.assertEqual(res_pub.status_code, status.HTTP_200_OK)
        self.opportunity.refresh_from_db()
        self.assertFalse(self.opportunity.is_draft)


class AIFeaturesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            username='ai_test_user',
            email='aitest@example.com',
            role=UserRole.CITIZEN
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            full_name='Aarav Sharma',
            domicile_state='Karnataka',
            annual_family_income=Decimal('200000.00'),
            category='OBC'
        )
        self.opp = Opportunity.objects.create(
            title='Pragati Engineering Scholarship',
            provider='AICTE',
            applicable_state='Karnataka',
            benefit_amount=Decimal('50000.00'),
            max_annual_income=Decimal('800000.00'),
            required_documents=['Income Certificate', 'Marks Card', 'Aadhaar Card']
        )

    def test_document_readiness_checker(self):
        """Feature 1: Tests document readiness scoring and missing doc identification."""
        UserDocument.objects.create(
            user=self.user,
            document_type=DocumentTypeChoices.INCOME_CERTIFICATE,
            original_filename='income_2025.pdf',
            detected_financial_year='2024-2025'
        )
        report = DocumentAnalysisService.evaluate_readiness_for_opportunity(self.user, self.opp)
        self.assertIn('readiness_percentage', report)
        self.assertEqual(report['fulfilled_count'], 1)
        self.assertEqual(len(report['missing_documents']), 2)

    def test_voice_assistant_kannada_and_hindi(self):
        """Feature 2: Tests multilingual voice responses for Kannada and Hindi."""
        kn_res = VoiceAssistantEngine.process_voice_query("ನನಗೆ ಯಾವ ಸ್ಕಾಲರ್‌ಶಿಪ್ ಸಿಗಬಹುದು?", language='kn', user=self.user)
        self.assertEqual(kn_res['language'], 'kn')
        self.assertTrue(len(kn_res['spoken_answer']) > 0)

        hi_res = VoiceAssistantEngine.process_voice_query("मुझे कौन सी छात्रवृत्ति मिल सकती है?", language='hi', user=self.user)
        self.assertEqual(hi_res['language'], 'hi')
        self.assertTrue(len(hi_res['spoken_answer']) > 0)

    def test_smart_form_assistant(self):
        """Feature 3: Tests form field explanations and profile auto-suggestion."""
        res = FormAssistantEngine.explain_form_field('annual_family_income', user=self.user, opportunity_id=self.opp.id)
        self.assertIn('Income Certificate', res['explanation'])
        self.assertEqual(res['suggested_value'], '200000.00')

    def test_rejection_reason_analyzer(self):
        """Feature 5: Tests parsing and correction checklist for rejection notice."""
        sample_rejection = "Application rejected because declared family income exceeds financial year limit and income certificate RD was expired."
        res = RejectionAnalyzerEngine.analyze_rejection(sample_rejection, opportunity=self.opp)
        self.assertIn('Income Certificate', res['rejection_cause'])
        self.assertTrue(len(res['suggested_corrective_actions']) > 0)
        self.assertTrue(len(res['correction_checklist']) > 0)

    def test_government_benefit_calculator(self):
        """Feature 6: Tests rule-based scholarship and maintenance calculation."""
        calc = GovernmentBenefitCalculator.calculate_benefit(
            opportunity=self.opp,
            education_level='UNDERGRADUATE',
            is_hosteller=True,
            course_years=4,
            annual_income=Decimal('200000.00')
        )
        self.assertEqual(calc['estimated_annual_benefit'], 50000.0)
        self.assertEqual(calc['estimated_multi_year_total'], 200000.0)
        self.assertTrue(calc['income_eligible'])
        self.assertTrue(len(calc['breakdown_items']) >= 3)

    def test_family_based_scheme_discovery(self):
        """Feature 7: Tests discovering farmer and child schemes for family members."""
        farmer_dad = FamilyMemberProfile.objects.create(
            user=self.user,
            name='Ramesh Sharma',
            relationship='FATHER',
            age=52,
            gender='MALE',
            occupation='Farmer',
            state_or_ut='Karnataka',
            annual_income=Decimal('150000.00')
        )
        farmer_scheme = Opportunity.objects.create(
            title='Pradhan Mantri Fasal Bima Yojana (PMFBY)',
            provider='Ministry of Agriculture & Farmers Welfare',
            short_description='Comprehensive crop insurance for farmers against non-preventable natural risks.',
            applicable_state='All India',
            verification_status=VerificationStatus.VERIFIED,
            is_draft=False
        )

        client = APIClient()
        client.force_authenticate(user=self.user)
        res = client.get(f'/api/profile/family/{farmer_dad.id}/schemes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['total_matches'] >= 1)
        self.assertEqual(res.data['recommended_schemes'][0]['family_member_name'], 'Ramesh Sharma')

