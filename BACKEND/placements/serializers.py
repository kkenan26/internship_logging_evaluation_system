from rest_framework import serializers
from django.utils import timezone
from .models import InternshipPlacement

class InternshipPlacementSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    workplace_supervisor_name = serializers.CharField(source='workplace_supervisor.username', read_only=True)
    academic_supervisor_name = serializers.CharField(source='academic_supervisor.username', read_only=True)
    duration_weeks = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = InternshipPlacement
        fields = [
            'id', 'student', 'student_name', 'student_email',
            'workplace_supervisor', 'workplace_supervisor_name',
            'academic_supervisor', 'academic_supervisor_name',
            'company_name', 'company_address',
            'start_date', 'end_date',
            'duration_weeks', 'is_active', 'days_remaining',
            'status', 'created_at'
        ]
        read_only_fields = ['created_at', 'status', 'student_name', 'student_email',
                           'workplace_supervisor_name', 'academic_supervisor_name',
                           'duration_weeks', 'is_active', 'days_remaining']
        extra_kwargs = {'student': {'required': False}}

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
        if value and value.role != 'student':
            raise serializers.ValidationError("Only students can be assigned.")
        return value
    def validate_workplace_supervisor(self, value):
        if value and value.role != 'workplace_supervisor':
            raise serializers.ValidationError("Must be workplace_supervisor.")
        return value
    def validate_academic_supervisor(self, value):
        if value and value.role != 'academic_supervisor':
            raise serializers.ValidationError("Must be academic_supervisor.")
        return value
    def validate(self, data):
        today = timezone.now().date()
        start_date = data.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = data.get('end_date', getattr(self.instance, 'end_date', None))
        student = data.get('student', getattr(self.instance, 'student', None))
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("Start date cannot be after end date.")
        if start_date and end_date and student:
            instance_id = self.instance.id if self.instance else None
            overlapping = InternshipPlacement.objects.filter(
                student=student,
                start_date__lte=end_date,
                end_date__gte=start_date,
                status__in=['pending', 'active']
            ).exclude(id=instance_id)
            if overlapping.exists():
                raise serializers.ValidationError("Overlapping placement exists.")
        if start_date and start_date < today and (self.instance is None or start_date != self.instance.start_date):
            raise serializers.ValidationError("Start date cannot be in the past.")
        return data

class PlacementStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternshipPlacement
        fields = ['id', 'status']
    def validate_status(self, value):
        valid = ['pending', 'active', 'completed', 'cancelled']
        if value not in valid:
            raise serializers.ValidationError(f"Invalid status. Choose from {valid}.")
        return value

class PlacementListSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    duration_weeks = serializers.SerializerMethodField()
    class Meta:
        model = InternshipPlacement
        fields = ['id', 'student_name', 'company_name', 'start_date', 'end_date', 'duration_weeks', 'status']
    def get_duration_weeks(self, obj):
        if obj.start_date and obj.end_date:
            delta = obj.end_date - obj.start_date
            return round(delta.days / 7, 1)
        return 0