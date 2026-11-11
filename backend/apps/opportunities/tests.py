from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.opportunities.models import (
    Opportunity, OpportunityType, GovernmentLevel, VerificationStatus,
    ScholarshipVisit, OpportunityDeadlineHistory, OpportunityAuditLog, AuditLogAction
)

User = get_user_model()

class OpportunityViewsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='student_tester',
            email='student_tester@example.com',
            password='StrongPassword123!',
            first_name='Student',
            last_name='Tester'
        )
        self.admin = User.objects.create_superuser(
            username='admin_tester',
            email='admin_tester@example.com',
            password='AdminPassword123!',
            first_name='Admin',
            last_name='Tester'
        )

        self.opp = Opportunity.objects.create(
            title='National Pre-Matric Scholarship',
            provider='Ministry of Minority Affairs',
            opportunity_type=OpportunityType.SCHOLARSHIP,
            government_level=GovernmentLevel.CENTRAL,
            applicable_state='All India',
            application_closing_date=date.today() + timedelta(days=20),
            verification_status=VerificationStatus.OFFICIAL_VERIFIED,
            benefit_amount=15000.00
        )

    def test_list_opportunities(self):
        response = self.client.get('/api/opportunities/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertTrue(any(item['id'] == self.opp.id for item in results))

    def test_retrieve_tracks_visit_for_authenticated_user(self):
        self.client.force_authenticate(user=self.user)
        # First view
        res1 = self.client.get(f'/api/opportunities/{self.opp.id}/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        visit = ScholarshipVisit.objects.filter(user=self.user, opportunity=self.opp).first()
        self.assertIsNotNone(visit)
        self.assertEqual(visit.view_count, 1)

        # Second view increments count
        res2 = self.client.get(f'/api/opportunities/{self.opp.id}/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.view_count, 2)

    def test_viewed_opportunities_endpoint(self):
        self.client.force_authenticate(user=self.user)
        # Access opportunity to create visit
        self.client.get(f'/api/opportunities/{self.opp.id}/')

        res = self.client.get('/api/opportunities/viewed/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data.get('results', res.data)
        self.assertTrue(len(data) >= 1)
        self.assertEqual(data[0]['opportunity_id'], self.opp.id)
        self.assertEqual(data[0]['view_count'], 1)

    def test_deadline_history_endpoint(self):
        OpportunityDeadlineHistory.objects.create(
            opportunity=self.opp,
            previous_deadline=date.today() + timedelta(days=5),
            new_deadline=date.today() + timedelta(days=20),
            source_url='https://scholarships.gov.in',
            verification_status='VERIFIED',
            change_summary='Deadline extended by Ministry'
        )

        res = self.client.get(f'/api/opportunities/{self.opp.id}/deadlines/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['change_summary'], 'Deadline extended by Ministry')

    def test_audit_logs_endpoint(self):
        OpportunityAuditLog.objects.create(
            admin_user=self.admin,
            opportunity=self.opp,
            action=AuditLogAction.UPDATE,
            change_summary='Updated closing date'
        )

        # Unauthenticated / non-admin cannot view audit logs
        self.client.force_authenticate(user=self.user)
        res_denied = self.client.get(f'/api/opportunities/{self.opp.id}/audit_logs/')
        self.assertEqual(res_denied.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can view
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.get(f'/api/opportunities/{self.opp.id}/audit_logs/')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_admin.data), 1)
