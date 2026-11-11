import datetime
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase
from django.utils import timezone
from django.core import mail
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, UserRole
from apps.accounts.tokens import generate_email_verification_token, verify_email_token
from apps.profiles.models import UserProfile, GenderChoices, EducationLevel, CategoryChoices
from apps.opportunities.models import (
    Opportunity, OpportunityType, ApplicationStatus, VerificationStatus, GovernmentLevel
)
from apps.applications.models import SavedOpportunity, ApplicationTracker
from apps.notifications.models import (
    Notification,
    UserNotificationPreference,
    EmailDeliveryLog,
    EmailDeliveryStatus,
    NotificationType,
    OpportunitySubscription,
    OpportunityChangeEvent
)
from apps.notifications.email_service import EmailService
from apps.notifications.tasks import (
    scan_upcoming_deadlines_task,
    notify_new_opportunity_task,
    process_opportunity_changes_task,
    send_weekly_digests_task,
    send_tracker_reminders_task,
    process_email_retries_task,
    cleanup_expired_notifications_task,
)

class NotificationSystemTests(TestCase):
    def setUp(self):
        # Ensure console/locmem email backend is used in test
        self.client = APIClient()

        # Create verified student user
        self.user = User.objects.create_user(
            email='student@example.com',
            password='password123',
            username='student',
            role=UserRole.CITIZEN,
            is_email_verified=True
        )

        # Create user profile
        self.profile = UserProfile.objects.create(
            user=self.user,
            full_name='Aarav Sharma',
            gender=GenderChoices.MALE,
            state_or_ut='Karnataka',
            current_education_level=EducationLevel.UNDERGRADUATE,
            course_name='B.Tech Computer Science',
            course_stream='Engineering',
            annual_family_income=Decimal('200000.00'),
            academic_percentage=Decimal('82.50'),
            category=CategoryChoices.OBC,
        )

        # Initialize notification preference
        self.pref, _ = UserNotificationPreference.objects.get_or_create(
            user=self.user,
            defaults={
                'reminder_days_before': [30, 14, 7, 3, 1],
                'email_notifications_enabled': True,
                'deadline_reminders_enabled': True,
            }
        )

        # Create test opportunity
        today = timezone.localtime(timezone.now()).date()
        self.opp = Opportunity.objects.create(
            title='Karnataka Post-Matric State Scholarship',
            provider='Department of Social Welfare, Karnataka',
            opportunity_type=OpportunityType.SCHOLARSHIP,
            government_level=GovernmentLevel.STATE,
            applicable_state='Karnataka',
            education_levels=['UNDERGRADUATE'],
            max_annual_income=Decimal('250000.00'),
            min_academic_percentage=Decimal('60.00'),
            eligible_categories=['OBC', 'SC', 'ST'],
            benefit_amount=Decimal('50000.00'),
            application_opening_date=today - datetime.timedelta(days=10),
            application_closing_date=today + datetime.timedelta(days=7),
            application_status=ApplicationStatus.OPEN,
            verification_status=VerificationStatus.OFFICIAL_VERIFIED,
            official_application_url='https://ssp.postmatric.karnataka.gov.in',
            required_documents=['Income Certificate', 'Caste Certificate', 'Previous Marksheet']
        )

        mail.outbox.clear()

    # =========================================================================
    # 1. Email Verification Flow
    # =========================================================================

    def test_email_verification_token_generation_and_validation(self):
        unverified_user = User.objects.create_user(
            email='newstudent@example.com',
            username='newstudent',
            password='secretpassword',
            is_email_verified=False
        )


        token = generate_email_verification_token(unverified_user)
        self.assertTrue(len(token) > 20)

        # Validate token
        valid, user, msg = verify_email_token(token)
        self.assertTrue(valid)
        self.assertEqual(user.id, unverified_user.id)

        # Test API endpoint
        response = self.client.post('/api/auth/verify-email/', {'token': token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        unverified_user.refresh_from_db()
        self.assertTrue(unverified_user.is_email_verified)

    def test_unverified_user_suppresses_opportunity_alerts(self):
        self.user.is_email_verified = False
        self.user.save()

        log = EmailService.send_deadline_reminder(self.user, self.opp, days_remaining=7)
        self.assertIsNone(log)
        self.assertEqual(len(mail.outbox), 0)

    # =========================================================================
    # 2. User Preferences CRUD & Validation
    # =========================================================================

    def test_user_preferences_api(self):
        self.client.force_authenticate(user=self.user)

        # GET preferences
        res = self.client.get('/api/notifications/preferences/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['email_notifications_enabled'])
        self.assertEqual(res.data['reminder_days_before'], [30, 14, 7, 3, 1])

        # PATCH preferences
        payload = {
            'reminder_days_before': [14, 7, 1, 0],
            'deadline_day_reminder_enabled': True,
            'preferred_language': 'kn',
            'max_emails_per_day': 3,
            'include_potentially_eligible': True,
        }
        patch_res = self.client.patch('/api/notifications/preferences/', payload, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['reminder_days_before'], [14, 7, 1, 0])
        self.assertTrue(patch_res.data['include_potentially_eligible'])
        self.assertEqual(patch_res.data['preferred_language'], 'kn')

        # Invalid intervals test
        bad_res = self.client.patch('/api/notifications/preferences/', {'reminder_days_before': 'invalid'}, format='json')
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # 3. Timezone-Aware Deadline Calculations & Every Configured Interval
    # =========================================================================

    def test_all_configured_reminder_intervals(self):
        """
        Verify deadline reminders trigger for all intervals: 30, 14, 7, 3, 1, 0 (Today).
        """
        SavedOpportunity.objects.create(user=self.user, opportunity=self.opp)
        self.pref.reminder_days_before = [30, 14, 7, 3, 1]
        self.pref.deadline_day_reminder_enabled = True
        self.pref.max_emails_per_day = 50
        self.pref.save()

        today = timezone.localtime(timezone.now()).date()
        test_intervals = [30, 14, 7, 3, 1, 0]


        for interval in test_intervals:
            mail.outbox.clear()
            self.opp.application_closing_date = today + datetime.timedelta(days=interval)
            self.opp.save()

            log = EmailService.send_deadline_reminder(self.user, self.opp, days_remaining=interval)
            self.assertIsNotNone(log)
            self.assertEqual(log.status, EmailDeliveryStatus.SENT)
            self.assertEqual(len(mail.outbox), 1)

            if interval == 0:
                self.assertIn("DEADLINE TODAY", mail.outbox[0].body)
            elif interval == 1:
                self.assertIn("1 Day Remaining", mail.outbox[0].body)
            else:
                self.assertIn(f"{interval} Days Remaining", mail.outbox[0].body)

    def test_scan_upcoming_deadlines_task(self):
        SavedOpportunity.objects.create(user=self.user, opportunity=self.opp)
        today = timezone.localtime(timezone.now()).date()
        self.opp.application_closing_date = today + datetime.timedelta(days=7)
        self.opp.save()

        mail.outbox.clear()
        scan_upcoming_deadlines_task()
        self.assertGreaterEqual(len(mail.outbox), 1)
        self.assertIn("Karnataka Post-Matric", mail.outbox[0].subject)

    # =========================================================================
    # 4. Closed, Expired, and Missing Deadlines Handling
    # =========================================================================

    def test_closed_and_expired_opportunity_suppressed(self):
        SavedOpportunity.objects.create(user=self.user, opportunity=self.opp)
        self.opp.application_status = ApplicationStatus.CLOSED
        self.opp.save()

        mail.outbox.clear()
        log = EmailService.send_deadline_reminder(self.user, self.opp, days_remaining=7)
        self.assertIsNone(log)
        self.assertEqual(len(mail.outbox), 0)

    def test_missing_deadline_handled_gracefully(self):
        self.opp.application_closing_date = None
        self.opp.save()

        # Should not raise exception
        mail.outbox.clear()
        scan_upcoming_deadlines_task()
        self.assertEqual(len(mail.outbox), 0)

    # =========================================================================
    # 5. Duplicate Prevention & Idempotency
    # =========================================================================

    def test_duplicate_prevention_on_deadline_reminder(self):
        SavedOpportunity.objects.create(user=self.user, opportunity=self.opp)
        today = timezone.localtime(timezone.now()).date()
        self.opp.application_closing_date = today + datetime.timedelta(days=7)
        self.opp.save()

        mail.outbox.clear()
        # First send
        log1 = EmailService.send_deadline_reminder(self.user, self.opp, days_remaining=7)
        self.assertIsNotNone(log1)
        self.assertEqual(len(mail.outbox), 1)

        # Second send with identical parameters must be suppressed
        log2 = EmailService.send_deadline_reminder(self.user, self.opp, days_remaining=7)
        self.assertEqual(log1.id, log2.id)
        self.assertEqual(len(mail.outbox), 1)  # No second email sent!

    # =========================================================================
    # 6. Deadline Extension Handling
    # =========================================================================

    def test_deadline_extension_alert_and_reschedule(self):
        SavedOpportunity.objects.create(user=self.user, opportunity=self.opp)
        old_date = self.opp.application_closing_date
        new_date = old_date + datetime.timedelta(days=15)

        mail.outbox.clear()
        # Updating closing date triggers signal creating OpportunityChangeEvent
        self.opp.application_closing_date = new_date
        self.opp.save()

        events = OpportunityChangeEvent.objects.filter(
            opportunity=self.opp,
            change_type=OpportunityChangeEvent.ChangeType.DEADLINE_EXTENDED
        )
        self.assertTrue(events.exists())

        # Process the extension event task
        process_opportunity_changes_task()
        self.assertGreaterEqual(len(mail.outbox), 1)
        self.assertIn("DEADLINE EXTENDED", mail.outbox[0].subject)

    # =========================================================================
    # 7. Personalized Eligibility Matching
    # =========================================================================

    def test_personalized_matching_eligible_alert(self):
        mail.outbox.clear()
        # Opp requires Karnataka + UG + Income < 2.5L. User profile matches all 3!
        log = EmailService.send_new_opportunity_alert(
            user=self.user,
            opportunity=self.opp,
            match_explanation="Matched criteria: Karnataka domicile, Undergraduate course, Income under Rs 2,50,000",
            is_eligibility_match=True
        )
        self.assertIsNotNone(log)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Verified Match", mail.outbox[0].subject)
        self.assertIn("Why this opportunity matches your profile", mail.outbox[0].alternatives[0][0])


    def test_ineligible_opportunity_suppressed_in_matching(self):
        # Change user profile to Kerala (ineligible for Karnataka state scholarship)
        self.profile.state_or_ut = 'Kerala'
        self.profile.domicile_state = 'Kerala'
        self.profile.save()

        mail.outbox.clear()
        notify_new_opportunity_task(self.opp.id)
        # Should not send personalized match email
        sent_matching = [m for m in mail.outbox if "Verified Match" in m.subject]
        self.assertEqual(len(sent_matching), 0)

    def test_potentially_eligible_respects_user_preference(self):
        # Opportunity has no income specified on user profile
        self.profile.annual_family_income = None
        self.profile.save()

        # User has include_potentially_eligible = False by default
        self.pref.include_potentially_eligible = False
        self.pref.save()

        mail.outbox.clear()
        notify_new_opportunity_task(self.opp.id)
        sent = [m for m in mail.outbox if "Verified Match" in m.subject]
        self.assertEqual(len(sent), 0)

        # Now enable include_potentially_eligible = True
        self.pref.include_potentially_eligible = True
        self.pref.save()

        # Delete any previous idempotency key to test fresh evaluation
        EmailDeliveryLog.objects.all().delete()
        mail.outbox.clear()
        notify_new_opportunity_task(self.opp.id)
        sent = [m for m in mail.outbox if "Verified Match" in m.subject]
        self.assertEqual(len(sent), 1)

    # =========================================================================
    # 8. Unsubscribe Behavior (One-Click & Token Validation)
    # =========================================================================

    def test_public_one_click_unsubscribe(self):
        token = self.pref.unsubscribe_token
        self.assertTrue(len(token) > 10)

        # GET validation
        get_res = self.client.get(f'/api/notifications/unsubscribe/?token={token}')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertTrue(get_res.data['valid'])

        # POST unsubscribe
        post_res = self.client.post('/api/notifications/unsubscribe/', {'token': token, 'all': True})
        self.assertEqual(post_res.status_code, status.HTTP_200_OK)

        self.pref.refresh_from_db()
        self.assertFalse(self.pref.email_notifications_enabled)
        self.assertIsNotNone(self.pref.unsubscribed_at)

        # Repeating the request must succeed safely (idempotent)
        repeat_res = self.client.post('/api/notifications/unsubscribe/', {'token': token, 'all': True})
        self.assertEqual(repeat_res.status_code, status.HTTP_200_OK)

        # Subsequent alerts must be completely suppressed
        mail.outbox.clear()
        log = EmailService.send_deadline_reminder(self.user, self.opp, days_remaining=7)
        self.assertIsNone(log)
        self.assertEqual(len(mail.outbox), 0)

    # =========================================================================
    # 9. Email Delivery Failures, Categorization & Retries
    # =========================================================================

    def test_transient_error_marks_retrying_and_recovers(self):
        mail.outbox.clear()

        # Mock socket.timeout to simulate network hiccup
        with patch('django.core.mail.EmailMultiAlternatives.send', side_effect=TimeoutError("Network timeout")):
            log = EmailService.send_deadline_reminder(self.user, self.opp, days_remaining=7)
            self.assertIsNotNone(log)
            self.assertEqual(log.status, EmailDeliveryStatus.RETRYING)
            self.assertEqual(log.error_category, "TIMEOUT")
            self.assertEqual(log.retry_count, 1)

        # Now run process_email_retries_task without error (network recovered)
        # Advance log created_at to bypass backoff delay
        log.created_at = timezone.now() - datetime.timedelta(minutes=10)
        log.save()

        process_email_retries_task()
        log.refresh_from_db()
        self.assertEqual(log.status, EmailDeliveryStatus.SENT)
        self.assertEqual(len(mail.outbox), 1)

    # =========================================================================
    # 10. Weekly Digest & Application Tracker Reminders
    # =========================================================================

    def test_weekly_digest_task(self):
        mail.outbox.clear()
        send_weekly_digests_task()
        self.assertGreaterEqual(len(mail.outbox), 1)
        self.assertIn("Weekly Digest", mail.outbox[0].subject)

    def test_tracker_milestone_reminder(self):
        tracker = ApplicationTracker.objects.create(
            user=self.user,
            opportunity=self.opp,
            status='DOCUMENTS_PENDING',
            documents_checklist=[
                {'name': 'Income Certificate', 'status': 'PENDING'},
                {'name': 'Caste Certificate', 'status': 'READY'}
            ],
            reminder_enabled=True
        )

        mail.outbox.clear()
        send_tracker_reminders_task()
        self.assertGreaterEqual(len(mail.outbox), 1)
        self.assertIn("Application Tracker", mail.outbox[0].subject)

    # =========================================================================
    # 11. Data Retention & Cleanup Policy
    # =========================================================================

    def test_retention_cleanup_purges_old_logs(self):
        # Create an old sent log (>90 days ago)
        old_log = EmailDeliveryLog.objects.create(
            recipient_email=self.user.email,
            subject='Old Log',
            notification_type=NotificationType.DEADLINE_APPROACHING,
            status=EmailDeliveryStatus.SENT,
        )
        EmailDeliveryLog.objects.filter(id=old_log.id).update(
            created_at=timezone.now() - datetime.timedelta(days=100)
        )

        summary = cleanup_expired_notifications_task()
        self.assertIn("logs", summary)
        self.assertFalse(EmailDeliveryLog.objects.filter(id=old_log.id).exists())

    # =========================================================================
    # 12. Security & Authorization
    # =========================================================================

    def test_unauthenticated_access_denied(self):
        # No auth
        res = self.client.get('/api/notifications/preferences/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        res2 = self.client.get('/api/notifications/email-history/')
        self.assertEqual(res2.status_code, status.HTTP_401_UNAUTHORIZED)

        # Admin route denied for citizen
        self.client.force_authenticate(user=self.user)
        admin_res = self.client.get('/api/notifications/admin/stats/')
        self.assertEqual(admin_res.status_code, status.HTTP_403_FORBIDDEN)
