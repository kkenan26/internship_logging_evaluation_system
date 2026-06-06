from django.db import models
from users.models import CustomUser
from django.core.exceptions import ValidationError
import os
from django.core.validators import FileExtensionValidator
from decimal import Decimal

def validate_file_size(file):
    """
    Validate that the uploaded file is not too large.
    Maximum size: 10MB
    """
    file_size = file.size
    limit_mb = 10
    if file_size > limit_mb * 1024 * 1024:
        raise ValidationError(f'File size must not exceed {limit_mb}MB')


def placement_letter_path(instance, filename):
    """Upload acceptance letters to: media/placement_letters/<student_id>/<filename>"""
    return f'placement_letters/{instance.student.id}/{filename}'


class InternshipPlacement(models.Model):
    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('active',    'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    student = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='placements',
        limit_choices_to={'role': 'student'}
    )
    workplace_supervisor = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='supervised_placements',
        limit_choices_to={'role': 'workplace_supervisor'}
    )
    academic_supervisor = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='academic_supervisions',
        limit_choices_to={'role': 'academic_supervisor'}
    )
    company_name    = models.CharField(max_length=200)
    company_address = models.TextField()
    start_date      = models.DateField()
    end_date        = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # Acceptance letter uploaded by the student
    acceptance_letter = models.FileField(
        upload_to=placement_letter_path,
        null=True, blank=True
    )
    letter_submitted_at = models.DateTimeField(null=True, blank=True)

    # Computed total score from evaluations
    total_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Weighted total score from academic and workplace evaluations"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['student', 'start_date', 'end_date']),
            models.Index(fields=['status']),
            models.Index(fields=['academic_supervisor']),
            models.Index(fields=['workplace_supervisor']),
        ]

    def clean(self):
        if self.start_date and self.end_date:
            if self.start_date > self.end_date:
                raise ValidationError("Start date cannot be after end date.")

        if self.student_id:
            overlapping = InternshipPlacement.objects.filter(
                student=self.student,
                start_date__lte=self.end_date,
                end_date__gte=self.start_date,
                status__in=['pending', 'active']
            ).exclude(id=self.id)
            if overlapping.exists():
                raise ValidationError(
                    "Student already has a pending or active internship during this period."
                )

    def calculate_total_score(self):
        """
        Calculate weighted total score from evaluations.
        Weights: 40% workplace, 30% academic, 30% logbook (placeholder).
        """
        from evaluations.models import AcademicEvaluation, WorkplaceEvaluation
        from logbook.models import WeeklyLog

        academic_score = AcademicEvaluation.objects.filter(
            student=self.student, placement=self
        ).aggregate(avg=models.Avg('score'))['avg'] or 0

        workplace_score = WorkplaceEvaluation.objects.filter(
            student=self.student, placement=self
        ).aggregate(avg=models.Avg('score'))['avg'] or 0

        # Placeholder for logbook score (average of approved logs)
        logbook_score = WeeklyLog.objects.filter(
            student=self.student, placement=self, status='approved'
        ).count() * 10  # Simple: 10 points per approved log

        total = (Decimal(workplace_score) * Decimal('0.4') +
                 Decimal(academic_score) * Decimal('0.3') +
                 Decimal(logbook_score) * Decimal('0.3'))

        self.total_score = round(total, 2)
        self.save(update_fields=['total_score'])

    def __str__(self):
        return f"{self.student.username} at {self.company_name}"