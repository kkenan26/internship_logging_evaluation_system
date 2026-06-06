from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, NotFound
from django.db.models import Q, Sum, Avg, Count
from .models import Evaluation, EvaluationCriteria, AcademicEvaluation, WorkplaceEvaluation
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
        # User statistics
        total_students = CustomUser.objects.filter(role='student').count()
        total_supervisors = CustomUser.objects.filter(
            role__in=['workplace_supervisor', 'academic_supervisor']
        ).count()
        total_admins = CustomUser.objects.filter(role='admin').count()

        # Placement statistics
        total_placements = InternshipPlacement.objects.count()
        active_placements = InternshipPlacement.objects.filter(status='active').count()
        pending_placements = InternshipPlacement.objects.filter(status='pending').count()
        completed_placements = InternshipPlacement.objects.filter(status='completed').count()
        cancelled_placements = InternshipPlacement.objects.filter(status='cancelled').count()

        # Logbook statistics
        total_logs = WeeklyLog.objects.count()
        draft_logs = WeeklyLog.objects.filter(status='draft').count()
        submitted_logs = WeeklyLog.objects.filter(status='submitted').count()
        reviewed_logs = WeeklyLog.objects.filter(status='reviewed').count()
        approved_logs = WeeklyLog.objects.filter(status='approved').count()

        # Evaluation statistics
        total_evaluations = Evaluation.objects.count()
        average_score = Evaluation.objects.aggregate(avg=Avg('score'))['avg'] or 0

        # Academic Evaluation statistics
        academic_evals = AcademicEvaluation.objects.all()
        total_academic_evals = academic_evals.count()
        avg_academic_score = academic_evals.aggregate(avg=Avg('score'))['avg'] or 0

        # Workplace Evaluation statistics
        workplace_evals = WorkplaceEvaluation.objects.all()
        total_workplace_evals = workplace_evals.count()
        avg_workplace_score = workplace_evals.aggregate(avg=Avg('score'))['avg'] or 0

        # Supervisor workload
        academic_supervisors = CustomUser.objects.filter(role='academic_supervisor')
        workplace_supervisors = CustomUser.objects.filter(role='workplace_supervisor')

        academic_workload = []
        for sup in academic_supervisors:
            placements = InternshipPlacement.objects.filter(academic_supervisor=sup)
            academic_workload.append({
                'supervisor': sup.username,
                'active_placements': placements.filter(status='active').count(),
                'total_placements': placements.count(),
                'pending_evaluations': academic_evals.filter(
                    placement__academic_supervisor=sup,
                    placement__status='active'
                ).count()
            })

        workplace_workload = []
        for sup in workplace_supervisors:
            placements = InternshipPlacement.objects.filter(workplace_supervisor=sup)
            workplace_workload.append({
                'supervisor': sup.username,
                'active_placements': placements.filter(status='active').count(),
                'total_placements': placements.count(),
                'pending_evaluations': workplace_evals.filter(
                    placement__workplace_supervisor=sup,
                    placement__status='active'
                ).count()
            })

        # Weekly log submission trends (last 4 weeks)
        from django.utils import timezone
        from datetime import timedelta

        today = timezone.now().date()
        weekly_stats = []
        for i in range(4):
            week_start = today - timedelta(days=today.weekday() + (i * 7))
            week_end = week_start + timedelta(days=6)
            week_logs = WeeklyLog.objects.filter(
                week_start_date__gte=week_start,
                week_start_date__lte=week_end
            )
            weekly_stats.append({
                'week': f'Week {4-i}',
                'start_date': week_start,
                'total_logs': week_logs.count(),
                'submitted': week_logs.filter(status__in=['submitted', 'reviewed', 'approved']).count(),
                'approved': week_logs.filter(status='approved').count()
            })

        return Response({
            'users': {
                'total_students': total_students,
                'total_supervisors': total_supervisors,
                'total_admins': total_admins,
            },
            'placements': {
                'total': total_placements,
                'active': active_placements,
                'pending': pending_placements,
                'completed': completed_placements,
                'cancelled': cancelled_placements,
            },
            'logs': {
                'total': total_logs,
                'draft': draft_logs,
                'submitted': submitted_logs,
                'reviewed': reviewed_logs,
                'approved': approved_logs,
                'weekly_trends': weekly_stats,
            },
            'evaluations': {
                'total': total_evaluations,
                'average_score': round(average_score, 2),
                'academic': {
                    'total': total_academic_evals,
                    'average_score': round(avg_academic_score, 2),
                },
                'workplace': {
                    'total': total_workplace_evals,
                    'average_score': round(avg_workplace_score, 2),
                }
            },
            'supervisor_workload': {
                'academic_supervisors': academic_workload,
                'workplace_supervisors': workplace_workload,
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


# ============================================================
# COMPREHENSIVE DASHBOARD VIEW
# ============================================================
class ComprehensiveDashboardView(APIView):
    """
    GET: Returns comprehensive dashboard statistics for admins.
    Combines data from all modules with advanced aggregations.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def get(self, request):
        from django.db.models import Count, Avg, Sum, Q
        from django.utils import timezone
        from datetime import timedelta

        # Time-based filters
        today = timezone.now().date()
        last_30_days = timezone.now() - timedelta(days=30)
        last_7_days = timezone.now() - timedelta(days=7)

        # ===== USER STATISTICS =====
        users = CustomUser.objects.all()
        user_stats = {
            'total_users': users.count(),
            'students': users.filter(role='student').count(),
            'academic_supervisors': users.filter(role='academic_supervisor').count(),
            'workplace_supervisors': users.filter(role='workplace_supervisor').count(),
            'admins': users.filter(role='admin').count(),
            'new_users_30_days': users.filter(date_joined__gte=last_30_days).count(),
        }

        # ===== PLACEMENT STATISTICS =====
        placements = InternshipPlacement.objects.all()
        placement_stats = {
            'total': placements.count(),
            'active': placements.filter(status='active').count(),
            'pending': placements.filter(status='pending').count(),
            'completed': placements.filter(status='completed').count(),
            'cancelled': placements.filter(status='cancelled').count(),
            'new_30_days': placements.filter(created_at__gte=last_30_days).count(),
            'completion_rate': round(
                placements.filter(status='completed').count() /
                placements.exclude(status='pending').count() * 100, 1
            ) if placements.exclude(status='pending').count() > 0 else 0,
        }

        # Top companies
        top_companies = placements.values('company_name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        # ===== LOGBOOK STATISTICS =====
        logs = WeeklyLog.objects.all()
        log_stats = {
            'total': logs.count(),
            'draft': logs.filter(status='draft').count(),
            'submitted': logs.filter(status='submitted').count(),
            'reviewed': logs.filter(status='reviewed').count(),
            'approved': logs.filter(status='approved').count(),
            'submission_rate': round(
                logs.filter(status__in=['submitted', 'reviewed', 'approved']).count() /
                logs.count() * 100, 1
            ) if logs.count() > 0 else 0,
            'approval_rate': round(
                logs.filter(status='approved').count() /
                logs.count() * 100, 1
            ) if logs.count() > 0 else 0,
            'new_7_days': logs.filter(created_at__gte=last_7_days).count(),
        }

        # ===== EVALUATION STATISTICS =====
        evaluations = Evaluation.objects.all()
        academic_evals = AcademicEvaluation.objects.all()
        workplace_evals = WorkplaceEvaluation.objects.all()

        eval_stats = {
            'total_criteria_evaluations': evaluations.count(),
            'avg_criteria_score': round(evaluations.aggregate(avg=Avg('score'))['avg'] or 0, 2),
            'academic_evaluations': {
                'total': academic_evals.count(),
                'avg_score': round(academic_evals.aggregate(avg=Avg('score'))['avg'] or 0, 2),
                'completion_rate': round(
                    academic_evals.count() /
                    placements.filter(status__in=['active', 'completed']).count() * 100, 1
                ) if placements.filter(status__in=['active', 'completed']).count() > 0 else 0,
            },
            'workplace_evaluations': {
                'total': workplace_evals.count(),
                'avg_score': round(workplace_evals.aggregate(avg=Avg('score'))['avg'] or 0, 2),
                'completion_rate': round(
                    workplace_evals.count() /
                    placements.filter(status__in=['active', 'completed']).count() * 100, 1
                ) if placements.filter(status__in=['active', 'completed']).count() > 0 else 0,
            },
        }

        # ===== TOTAL SCORES =====
        # Calculate weighted total scores for completed placements
        completed_placements = placements.filter(status='completed')
        total_scores = []
        for placement in completed_placements:
            placement.calculate_total_score()  # This updates the total_score field
            if placement.total_score:
                total_scores.append(float(placement.total_score))

        score_distribution = {
            'average_total_score': round(sum(total_scores) / len(total_scores), 2) if total_scores else 0,
            'highest_score': max(total_scores) if total_scores else 0,
            'lowest_score': min(total_scores) if total_scores else 0,
            'score_ranges': {
                'excellent_90_plus': len([s for s in total_scores if s >= 90]),
                'good_80_89': len([s for s in total_scores if 80 <= s < 90]),
                'satisfactory_70_79': len([s for s in total_scores if 70 <= s < 80]),
                'needs_improvement_below_70': len([s for s in total_scores if s < 70]),
            }
        }

        # ===== SUPERVISOR PERFORMANCE =====
        supervisors = CustomUser.objects.filter(
            role__in=['academic_supervisor', 'workplace_supervisor']
        )

        supervisor_performance = []
        for sup in supervisors:
            # Placements supervised
            academic_placements = placements.filter(academic_supervisor=sup)
            workplace_placements = placements.filter(workplace_supervisor=sup)

            # Evaluations completed
            academic_eval_count = academic_evals.filter(evaluator=sup).count()
            workplace_eval_count = workplace_evals.filter(evaluator=sup).count()

            # Average scores given
            academic_avg = academic_evals.filter(evaluator=sup).aggregate(avg=Avg('score'))['avg'] or 0
            workplace_avg = workplace_evals.filter(evaluator=sup).aggregate(avg=Avg('score'))['avg'] or 0

            supervisor_performance.append({
                'supervisor': sup.username,
                'role': sup.role,
                'placements_supervised': academic_placements.count() + workplace_placements.count(),
                'evaluations_completed': academic_eval_count + workplace_eval_count,
                'avg_score_given': round((academic_avg + workplace_avg) / 2, 2) if (academic_avg + workplace_avg) > 0 else 0,
            })

        # ===== SYSTEM HEALTH =====
        # Check for data consistency issues
        health_stats = {
            'orphaned_logs': logs.filter(placement__isnull=True).count(),
            'placements_without_supervisors': placements.filter(
                Q(academic_supervisor__isnull=True) | Q(workplace_supervisor__isnull=True),
                status='active'
            ).count(),
            'evaluations_without_placements': evaluations.filter(placement__isnull=True).count(),
            'inconsistent_statuses': placements.filter(
                status='completed',
                end_date__gt=today
            ).count(),  # Completed but end date in future
        }

        return Response({
            'generated_at': timezone.now(),
            'users': user_stats,
            'placements': placement_stats,
            'top_companies': list(top_companies),
            'logbook': log_stats,
            'evaluations': eval_stats,
            'total_scores': score_distribution,
            'supervisor_performance': supervisor_performance,
            'system_health': health_stats,
        })