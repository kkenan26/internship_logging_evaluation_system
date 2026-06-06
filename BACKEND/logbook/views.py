from django.shortcuts import render
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from django.utils import timezone
from django.db.models import Q, Count
from .models import WeeklyLog, SupervisorReview
from .serializers import WeeklyLogSerializer, SupervisorReviewSerializer
from placements.models import InternshipPlacement


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def is_supervisor_for_placement(user, placement):
    """
    Checks if a user is assigned as supervisor for a placement.
    Returns True if:
    - User is workplace supervisor AND assigned to this placement
    - User is academic supervisor AND assigned to this placement
    - User is admin (can supervise any placement)
    """
    if user.role == 'admin':
        return True
    elif user.role == 'workplace_supervisor':
        return placement.workplace_supervisor == user
    elif user.role == 'academic_supervisor':
        return placement.academic_supervisor == user
    return False


# ============================================================
# CUSTOM PERMISSIONS
# ============================================================

class IsOwnerOrSupervisor(permissions.BasePermission):
    """
    Object level permission.
    Read: student owner, supervisors and admin can read.
    Write: only the student owner and admin can write.
    """
    message = "You do not have permission to access this log."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return (
                obj.student == request.user or
                request.user.role in [
                    'academic_supervisor',
                    'workplace_supervisor',
                    'admin'
                ]
            )
        return (
            obj.student == request.user or
            request.user.role == 'admin'
        )


class IsSupervisorOrAdmin(permissions.BasePermission):
    """
    Only allows workplace supervisors, academic supervisors
    and administrators to access the view.
    """
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


class IsStudentOnly(permissions.BasePermission):
    """
    Only allows students to access the view.
    Used for log submission endpoints.
    """
    message = "Only students can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'student'
        )


# ============================================================
# WEEKLY LOG VIEWS
# ============================================================

