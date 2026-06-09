from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from django.utils import timezone
from django.db.models import Q, Count, Avg
from .models import WeeklyLog, SupervisorReview
from .serializers import WeeklyLogSerializer, SupervisorReviewSerializer
from placements.models import InternshipPlacement

def is_supervisor_for_placement(user, placement):
    if user.role in ['admin', 'administrator']:
        return True
    elif user.role == 'workplace_supervisor':
        return placement.workplace_supervisor == user
    elif user.role == 'academic_supervisor':
        return placement.academic_supervisor == user
    return False

class IsOwnerOrSupervisor(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return (obj.student == request.user or request.user.role in ['academic_supervisor', 'workplace_supervisor', 'admin', 'administrator'])
        return (obj.student == request.user or request.user.role in ['admin', 'administrator'])

class IsSupervisorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['academic_supervisor', 'workplace_supervisor', 'admin', 'administrator']

class IsStudentOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'

class WeeklyLogListCreateView(generics.ListCreateAPIView):
    serializer_class = WeeklyLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['status', 'week_number', 'student__username']
    ordering_fields = ['week_number', 'created_at', 'submitted_at', 'status']
    ordering = ['-created_at']
    def get_queryset(self):
        user = self.request.user
        qs = WeeklyLog.objects.select_related('student', 'placement', 'placement__academic_supervisor', 'placement__workplace_supervisor').prefetch_related('review')
        if user.role in ['admin', 'administrator']:
            return qs
        elif user.role in ['academic_supervisor', 'workplace_supervisor']:
            return qs.filter(Q(placement__academic_supervisor=user) | Q(placement__workplace_supervisor=user)).distinct()
        elif user.role == 'student':
            return qs.filter(student=user)
        return WeeklyLog.objects.none()
    def perform_create(self, serializer):
        if self.request.user.role != 'student':
            raise PermissionDenied("Only students can create logs.")
        serializer.save(student=self.request.user)
    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})

class WeeklyLogDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WeeklyLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrSupervisor]
    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'administrator', 'academic_supervisor', 'workplace_supervisor']:
            return WeeklyLog.objects.all()
        return WeeklyLog.objects.filter(student=user)
    def update(self, request, *args, **kwargs):
        log = self.get_object()
        if log.status != 'draft':
            return Response({'error': 'Only draft logs can be edited.'}, status=400)
        return super().update(request, *args, **kwargs)
    def destroy(self, request, *args, **kwargs):
        log = self.get_object()
        if log.status != 'draft':
            return Response({'error': 'Only draft logs can be deleted.'}, status=400)
        return super().destroy(request, *args, **kwargs)

class SubmitLogView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStudentOnly]
    def post(self, request, pk):
        try:
            log = WeeklyLog.objects.get(pk=pk, student=request.user)
        except:
            return Response({'error': 'Log not found.'}, status=404)
        if log.status != 'draft':
            return Response({'error': f'Only draft logs can be submitted. Current: {log.status}'}, status=400)
        if log.placement.end_date < timezone.now().date():
            return Response({'error': f'Internship ended on {log.placement.end_date}.'}, status=400)
        if not log.activities or not log.activities.strip():
            return Response({'error': 'Activities required.'}, status=400)
        if not log.skills_learned or not log.skills_learned.strip():
            return Response({'error': 'Skills learned required.'}, status=400)
        log.status = 'submitted'
        log.submitted_at = timezone.now()
        log.save()
        return Response({'message': f'Week {log.week_number} submitted.', 'log_id': log.id, 'submitted_at': log.submitted_at, 'status': log.status}, status=200)

class SupervisorReviewView(generics.CreateAPIView):
    serializer_class = SupervisorReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAdmin]
    def perform_create(self, serializer):
        log_id = self.kwargs.get('log_id')
        try:
            log = WeeklyLog.objects.get(pk=log_id)
        except:
            raise NotFound("Log not found.")
        if log.status != 'submitted':
            raise ValidationError(f"Only submitted logs can be reviewed. Current: {log.status}")
        if not is_supervisor_for_placement(self.request.user, log.placement):
            raise PermissionDenied("You are not assigned as supervisor for this placement.")
        if hasattr(log, 'review'):
            raise ValidationError("This log already has a review.")
        serializer.save(supervisor=self.request.user, log=log)
        log.status = 'reviewed'
        log.reviewed_at = timezone.now()
        log.save()

class SupervisorReviewDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = SupervisorReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAdmin]
    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'administrator']:
            return SupervisorReview.objects.all()
        return SupervisorReview.objects.filter(supervisor=user)

class ApproveLogView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAdmin]
    def post(self, request, log_id):
        if request.user.role not in ['academic_supervisor', 'admin', 'administrator']:
            return Response({'error': 'Only academic supervisors can approve.'}, status=403)
        try:
            log = WeeklyLog.objects.get(pk=log_id)
        except:
            return Response({'error': 'Log not found.'}, status=404)
        if log.status != 'reviewed':
            return Response({'error': f'Only reviewed logs can be approved. Current: {log.status}'}, status=400)
        if request.user.role == 'academic_supervisor' and log.placement.academic_supervisor != request.user:
            return Response({'error': 'You are not the academic supervisor for this placement.'}, status=403)
        log.status = 'approved'
        log.approved_at = timezone.now()
        log.save()
        return Response({'message': f'Week {log.week_number} approved.', 'log_id': log.id, 'approved_at': log.approved_at, 'status': log.status}, status=200)

class StudentLogbookView(generics.ListCreateAPIView):
    serializer_class = WeeklyLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentOnly]
    def get_queryset(self):
        return WeeklyLog.objects.filter(student=self.request.user).order_by('week_number')
    def perform_create(self, serializer):
        serializer.save(student=self.request.user)
    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        stats = {
            'total_logs': qs.count(),
            'draft': qs.filter(status='draft').count(),
            'submitted': qs.filter(status='submitted').count(),
            'reviewed': qs.filter(status='reviewed').count(),
            'approved': qs.filter(status='approved').count(),
        }
        return Response({'statistics': stats, 'results': serializer.data})

class SupervisorReviewListView(generics.ListAPIView):
    serializer_class = WeeklyLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsSupervisorOrAdmin]
    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'administrator']:
            return WeeklyLog.objects.filter(status='submitted')
        if user.role == 'workplace_supervisor':
            placements = InternshipPlacement.objects.filter(workplace_supervisor=user)
        else:
            placements = InternshipPlacement.objects.filter(academic_supervisor=user)
        return WeeklyLog.objects.filter(placement__in=placements, status='submitted').order_by('submitted_at')
    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response({'pending_reviews': qs.count(), 'results': serializer.data})

class LogbookDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        user = request.user
        if user.role in ['admin', 'administrator']:
            logs = WeeklyLog.objects.all()
            total = logs.count()
            draft = logs.filter(status='draft').count()
            submitted = logs.filter(status='submitted').count()
            reviewed = logs.filter(status='reviewed').count()
            approved = logs.filter(status='approved').count()
            return Response({
                'role': 'admin',
                'summary': {
                    'total_logs': total,
                    'draft': draft,
                    'submitted': submitted,
                    'reviewed': reviewed,
                    'approved': approved,
                }
            })
        elif user.role == 'student':
            logs = WeeklyLog.objects.filter(student=user)
            total = logs.count()
            draft = logs.filter(status='draft').count()
            submitted = logs.filter(status='submitted').count()
            reviewed = logs.filter(status='reviewed').count()
            approved = logs.filter(status='approved').count()
            return Response({
                'role': 'student',
                'summary': {
                    'total_logs': total,
                    'draft': draft,
                    'submitted': submitted,
                    'reviewed': reviewed,
                    'approved': approved,
                }
            })
        elif user.role in ['workplace_supervisor', 'academic_supervisor']:
            if user.role == 'workplace_supervisor':
                placements = InternshipPlacement.objects.filter(workplace_supervisor=user)
            else:
                placements = InternshipPlacement.objects.filter(academic_supervisor=user)
            logs = WeeklyLog.objects.filter(placement__in=placements)
            total = logs.count()
            submitted = logs.filter(status='submitted').count()
            reviewed = logs.filter(status='reviewed').count()
            approved = logs.filter(status='approved').count()
            return Response({
                'role': user.role,
                'workload': {
                    'total_students': placements.count(),
                    'total_logs': total,
                    'pending_reviews': submitted,
                    'reviewed': reviewed,
                    'approved': approved,
                }
            })
        return Response({'error': 'Unknown role'})