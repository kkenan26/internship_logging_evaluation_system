from rest_framework import serializers
from django.utils import timezone
from .models import WeeklyLog, SupervisorReview


class SupervisorReviewSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source='supervisor.username', read_only=True)
    class Meta:
        model = SupervisorReview
        fields = ['id', 'log', 'supervisor', 'supervisor_name', 'comments', 'approved']
        read_only_fields = ['supervisor', 'log']   
        
class WeeklyLogSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(
        source='student.username',
        read_only=True
    )
    student_email = serializers.CharField(
        source='student.email',
        read_only=True
    )
    placement_company = serializers.CharField(
        source='placement.company_name',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    review = SupervisorReviewSerializer(read_only=True)
    can_edit = serializers.SerializerMethodField()
    days_since_submission = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyLog
        fields = [
            'id',
            'placement',
            'placement_company',
            'student',
            'student_name',
            'student_email',
            'week_number',
            'activities',
            'skills_learned',
            'challenges',
            'status',
            'status_display',
            'can_edit',
            'submitted_at',
            'days_since_submission',
            'created_at',
            'updated_at',
            'review',
        ]
        read_only_fields = [
            'student',
            'submitted_at',
            'created_at',
            'updated_at'
        ]

    def get_can_edit(self, obj):
        """
        Checks if the log can still be edited.
        """
        return obj.status == 'draft'

    def get_days_since_submission(self, obj):
       
        if obj.submitted_at:
            delta = timezone.now() - obj.submitted_at
            return delta.days
        return None

    def validate_week_number(self, value):
        """Ensure week number is positive."""
        if value <= 0:
            raise serializers.ValidationError(
                "Week number must be a positive number."
            )
        return value

    def validate_activities(self, value):
        """Ensure activities field is not empty."""
        if not value.strip():
            raise serializers.ValidationError(
                "Activities field cannot be empty."
            )
        return value

    def validate(self, data):

        status = data.get('status', '')
        activities = data.get('activities', '')
        skills_learned = data.get('skills_learned', '')

        if status == 'submitted':
            if not activities or not activities.strip():
                raise serializers.ValidationError(
                    "Activities field is required before submitting."
                )
            if not skills_learned or not skills_learned.strip():
                raise serializers.ValidationError(
                    "Skills learned field is required before submitting."
                )


        if self.instance and self.instance.status == 'approved':
            raise serializers.ValidationError(
                "This log has been approved and cannot be modified."
            )

        return data


class WeeklyLogSubmitSerializer(serializers.ModelSerializer):

    class Meta:
        model = WeeklyLog
        fields = ['id', 'status', 'submitted_at']
        read_only_fields = ['submitted_at']

    def validate_status(self, value):
        """Only allow transition from draft to submitted."""
        if self.instance and self.instance.status != 'draft':
            raise serializers.ValidationError(
                "Only logs in Draft status can be submitted."
            )
        if value != 'submitted':
            raise serializers.ValidationError(
                "You can only change status to submitted."
            )
        return value