from django.db import models
from users.models import CustomUser
from placements.models import InternshipPlacement
from django.core.validators import MinValueValidator, MaxValueValidator

class EvaluationCriteria(models.Model):
    name = models.CharField(max_length=200, unique= True)
    description = models.TextField()
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    is_active = models.BooleanField(default= True)

    def __str__(self):
        return f"{self.name} ({self.weight}%)"

class AcademicEvaluation(models.Model):
    student = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='academic_evaluations',
        limit_choices_to={'role': 'student'}
    )
    placement = models.ForeignKey(
        InternshipPlacement,
        on_delete=models.CASCADE,
        related_name='academic_evaluations'
    )
    evaluator = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='academic_given_evaluations',
        limit_choices_to={'role': 'academic_supervisor'}
    )
    score = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    comments = models.TextField(blank=True, null=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['student', 'placement']

    def __str__(self):
        return f"Academic Eval: {self.student.username} - {self.score}"

class WorkplaceEvaluation(models.Model):
    student = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='workplace_evaluations',
        limit_choices_to={'role': 'student'}
    )
    placement = models.ForeignKey(
        InternshipPlacement,
        on_delete=models.CASCADE,
        related_name='workplace_evaluations'
    )
    evaluator = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='workplace_given_evaluations',
        limit_choices_to={'role': 'workplace_supervisor'}
    )
    score = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    comments = models.TextField(blank=True, null=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['student', 'placement']

    def __str__(self):
        return f"Workplace Eval: {self.student.username} - {self.score}"

class Evaluation(models.Model):
    student = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='evaluations',
        limit_choices_to={'role': 'student'}
    )
    placement = models.ForeignKey(
        InternshipPlacement,
        on_delete=models.CASCADE,
        related_name='evaluations'
    )
    evaluator = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='given_evaluations'
    )
    criteria = models.ForeignKey(
        EvaluationCriteria,
        on_delete=models.CASCADE
    )
    score = models.DecimalField(max_digits=5, decimal_places=2)
    comments = models.TextField(blank=True, null=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['student', 'placement', 'criteria']
        indexes = [
            models.Index(fields=['student', 'evaluated_at']),
            models.Index(fields=['evaluator']),
            models.Index(fields=['placement']),
            models.Index(fields=['score']),
        ]

    def __str__(self):
        return f"{self.student.username} - {self.criteria.name}: {self.score}"