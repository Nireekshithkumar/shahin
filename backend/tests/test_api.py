from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.opportunities.models import Opportunity
from apps.workflows.models import EligibilityWorkflow

class APITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='apitestuser',
            email='apitest@example.com',
            password='Password@123'
        )
        self.opp = Opportunity.objects.create(
            title='National Merit Scholarship',
            provider='Ministry of Education',
            applicable_state='All India',
            education_levels=['UNDERGRADUATE'],
            max_annual_income=Decimal('300000.00'),
            benefit_amount=Decimal('20000.00')
        )

    def test_user_registration(self):
        res = self.client.post('/api/auth/register/', {
            'email': 'newstudent@example.com',
            'password': 'StrongPassword@123',
            'full_name': 'Aarav Patel'
        })
        self.assertEqual(res.status_code, 201)
        self.assertIn('tokens', res.data)
        self.assertIn('access', res.data['tokens'])

    def test_user_login(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'apitest@example.com',
            'password': 'Password@123'
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn('tokens', res.data)

    def test_opportunity_list_api(self):
        res = self.client.get('/api/opportunities/')
        self.assertEqual(res.status_code, 200)

    def test_ai_chat_api(self):
        res = self.client.post('/api/ai/chat/', {
            'message': 'Which scholarships are available for engineering students?'
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn('answer', res.data)

    def test_workflow_direct_execution(self):
        workflow_def = {
            'nodes': [
                {
                    'id': 'n1',
                    'type': 'inputNode',
                    'data': {'fieldKey': 'annual_family_income', 'defaultValue': 200000}
                },
                {
                    'id': 'n2',
                    'type': 'logicNode',
                    'data': {'field': 'annual_family_income', 'operator': 'LESS_THAN_OR_EQUAL', 'targetValue': 250000}
                }
            ],
            'edges': [
                {'id': 'e1', 'source': 'n1', 'target': 'n2'}
            ]
        }
        res = self.client.post('/api/workflows/execute-direct/', {
            'nodes': workflow_def['nodes'],
            'edges': workflow_def['edges'],
            'input_data': {'annual_family_income': 200000}
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('result_status', res.data)
        self.assertIn('execution_logs', res.data)
