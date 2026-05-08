from django.db import models
from users.models import CustomUser
from django.core.exceptions import ValidationError

class InternshipPlacement(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
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
        null=True, blank= True,
        related_name='supervised_placements',
        limit_choices_to={'role': 'workplace_supervisor'}
    )
    academic_supervisor = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null= True, blank=True,
        related_name= 'academic_supervisions',
        limit_choices_to = {'role':'academic_supervisor'}
    )
    company_name = models.CharField(max_length=200)
    company_address = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    acceptance_letter = models.FileField(upload_to= 'acceptance_letters/', blank= True, null= True)
    letter_submitted_at = models.DateTimeField(blank= True, null=True)
    

    def clean(self):
        if self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date.")
        overlapping = InternshipPlacement.objects.filter(
            student=self.student,
            start_date__lte=self.end_date,
            end_date__gte=self.start_date
        ).exclude(id=self.id)
        if overlapping.exists():
            raise ValidationError("Student already has an internship during this period.")

    def __str__(self):
        return f"{self.student.username} at {self.company_name}"
