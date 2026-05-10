from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, NotFound
from django.db.models import Q, Sum, Avg, Count
from .models import Evaluation, EvaluationCriteria, AcademicEvaluation
from .serializers import (
    EvaluationSerializer,
    EvaluationCriteriaSerializer,
    AcademicEvaluationSerializer,
    StudentTotalScoreSerializer,
)
from placements.models import InternshipPlacement
from logbook.models import WeeklyLog
from users.models import CustomUser


# ============================================================
# CUSTOM PERMISSIONS
# ============================================================
class IsSupervisorOrAdmin(permissions.BasePermission):
    message = "Only supervisors and administrators can perform this action."
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in [
                'academic_supervisor',
                'workplace_supervisor',
                'admin'
            ]
        )


class IsAcademicSupervisorOrAdmin(permissions.BasePermission):
    message = "Only academic supervisors and administrators can perform this action."
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ['academic_supervisor', 'admin']
        )


class IsAdminOnly(permissions.BasePermission):
    message = "Only administrators can perform this action."
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


# ============================================================
# EVALUATION CRITERIA
# ============================================================
class EvaluationCriteriaListView(generics.ListCreateAPIView):
    serializer_class = EvaluationCriteriaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return EvaluationCriteria.objects.filter(is_active=True)


class EvaluationCriteriaDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EvaluationCriteriaSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    queryset = EvaluationCriteria.objects.all()

    def destroy(self, request, *args, **kwargs):
        criteria = self.get_object()
        criteria.is_active = False
        criteria.save()
        return Response({
            'message': f'Criteria "{criteria.name}" has been deactivated.'
        }, status=status.HTTP_200_OK)


# ============================================================
# EVALUATIONS
# ============================================================
class EvaluationListCreateView(generics.ListCreateAPIView):
    serializer_class = EvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student__username', 'criteria__name']
    ordering_fields = ['score', 'evaluated_at']
    ordering = ['-evaluated_at']

    def get_queryset(self):
        user = self.request.user
        queryset = Evaluation.objects.select_related(
            'student',
            'evaluator',
            'criteria',
            'placement'
        )
        
        if user.role == 'admin':
            return queryset
        elif user.role in ['academic_supervisor', 'workplace_supervisor']:
            return queryset.filter(evaluator=user)
        elif user.role == 'student':
            return queryset.filter(student=user)
        return Evaluation.objects.none()

    def perform_create(self, serializer):
        serializer.save(evaluator=self.request.user)


class EvaluationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EvaluationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAdmin]

    def get_queryset(self):
        user = self.request.user
        queryset = Evaluation.objects.select_related(
            'student',
            'evaluator',
            'criteria'
        )
        
        if user.role == 'admin':
            return queryset
        return queryset.filter(evaluator=user)


# ============================================================
# STUDENT VIEW
# ============================================================
class StudentEvaluationView(generics.ListAPIView):
    serializer_class = EvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'student':
            return Evaluation.objects.select_related(
                'student',
                'evaluator',
                'criteria'
            ).filter(student=self.request.user).order_by('criteria__name')
        return Evaluation.objects.none()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'evaluations_count': queryset.count(),
            'results': serializer.data
        })


# ============================================================
# ACADEMIC EVALUATIONS
# ============================================================
class AcademicEvaluationListCreateView(generics.ListCreateAPIView):
    serializer_class = AcademicEvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = AcademicEvaluation.objects.select_related(
            'placement',
            'placement__student',
            'academic_supervisor'
        )
        
        if user.role == 'admin':
            return queryset
        elif user.role == 'academic_supervisor':
            return queryset.filter(academic_supervisor=user)
        elif user.role == 'student':
            return queryset.filter(placement__student=user)
        return AcademicEvaluation.objects.none()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsAcademicSupervisorOrAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        placement_id = self.request.data.get('placement')
        try:
            placement = InternshipPlacement.objects.get(pk=placement_id)
        except InternshipPlacement.DoesNotExist:
            raise NotFound("Placement not found.")

        if (self.request.user.role == 'academic_supervisor' and
                placement.academic_supervisor != self.request.user):
            raise PermissionDenied("You are not assigned to this placement.")

        serializer.save(academic_supervisor=self.request.user)


class AcademicEvaluationDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AcademicEvaluationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAcademicSupervisorOrAdmin]

    def get_queryset(self):
        user = self.request.user
        queryset = AcademicEvaluation.objects.select_related(
            'placement',
            'placement__student',
            'academic_supervisor'
        )
        
        if user.role == 'admin':
            return queryset
        return queryset.filter(academic_supervisor=user)


# ============================================================
# ADMIN REPORT
# ============================================================
class AdminReportView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def get(self, request):
        total_students = CustomUser.objects.filter(role='student').count()
        total_supervisors = CustomUser.objects.filter(
            role__in=['workplace_supervisor', 'academic_supervisor']
        ).count()
        total_placements = InternshipPlacement.objects.count()
        active_placements = InternshipPlacement.objects.filter(status='active').count()
        pending_placements = InternshipPlacement.objects.filter(status='pending').count()
        completed_placements = InternshipPlacement.objects.filter(status='completed').count()
        total_logs = WeeklyLog.objects.count()
        draft_logs = WeeklyLog.objects.filter(status='draft').count()
        submitted_logs = WeeklyLog.objects.filter(status='submitted').count()
        reviewed_logs = WeeklyLog.objects.filter(status='reviewed').count()
        approved_logs = WeeklyLog.objects.filter(status='approved').count()
        total_evaluations = Evaluation.objects.count()
        average_score = Evaluation.objects.aggregate(avg=Avg('score'))['avg'] or 0

        return Response({
            'users': {
                'total_students': total_students,
                'total_supervisors': total_supervisors,
            },
            'placements': {
                'total': total_placements,
                'active': active_placements,
                'pending': pending_placements,
                'completed': completed_placements,
            },
            'logs': {
                'total': total_logs,
                'draft': draft_logs,
                'submitted': submitted_logs,
                'reviewed': reviewed_logs,
                'approved': approved_logs,
            },
            'evaluations': {
                'total': total_evaluations,
                'average_score': round(average_score, 2),
            }
        })


# ============================================================
# STUDENT TOTAL SCORE VIEW (NEW - FIXED)
# ============================================================
class StudentScoreView(generics.RetrieveAPIView):
    serializer_class = StudentTotalScoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        student_id = self.kwargs.get('student_id')
        user = self.request.user

        # Security: Students can only view their own score
        if user.role == 'student' and user.id != int(student_id):
            raise PermissionDenied("You can only view your own evaluation score.")

        # Get the student
        try:
            student = CustomUser.objects.get(id=student_id, role='student')
        except CustomUser.DoesNotExist:
            raise NotFound(f"Student with ID {student_id} not found.")

        # Get all evaluations for this student
        evaluations = Evaluation.objects.filter(student=student)

        # Calculate total weighted score
        total_weighted = 0
        breakdown = []

        for eval_item in evaluations:
            if eval_item.score and eval_item.criteria.weight:
                weighted = round((eval_item.score / 100) * eval_item.criteria.weight, 2)
                total_weighted += weighted
                breakdown.append({
                    'criteria': eval_item.criteria.name,
                    'score': float(eval_item.score),
                    'weight': float(eval_item.criteria.weight),
                    'weighted_score': weighted
                })

        evaluations_count = evaluations.count()

        # Determine grade
        if total_weighted >= 90:
            grade = 'A'
        elif total_weighted >= 80:
            grade = 'B'
        elif total_weighted >= 70:
            grade = 'C'
        elif total_weighted >= 60:
            grade = 'D'
        else:
            grade = 'F'

        return {
            'student_id': student.id,
            'student_name': student.username,
            'total_weighted_score': round(total_weighted, 2),
            'grade': grade,
            'evaluations_count': evaluations_count,
            'breakdown': breakdown
        }

    def get(self, request, *args, **kwargs):
        data = self.get_object()
        serializer = self.get_serializer(data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)