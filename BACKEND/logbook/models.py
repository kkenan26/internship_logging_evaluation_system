from django.db import models
from users.models import CustomUser
from placements.models import InternshipPlacement
from django.utils import timezone


class WeeklyLog(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('reviewed', 'Reviewed'),
        ('approved', 'Approved'),
    ]

    student = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='weekly_logs',
        limit_choices_to={'role': 'student'}
    )
    placement = models.ForeignKey(
        InternshipPlacement,
        on_delete=models.CASCADE,
        related_name='logs'
    )
    week_number = models.PositiveIntegerField()
    activities = models.TextField()
    skills_learned = models.TextField()
    challenges = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )
    submitted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    reviewed_at = models.DateTimeField(blank= True, null =True)
    approved_at =models.DateTimeField(blank= True, null= True)

    class Meta:
        unique_together = ['student', 'placement', 'week_number']
        indexes = [
            models.Index(fields=['student', 'placement', 'week_number']),
            models.Index(fields=['status', 'submitted_at']),
            models.Index(fields=['placement', 'status']),
        ]

    def __str__(self):
        return f"{self.student.username} - Week {self.week_number}"

    def save(self, *args, **kwargs):
        #Checks the status of a log and sets the timestamp for the relevant status
        if self.status == 'submitted' and self.submitted_at is None:
            self.submitted_at = timezone.now()
        if self.status =='reviewed' and self.reviewed_at is None:
            self.reviewed_at = timezone.now()
        if self.status=='approved' and self.approved_at is None:
            self.approved_at = timezone.now()

        super().save(*args, **kwargs) #Saves the database

    def can_edit(self):
        return self.status =='draft'
    def can_submit(self):
        return self.status=='draft'
    def can_review(self):
        return self.status=='submitted'
    def can_approve(self):
        return self.status=='reviewed'

class SupervisorReview(models.Model):
    log = models.OneToOneField(WeeklyLog, 
                               on_delete=models.CASCADE,
                               related_name= 'review')
    supervisor = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role__in': ['workplace_supervisor', 'academic_supervisor']}
    )
    comments = models.TextField()
    approved = models.BooleanField(default=False)

    def __str__(self):
        return f"Review for {self.log}"
