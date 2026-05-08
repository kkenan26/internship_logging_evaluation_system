from rest_framework import serializers
from django.utils import timezone
from .models import InternshipPlacement
from users.models import CustomUser


class InternshipPlacementSerializer(serializers.ModelSerializer):
    """
    Serializer for InternshipPlacement model.
    Handles creating and managing student internship placements.
    Includes full validation to prevent overlapping placements
    and ensure date integrity.
    """
    # Read only computed fields
    student_name = serializers.CharField(
        source='student.username',
        read_only=True
    )
    student_email = serializers.CharField(
        source='student.email',
        read_only=True
    )
    workplace_supervisor_name = serializers.CharField(
        source='workplace_supervisor.username',
        read_only=True
    )
    academic_supervisor_name = serializers.CharField(
        source='academic_supervisor.username',
        read_only=True
    )
    duration_weeks = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = InternshipPlacement
        fields = [
            'id',
            'student',
            'student_name',
            'student_email',
            'workplace_supervisor',
            'workplace_supervisor_name',
            'academic_supervisor',
            'academic_supervisor_name',
            'company_name',
            'company_address',
            'start_date',
            'end_date',
            'duration_weeks',
            'is_active',
            'days_remaining',
            'status',
            'created_at',
        ]
        read_only_fields = ['created_at', 'status', 'student']

    def get_duration_weeks(self, obj):
        """
        Calculates the duration of the internship in weeks.
        Formula: (end_date - start_date).days / 7
        """
        if obj.start_date and obj.end_date:
            delta = obj.end_date - obj.start_date
            return round(delta.days / 7, 1)
        return 0

    def get_is_active(self, obj):
        """
        Checks if the internship is currently active.
        Returns True if today falls between start and end date.
        """
        today = timezone.now().date()
        if obj.start_date and obj.end_date:
            return obj.start_date <= today <= obj.end_date
        return False

    def get_days_remaining(self, obj):
        """
        Calculates how many days are left in the internship.
        Returns 0 if internship has already ended.
        """
        today = timezone.now().date()
        if obj.end_date:
            remaining = (obj.end_date - today).days
            return max(remaining, 0)
        return 0

    def validate_student(self, value):
        """Ensure the user being assigned is actually a student."""
        if value.role != 'student':
            raise serializers.ValidationError(
                "Only users with the student role can be assigned to a placement."
            )
        return value

    def validate_workplace_supervisor(self, value):
        """Ensure the workplace supervisor has the correct role."""
        if value and value.role != 'workplace_supervisor':
            raise serializers.ValidationError(
                "Only users with the workplace_supervisor role can be assigned as workplace supervisor."
            )
        return value

    def validate_academic_supervisor(self, value):
        """Ensure the academic supervisor has the correct role."""
        if value and value.role != 'academic_supervisor':
            raise serializers.ValidationError(
                "Only users with the academic_supervisor role can be assigned as academic supervisor."
            )
        return value

    def validate(self, data):
        """
        Full validation for placement data.
        Checks:
        1. Start date must be before end date
        2. Student cannot have overlapping placements
        3. Placement cannot be created in the past
        """
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        student = data.get('student')

        # Check 1: start date must be before end date
        if start_date and end_date:
            if start_date > end_date:
                raise serializers.ValidationError(
                    "Start date cannot be after end date."
                )

        # Check 2: prevent overlapping placements for same student
        if start_date and end_date and student:
            instance_id = self.instance.id if self.instance else None
            overlapping = InternshipPlacement.objects.filter(
                student=student,
                start_date__lte=end_date,
                end_date__gte=start_date
            ).exclude(id=instance_id)

            if overlapping.exists():
                raise serializers.ValidationError(
                    "This student already has an internship placement during this period. "
                    "Please choose different dates."
                )

        return data


class PlacementStatusUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating placement status only.
    Used by administrators to change placement status
    without modifying other fields.
    """
    class Meta:
        model = InternshipPlacement
        fields = ['id', 'status']

    def validate_status(self, value):
        """Ensure only valid status values are accepted."""
        valid_statuses = ['pending', 'active', 'completed', 'cancelled']
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        return value


class PlacementListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing placements.
    Used in list views where we don't need all details.
    Shows only the most important fields.
    """
    student_name = serializers.CharField(
        source='student.username',
        read_only=True
    )
    company_name = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    duration_weeks = serializers.SerializerMethodField()

    class Meta:
        model = InternshipPlacement
        fields = [
            'id',
            'student_name',
            'company_name',
            'start_date',
            'end_date',
            'duration_weeks',
            'status',
        ]

    def get_duration_weeks(self, obj):
        if obj.start_date and obj.end_date:
            delta = obj.end_date - obj.start_date
            return round(delta.days / 7, 1)
        return 0