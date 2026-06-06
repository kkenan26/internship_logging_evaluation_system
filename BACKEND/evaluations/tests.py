from django.test import TestCase
from django.contrib.auth import get_user_model
from placements.models import InternshipPlacement
from evaluations.models import EvaluationCriteria, AcademicEvaluation

User = get_user_model()

class PlacementTestCase(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='student', role='student')
        self.supervisor = User.objects.create_user(username='supervisor', role='workplace_supervisor')

    def test_placement_creation(self):
        placement = InternshipPlacement.objects.create(
            student=self.student,
            workplace_supervisor=self.supervisor,
            company_name='Test Co',
            company_address='123 Test St',
            start_date='2026-06-01',
            end_date='2026-08-01'
        )
        self.assertEqual(placement.status, 'pending')

class EvaluationTestCase(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='student', role='student')
        self.evaluator = User.objects.create_user(username='evaluator', role='academic_supervisor')
        self.placement = InternshipPlacement.objects.create(
            student=self.student,
            company_name='Test Co',
            start_date='2026-06-01',
            end_date='2026-08-01'
        )
        self.criteria = EvaluationCriteria.objects.create(
            name='Quality', weight=50.00
        )

    def test_evaluation_creation(self):
        eval = AcademicEvaluation.objects.create(
            student=self.student,
            placement=self.placement,
            evaluator=self.evaluator,
            score=85.00
        )
        self.assertEqual(eval.score, 85.00)
