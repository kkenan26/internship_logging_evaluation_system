from django.db import models
from users.models import CustomUser
from placements.models import InternshipPlacement

class EvaluationCriteria(models.Model):
    name = models.CharField(max_length=200, unique= True)
    description = models.TextField()
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    is_active = models.BooleanField(default= True)

    def __str__(self):
        return f"{self.name} ({self.weight}%)"

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
    
class AcademicEvaluation(models.Model):
    placement = models.OneToOneField(
        'placements.InternshipPlacement',
        on_delete= models.CASCADE,
        related_name= 'academic_evaluation'
    )
    academic_supervisor = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role':'academic_supervisor'}
    )
    score= models.FloatField()
    feedback=models.TextField()

    def __str__(self):
        return f"Evaluation - {self.placement.student.username}"