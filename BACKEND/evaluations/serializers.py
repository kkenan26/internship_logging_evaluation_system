
from rest_framework import serializers
from django.db.models import Avg, Sum
from .models import Evaluation, EvaluationCriteria, AcademicEvaluation, WorkplaceEvaluation
from users.models import CustomUser
from placements.models import InternshipPlacement


class EvaluationCriteriaSerializer(serializers.ModelSerializer):
    """
    Serializer for EvaluationCriteria model.
    Handles the criteria used to evaluate student interns.
    Each criteria has a weight that contributes to the final score.
    """
    total_weight = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationCriteria
        fields = [
            'id',
            'name',
            'description',
            'weight',
            'is_active',
            'total_weight'
        ]

    def get_total_weight(self, obj):
        """Returns the total weight of all active criteria."""
        total = EvaluationCriteria.objects.filter(
            is_active=True
        ).aggregate(
            total=Sum('weight')
        )['total']
        return total or 0

    def validate_weight(self, value):
        """Ensure weight is between 0 and 100."""
        if value <= 0 or value > 100:
            raise serializers.ValidationError(
                "Weight must be between 1 and 100."
            )
        return value

    def validate_name(self, value):
        """Ensure criteria name is not empty."""
        if not value.strip():
            raise serializers.ValidationError(
                "Criteria name cannot be empty."
            )
        return value


class EvaluationSerializer(serializers.ModelSerializer):
    """
    Serializer for Evaluation model.
    Handles the actual scores given to students.
    Includes computed fields for displaying related data.
    """
    # Read-only computed fields
    student_name = serializers.CharField(
        source='student.username',
        read_only=True
    )
    student_email = serializers.CharField(
        source='student.email',
        read_only=True
    )
    evaluator_name = serializers.CharField(
        source='evaluator.username',
        read_only=True
    )
    criteria_name = serializers.CharField(
        source='criteria.name',
        read_only=True
    )
    criteria_weight = serializers.DecimalField(
        source='criteria.weight',
        max_digits=5,
        decimal_places=2,
        read_only=True
    )
    weighted_score = serializers.SerializerMethodField()
    placement_company = serializers.CharField(
        source='placement.company_name',
        read_only=True
    )

    class Meta:
        model = Evaluation
        fields = [
            'id',
            'student',
            'student_name',
            'student_email',
            'placement',
            'placement_company',
            'evaluator',
            'evaluator_name',
            'criteria',
            'criteria_name',
            'criteria_weight',
            'score',
            'weighted_score',
            'comments',
            'evaluated_at'
        ]
        read_only_fields = ['evaluator', 'evaluated_at']

    def get_weighted_score(self, obj):
        """
        Calculates the weighted score for this evaluation.
        Formula: (score / 100) * criteria_weight
        Example: score=80, weight=40 → weighted = 32
        """
        if obj.score and obj.criteria.weight:
            return round((obj.score / 100) * obj.criteria.weight, 2)
        return 0

    def validate_score(self, value):
        """Ensure score is between 0 and 100."""
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                "Score must be between 0 and 100."
            )
        return value

    def validate(self, attrs):
        """
        Check that the student belongs to the placement.
        Prevent evaluating a student for a placement they are not in.
        """
        student = attrs.get('student')
        placement = attrs.get('placement')
        if placement and student:
            if placement.student != student:
                raise serializers.ValidationError(
                    "This student is not assigned to this placement."
                )
        return attrs

class AcademicEvaluationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='placement.student.username', read_only=True)
    evaluator_name = serializers.CharField(source='evaluator.username', read_only=True)
    company_name = serializers.CharField(source='placement.company_name', read_only=True)
    grade = serializers.SerializerMethodField()

    class Meta:
        model = AcademicEvaluation
        fields = [
            'id', 'placement','student', 'student_name', 'company_name',
            'evaluator', 'evaluator_name', 'score', 'grade', 'comments',
        ]
        read_only_fields = ['evaluator', 'student']

    def get_grade(self, obj):
        score = obj.score
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'

    def validate_score(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Score between 0 and 100.")
        return value

    def validate_comments(self, value):
        if value is not None and len(value.strip()) == 0:
            raise serializers.ValidationError("Comments cannot be empty.")
        return value

class StudentTotalScoreSerializer(serializers.Serializer):
    """
    Serializer for computing a student's total weighted score.
    Combines all evaluation scores using their criteria weights.
    Formula: sum of (score * weight / 100) for all evaluations
    """
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    total_weighted_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2
    )
    grade = serializers.CharField()
    evaluations_count = serializers.IntegerField()
    breakdown = serializers.ListField(
        child=serializers.DictField()
    )