from decimal import Decimal
from django.test import TestCase
from apps.opportunities.models import Opportunity, OpportunityType, GovernmentLevel, ApplicationStatus
from apps.profiles.models import UserProfile, EducationLevel, GenderChoices, CategoryChoices
from apps.eligibility.engine import EligibilityEngine
from apps.eligibility.models import EligibilityResultStatus
from apps.accounts.models import User

class EligibilityEngineTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='teststudent',
            email='student@example.com',
            password='testpassword123'
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            full_name='Rohan Sharma',
            age=20,
            gender=GenderChoices.MALE,
            state_or_ut='Karnataka',
            current_education_level=EducationLevel.UNDERGRADUATE,
            course_name='B.Tech Computer Science',
            academic_percentage=Decimal('82.50'),
            annual_family_income=Decimal('220000.00'),
            category=CategoryChoices.OBC,
            is_disabled=False
        )

        # Opportunity with specific criteria
        self.central_scheme = Opportunity.objects.create(
            title='Central Engineering Merit Scholarship',
            opportunity_type=OpportunityType.SCHOLARSHIP,
            government_level=GovernmentLevel.CENTRAL,
            applicable_state='All India',
            education_levels=['UNDERGRADUATE'],
            max_annual_income=Decimal('250000.00'),
            min_academic_percentage=Decimal('75.00'),
            eligible_categories=['ALL'],
            eligible_genders=['ALL']
        )

        # Girl child specific scheme
        self.girl_scheme = Opportunity.objects.create(
            title='Pragati Girls Scheme',
            opportunity_type=OpportunityType.SCHOLARSHIP,
            government_level=GovernmentLevel.CENTRAL,
            applicable_state='All India',
            education_levels=['UNDERGRADUATE'],
            eligible_genders=['FEMALE']
        )

        # State specific scheme
        self.maharashtra_scheme = Opportunity.objects.create(
            title='Maharashtra State Assistance',
            opportunity_type=OpportunityType.SCHOLARSHIP,
            government_level=GovernmentLevel.STATE,
            applicable_state='Maharashtra',
            eligible_states=['Maharashtra']
        )

    def test_eligible_match(self):
        """Test candidate meeting all criteria evaluates to ELIGIBLE or POTENTIALLY_ELIGIBLE."""
        res = EligibilityEngine.evaluate(self.central_scheme, profile=self.profile)
        self.assertIn(res['status'], [EligibilityResultStatus.ELIGIBLE, EligibilityResultStatus.POTENTIALLY_ELIGIBLE])
        self.assertEqual(len(res['failed_conditions']), 0)
        self.assertGreater(len(res['matched_conditions']), 0)

    def test_income_limit_boundary_fail(self):
        """Income strictly exceeding ceiling must evaluate to INELIGIBLE."""
        self.profile.annual_family_income = Decimal('300000.00')
        self.profile.save()
        res = EligibilityEngine.evaluate(self.central_scheme, profile=self.profile)
        self.assertEqual(res['status'], EligibilityResultStatus.INELIGIBLE)
        self.assertTrue(any('Income limit exceeded' in f for f in res['failed_conditions']))

    def test_academic_marks_cutoff_fail(self):
        """Score below cutoff must fail mandatory condition."""
        self.profile.academic_percentage = Decimal('65.00')
        self.profile.save()
        res = EligibilityEngine.evaluate(self.central_scheme, profile=self.profile)
        self.assertEqual(res['status'], EligibilityResultStatus.INELIGIBLE)
        self.assertTrue(any('Academic cutoff not met' in f for f in res['failed_conditions']))

    def test_gender_restriction_fail(self):
        """Male profile attempting female-only scheme must fail."""
        res = EligibilityEngine.evaluate(self.girl_scheme, profile=self.profile)
        self.assertEqual(res['status'], EligibilityResultStatus.INELIGIBLE)
        self.assertTrue(any('Gender criteria not met' in f for f in res['failed_conditions']))

    def test_state_restriction_fail(self):
        """Karnataka resident applying for Maharashtra state scheme must fail."""
        res = EligibilityEngine.evaluate(self.maharashtra_scheme, profile=self.profile)
        self.assertEqual(res['status'], EligibilityResultStatus.INELIGIBLE)
        self.assertTrue(any('State mismatch' in f for f in res['failed_conditions']))

    def test_missing_data_never_treated_as_eligible(self):
        """Critical rule: missing values must NOT be treated as eligible match."""
        blank_profile = UserProfile.objects.create(
            user=User.objects.create_user(username='blankuser', email='blank@example.com', password='pw')
        )
        res = EligibilityEngine.evaluate(self.central_scheme, profile=blank_profile)
        self.assertNotEqual(res['status'], EligibilityResultStatus.ELIGIBLE)
        self.assertGreater(len(res['missing_profile_fields']), 0)