class WeeklyLogListCreateView(generics.ListCreateAPIView):
    """
    GET: List all weekly logs visible to the current user.
    POST: Create a new weekly log (students only).

    Role based filtering:
    - Admin: sees all logs
    - Supervisors: sees logs for their assigned placements
    - Student: sees only their own logs
    """
    serializer_class = WeeklyLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['status', 'week_number', 'student__username']
    ordering_fields = ['week_number', 'created_at', 'submitted_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = WeeklyLog.objects.select_related(
            'student',
            'placement',
            'placement__academic_supervisor',
            'placement__workplace_supervisor'
        ).prefetch_related('review')
        
        if user.role == 'admin':
            return queryset
        elif user.role in ['academic_supervisor', 'workplace_supervisor']:
            return queryset.filter(
                Q(placement__academic_supervisor=user) |
                Q(placement__workplace_supervisor=user)
            ).distinct()
        elif user.role == 'student':
            return queryset.filter(student=user)
        return WeeklyLog.objects.none()

    def perform_create(self, serializer):
        """Automatically assign the logged in student as the log owner."""
        if self.request.user.role != 'student':
            raise PermissionDenied(
                "Only students can create weekly logs."
            )
        serializer.save(student=self.request.user)

    def list(self, request, *args, **kwargs):
        """Override list to add summary count."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })


class WeeklyLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a single weekly log.
    PUT/PATCH: Update a log (only if in draft status).
    DELETE: Delete a log (only if in draft status).
    """
    serializer_class = WeeklyLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrSupervisor]

    def get_queryset(self):
        user = self.request.user
        queryset = WeeklyLog.objects.select_related(
            'student',
            'placement',
            'placement__academic_supervisor',
            'placement__workplace_supervisor'
        ).prefetch_related('review')
        
        if user.role in ['admin', 'academic_supervisor', 'workplace_supervisor']:
            return queryset
        return queryset.filter(student=user)

    def update(self, request, *args, **kwargs):
        """Prevent editing logs that are not in draft status."""
        log = self.get_object()
        if log.status != 'draft':
            return Response(
                {'error': 'Only logs in Draft status can be edited. '
                          f'This log is currently {log.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Prevent deleting logs that are not in draft status."""
        log = self.get_object()
        if log.status != 'draft':
            return Response(
                {'error': 'Only logs in Draft status can be deleted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class SubmitLogView(APIView):
    """
    POST: Submit a weekly log for review.
    Only the student who owns the log can submit it.
    Log must be in Draft status to be submitted.
    Once submitted the log is locked from editing.
    """
    permission_classes = [permissions.IsAuthenticated, IsStudentOnly]

    def post(self, request, pk):
        try:
            log = WeeklyLog.objects.get(pk=pk, student=request.user)
        except WeeklyLog.DoesNotExist:
            return Response(
                {'error': 'Log not found or you do not own this log.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if log.status != 'draft':
            return Response(
                {'error': f'Only Draft logs can be submitted. '
                          f'This log is currently {log.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if log.placement.end_date < timezone.now().date():
            return Response(
                {'error': f"Cannot submit log. Internship ended on {log.placement.end_date}."},
                status = status.HTTP_400_BAD_REQUEST
            )

        if not log.activities or not log.activities.strip():
            return Response(
                {'error': 'Please fill in your activities before submitting.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not log.skills_learned or not log.skills_learned.strip():
            return Response(
                {'error': 'Please fill in skills learned before submitting.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        log.status = 'submitted'
        log.submitted_at = timezone.now()
        log.save()

        return Response({
            'message': f'Week {log.week_number} log submitted successfully!',
            'log_id': log.id,
            'submitted_at': log.submitted_at,
            'status': log.status
        }, status=status.HTTP_200_OK)


# ============================================================
# SUPERVISOR REVIEW VIEWS
# ============================================================

class SupervisorReviewView(generics.CreateAPIView):
    """
    POST: Create a review for a submitted weekly log.
    Only supervisors assigned to the placement can review.
    Log must be in Submitted status to be reviewed.
    After review the log moves to Reviewed status.
    """
    serializer_class = SupervisorReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAdmin]

    def perform_create(self, serializer):
        log_id = self.kwargs.get('log_id')

        # Find the log or return 404
        try:
            log = WeeklyLog.objects.get(pk=log_id)
        except WeeklyLog.DoesNotExist:
            raise NotFound("Log not found.")

        # Check log is in submitted status
        if log.status != 'submitted':
            raise ValidationError(
                f"Only logs with status 'submitted' can be reviewed. "
                f"This log is currently '{log.status}'."
            )

        # Check supervisor is assigned to this placement
        if not is_supervisor_for_placement(self.request.user, log.placement):
            raise PermissionDenied(
                "You are not assigned as supervisor for this placement."
            )

        # Check if review already exists
        if hasattr(log, 'review'):
            raise ValidationError(
                "This log has already been reviewed."
            )

        # Save review and update log status
        serializer.save(supervisor=self.request.user, log=log)
        log.status = 'reviewed'
        log.reviewed_at = timezone.now()
        log.save()


class SupervisorReviewDetailView(generics.RetrieveUpdateAPIView):
    """
    GET: Retrieve a single review.
    PUT/PATCH: Update a review (supervisor only).
    """
    serializer_class = SupervisorReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return SupervisorReview.objects.all()
        return SupervisorReview.objects.filter(supervisor=user)


class ApproveLogView(APIView):
    """
    POST: Approve a reviewed weekly log.
    Only academic supervisors and admins can approve logs.
    Log must be in Reviewed status to be approved.
    Once approved the log is permanently locked.
    """
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAdmin]

    def post(self, request, log_id):
        # Check user is academic supervisor or admin
        if request.user.role not in ['academic_supervisor', 'admin']:
            return Response(
                {'error': 'Only academic supervisors can approve logs.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            log = WeeklyLog.objects.get(pk=log_id)
        except WeeklyLog.DoesNotExist:
            return Response(
                {'error': 'Log not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if log.status != 'reviewed':
            return Response(
                {'error': f'Only logs with status "reviewed" can be approved. '
                          f'This log is currently "{log.status}".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check academic supervisor is assigned to this placement
        if (request.user.role == 'academic_supervisor' and
                log.placement.academic_supervisor != request.user):
            return Response(
                {'error': 'You are not the academic supervisor '
                          'for this placement.'},
                status=status.HTTP_403_FORBIDDEN
            )

        log.status = 'approved'
        log.approved_at = timezone.now()
        log.save()

        return Response({
            'message': f'Week {log.week_number} log approved successfully!',
            'log_id': log.id,
            'approved_at': log.approved_at,
            'status': log.status
        }, status=status.HTTP_200_OK)


# ============================================================
# STUDENT AND SUPERVISOR DASHBOARD VIEWS
# ============================================================

class StudentLogbookView(generics.ListCreateAPIView):
    """
    GET: List all weekly logs for the logged in student.
    POST: Create a new weekly log.
    Students can only see and create their own logs.
    """
    serializer_class = WeeklyLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentOnly]

    def get_queryset(self):
        return WeeklyLog.objects.filter(
            student=self.request.user
        ).order_by('week_number')

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Add statistics for student dashboard
        stats = {
            'total_logs': queryset.count(),
            'draft': queryset.filter(status='draft').count(),
            'submitted': queryset.filter(status='submitted').count(),
            'reviewed': queryset.filter(status='reviewed').count(),
            'approved': queryset.filter(status='approved').count(),
        }

        return Response({
            'statistics': stats,
            'results': serializer.data
        })


class SupervisorReviewListView(generics.ListAPIView):
    """
    GET: List all logs pending review for the logged in supervisor.
    Shows only submitted logs for the supervisor's assigned placements.
    """
    serializer_class = WeeklyLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAdmin]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'admin':
            return WeeklyLog.objects.filter(status='submitted')

        if user.role == 'workplace_supervisor':
            placements = InternshipPlacement.objects.filter(
                workplace_supervisor=user
            )
        else:
            placements = InternshipPlacement.objects.filter(
                academic_supervisor=user
            )

        return WeeklyLog.objects.filter(
            placement__in=placements,
            status='submitted'
        ).order_by('submitted_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'pending_reviews': queryset.count(),
            'results': serializer.data
        })


class LogbookDashboardView(APIView):
    """
    GET: Returns logbook statistics for the dashboard.
    Shows different data based on user role with detailed metrics.
    Used by frontend dashboard components.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == 'admin':
            all_logs = WeeklyLog.objects.all()

            # Overall statistics
            total_logs = all_logs.count()
            draft = all_logs.filter(status='draft').count()
            submitted = all_logs.filter(status='submitted').count()
            reviewed = all_logs.filter(status='reviewed').count()
            approved = all_logs.filter(status='approved').count()

            # Submission rates
            submission_rate = (submitted + reviewed + approved) / total_logs * 100 if total_logs > 0 else 0
            approval_rate = approved / total_logs * 100 if total_logs > 0 else 0

            # Weekly trends (last 4 weeks)
            from django.utils import timezone
            from datetime import timedelta
            today = timezone.now().date()
            weekly_trends = []
            for i in range(4):
                week_start = today - timedelta(days=today.weekday() + (i * 7))
                week_end = week_start + timedelta(days=6)
                week_logs = all_logs.filter(
                    week_start_date__gte=week_start,
                    week_start_date__lte=week_end
                )
                weekly_trends.append({
                    'week': f'Week {4-i}',
                    'total': week_logs.count(),
                    'submitted': week_logs.filter(status__in=['submitted', 'reviewed', 'approved']).count(),
                    'approved': week_logs.filter(status='approved').count(),
                })

            # Student engagement (logs per student)
            student_stats = all_logs.values('student').annotate(
                total_logs=Count('id'),
                approved_logs=Count('id', filter=Q(status='approved'))
            ).aggregate(
                avg_logs_per_student=Avg('total_logs'),
                avg_approved_per_student=Avg('approved_logs')
            )

            return Response({
                'role': 'admin',
                'summary': {
                    'total_logs': total_logs,
                    'draft': draft,
                    'submitted': submitted,
                    'reviewed': reviewed,
                    'approved': approved,
                    'submission_rate': round(submission_rate, 1),
                    'approval_rate': round(approval_rate, 1),
                },
                'weekly_trends': weekly_trends,
                'student_engagement': {
                    'avg_logs_per_student': round(student_stats['avg_logs_per_student'] or 0, 1),
                    'avg_approved_logs_per_student': round(student_stats['avg_approved_per_student'] or 0, 1),
                }
            })

        elif user.role == 'student':
            logs = WeeklyLog.objects.filter(student=user)

            total_logs = logs.count()
            draft = logs.filter(status='draft').count()
            submitted = logs.filter(status='submitted').count()
            reviewed = logs.filter(status='reviewed').count()
            approved = logs.filter(status='approved').count()

            # Personal submission rate
            submission_rate = (submitted + reviewed + approved) / total_logs * 100 if total_logs > 0 else 0

            # Recent activity (last 30 days)
            from django.utils import timezone
            recent_logs = logs.filter(
                created_at__gte=timezone.now() - timezone.timedelta(days=30)
            ).count()

            # Weekly completion status
            weekly_completion = []
            for log in logs.order_by('-week_number')[:4]:  # Last 4 weeks
                weekly_completion.append({
                    'week': log.week_number,
                    'status': log.status,
                    'submitted_on_time': log.submitted_at.date() <= log.week_end_date if log.submitted_at else False,
                })

            return Response({
                'role': 'student',
                'summary': {
                    'total_logs': total_logs,
                    'draft': draft,
                    'submitted': submitted,
                    'reviewed': reviewed,
                    'approved': approved,
                    'submission_rate': round(submission_rate, 1),
                },
                'recent_activity': {
                    'logs_last_30_days': recent_logs,
                },
                'weekly_completion': weekly_completion,
            })

        elif user.role in ['workplace_supervisor', 'academic_supervisor']:
            if user.role == 'workplace_supervisor':
                placements = InternshipPlacement.objects.filter(workplace_supervisor=user)
            else:
                placements = InternshipPlacement.objects.filter(academic_supervisor=user)

            logs = WeeklyLog.objects.filter(placement__in=placements)

            # Workload statistics
            total_students = placements.filter(status='active').count()
            total_logs = logs.count()
            pending_reviews = logs.filter(status='submitted').count()
            reviewed = logs.filter(status='reviewed').count()
            approved = logs.filter(status='approved').count()

            # Review efficiency
            review_rate = (reviewed + approved) / pending_reviews * 100 if pending_reviews > 0 else 100

            # Student performance under supervision
            student_performance = []
            for placement in placements.filter(status='active'):
                student_logs = logs.filter(placement=placement)
                if student_logs.exists():
                    approved_count = student_logs.filter(status='approved').count()
                    total_count = student_logs.count()
                    approval_rate = approved_count / total_count * 100 if total_count > 0 else 0

                    student_performance.append({
                        'student': placement.student.username,
                        'total_logs': total_count,
                        'approved_logs': approved_count,
                        'approval_rate': round(approval_rate, 1),
                    })

            return Response({
                'role': user.role,
                'workload': {
                    'total_students': total_students,
                    'total_logs': total_logs,
                    'pending_reviews': pending_reviews,
                    'reviewed': reviewed,
                    'approved': approved,
                    'review_completion_rate': round(review_rate, 1),
                },
                'student_performance': student_performance,
            })

        return Response({'error': 'Unknown role'})