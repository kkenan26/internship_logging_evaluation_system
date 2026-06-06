from rest_framework import serializers
from django.utils import timezone
from .models import InternshipPlacement
from users.models import CustomUser


class InternshipPlacementSerializer(serializers.ModelSerializer):
    # Read-only computed fields
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
    duration_weeks  = serializers.SerializerMethodField()
    is_active       = serializers.SerializerMethodField()
    days_remaining  = serializers.SerializerMethodField()

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
            'acceptance_letter',
            'letter_submitted_at',
            'duration_weeks',
            'is_active',
            'days_remaining',
            'status',
            'created_at',
        ]
        # ✅ student is set automatically by perform_create for students
        # ✅ acceptance_letter is handled by the dedicated upload endpoint
        read_only_fields = [
            'created_at',
            'status',
            'student',
            'letter_submitted_at',
            'student_name',
            'student_email',
            'workplace_supervisor_name',
            'academic_supervisor_name',
            'duration_weeks',
            'is_active',
            'days_remaining',
        ]
        extra_kwargs = {
            # student is NOT required in the request body —
            # perform_create injects it from request.user for students,
            # and admins can optionally pass it when creating via admin endpoint.
            'student': {'required': False},
            'acceptance_letter': {'required': False},
        }

    def get_duration_weeks(self, obj):
        if obj.start_date and obj.end_date:
            delta = obj.end_date - obj.start_date
            return round(delta.days / 7, 1)
        return 0

    def get_is_active(self, obj):
        today = timezone.now().date()
        if obj.start_date and obj.end_date:
            return obj.start_date <= today <= obj.end_date
        return False

    def get_days_remaining(self, obj):
        today = timezone.now().date()
        if obj.end_date:
            remaining = (obj.end_date - today).days
            return max(remaining, 0)
        return 0

    def validate_student(self, value):
        """Only runs when student is explicitly provided (admin creating placement)."""
        if value and value.role != 'student':
            raise serializers.ValidationError(
                "Only users with the student role can be assigned to a placement."
            )
        return value

    def validate_workplace_supervisor(self, value):
        if value and value.role != 'workplace_supervisor':
            raise serializers.ValidationError(
                "Only users with the workplace_supervisor role can be assigned as workplace supervisor."
            )
        return value

    def validate_academic_supervisor(self, value):
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
        today = timezone.now().date()
        start_date = data.get(
            'start_date',
            self.instance.start_date if self.instance else None
        )
        end_date = data.get(
            'end_date',
            self.instance.end_date if self.instance else None
        )
        student = data.get(
            'student',
            self.instance.student if self.instance else None
        )

        # 1. Date order check
        if start_date and end_date:
            if start_date > end_date:
                raise serializers.ValidationError(
                    "Start date cannot be after end date."
                )

        # 2. Overlap check — only when student is known at validation time
        #    (for student self-submission, student is injected in perform_create
        #     AFTER validation, so we skip overlap here; the view handles it)
        if start_date and end_date and student:
            instance_id = self.instance.id if self.instance else None
            overlapping = InternshipPlacement.objects.filter(
                student=student,
                start_date__lte=end_date,
                end_date__gte=start_date,
                status__in=['pending', 'active'],
            ).exclude(id=instance_id)

            if overlapping.exists():
                raise serializers.ValidationError(
                    "This student already has an internship placement during this period."
                )

        # 3. Prevent creation or modification with a start date in the past
        if start_date and start_date < today:
            if self.instance is None or start_date != self.instance.start_date:
                raise serializers.ValidationError(
                    "Start date cannot be in the past. Please choose a current or future date."
                )

        return data


class PlacementStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternshipPlacement
        fields = ['id', 'status']

    def validate_status(self, value):
        valid_statuses = ['pending', 'active', 'completed', 'cancelled']
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        return value


class PlacementListSerializer(serializers.ModelSerializer):
    student_name   = serializers.CharField(source='student.username', read_only=True)
    company_name   = serializers.CharField(read_only=True)
    status         = serializers.CharField(read_only=True)
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