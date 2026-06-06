from django.shortcuts import render
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db.models import Count, Q
from .models import InternshipPlacement
from .serializers import (
    InternshipPlacementSerializer,
    PlacementStatusUpdateSerializer,
    PlacementListSerializer
)


# ============================================================
# CUSTOM PERMISSIONS
# ============================================================

class IsAdminOnly(permissions.BasePermission):
    """
    Only allows access to users with the administrator role.
    """
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ['admin', 'administrator']  # accept both for safety
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allows read access to all authenticated users.
    Only allows write access to administrators.
    """
    message = "Only administrators can modify placements."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return (
            request.user.is_authenticated and
            request.user.role in ['admin', 'administrator']
        )


class IsStudentOrAdmin(permissions.BasePermission):
    """
    Allows access to students viewing their own placements
    and administrators viewing all placements.
    """
    message = "You do not have permission to view this placement."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ['student', 'admin', 'administrator']
        )


class IsSupervisorOrAdmin(permissions.BasePermission):
    """
    Allows access to workplace supervisors, academic supervisors
    and administrators.
    """
    message = "Only supervisors and administrators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in [
                'workplace_supervisor',
                'academic_supervisor',
                'admin',
                'administrator',
            ]
        )


# ============================================================
# PLACEMENT VIEWS
# ============================================================

class PlacementListCreateView(generics.ListCreateAPIView):
    """
    GET:  List all placements visible to the current user.
    POST: Create a new placement (admin only).

    Role-based filtering:
    - Admin/Administrator : sees all placements
    - Academic Supervisor : sees placements they supervise academically
    - Workplace Supervisor: sees placements they supervise at work
    - Student             : sees only their own placements
    """
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name', 'student__username', 'status']
    ordering_fields = ['start_date', 'end_date', 'created_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = InternshipPlacement.objects.select_related(
            'student',
            'academic_supervisor',
            'workplace_supervisor'
        )
        
        if user.role == 'admin':
            return queryset
        elif user.role == 'academic_supervisor':
            return queryset.filter(academic_supervisor=user)
        elif user.role == 'workplace_supervisor':
            return queryset.filter(workplace_supervisor=user)
        elif user.role == 'student':
            return queryset.filter(student=user)
        return InternshipPlacement.objects.none()

    def get_permissions(self):
        """Only admins can create placements via this endpoint."""
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsAdminOnly()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(status='pending')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data,
        })


class PlacementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET         : Retrieve a single placement.
    PUT / PATCH : Update a placement (admin only).
    DELETE      : Delete a placement (admin only).
    """
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        queryset = InternshipPlacement.objects.select_related(
            'student',
            'academic_supervisor',
            'workplace_supervisor'
        )
        
        if user.role == 'admin':
            return queryset
        elif user.role == 'academic_supervisor':
            return queryset.filter(academic_supervisor=user)
        elif user.role == 'workplace_supervisor':
            return queryset.filter(workplace_supervisor=user)
        elif user.role == 'student':
            return queryset.filter(student=user)
        return InternshipPlacement.objects.none()

    def destroy(self, request, *args, **kwargs):
        placement = self.get_object()
        if placement.status == 'active':
            return Response(
                {'error': 'Cannot delete an active placement. Please cancel it first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class PlacementStatusUpdateView(APIView):
    """
    PATCH: Update placement status only (admin only).

    Valid transitions:
      pending  → active | cancelled
      active   → completed | cancelled
      completed / cancelled → no further changes
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    VALID_TRANSITIONS = {
        'pending':   ['active', 'cancelled'],
        'active':    ['completed', 'cancelled'],
        'completed': [],
        'cancelled': [],
    }

    def patch(self, request, pk):
        try:
            placement = InternshipPlacement.objects.get(pk=pk)
        except InternshipPlacement.DoesNotExist:
            return Response(
                {'error': 'Placement not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get('status')
        allowed = self.VALID_TRANSITIONS.get(placement.status, [])

        if not new_status:
            return Response(
                {'error': 'status field is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_status not in ['pending', 'active', 'completed', 'cancelled']:
            return Response(
                {'error': 'Invalid status. Choose from: pending, active, completed, cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_status not in allowed:
            return Response(
                {'error': f'Cannot transition from "{placement.status}" to "{new_status}".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = placement.status
        placement.status = new_status
        placement.save()

        return Response({
            'message': f'Placement status updated from {old_status} to {new_status}.',
            'placement_id': placement.id,
            'new_status': new_status,
        }, status=status.HTTP_200_OK)


class AdminPlacementListView(generics.ListAPIView):
    """
    GET: List all placements with full details + statistics (admin only).
    """
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def get_queryset(self):
        return InternshipPlacement.objects.all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        stats = {
            'total':     queryset.count(),
            'pending':   queryset.filter(status='pending').count(),
            'active':    queryset.filter(status='active').count(),
            'completed': queryset.filter(status='completed').count(),
            'cancelled': queryset.filter(status='cancelled').count(),
        }
        return Response({
            'statistics': stats,
            'results': serializer.data,
        })


class StudentPlacementView(generics.ListCreateAPIView):
    """
    GET : Return the logged-in student's placements.
    POST: Allow a student to submit a new placement request.

    URL: /api/placements/my-placement/
    """
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return InternshipPlacement.objects.filter(
                student=user
            ).order_by('-start_date')
        # Admins can see all via AdminPlacementListView; return none here
        return InternshipPlacement.objects.none()

    def perform_create(self, serializer):
        """Automatically assign the logged-in student and set status pending."""
        serializer.save(student=self.request.user, status='pending')

    def create(self, request, *args, **kwargs):
        # Prevent a student from submitting duplicate active/pending requests
        existing = InternshipPlacement.objects.filter(
            student=request.user,
            status__in=['pending', 'active']
        ).first()
        if existing:
            return Response(
                {'error': 'You already have a pending or active placement request.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().create(request, *args, **kwargs)


class PlacementLetterUploadView(APIView):
    """
    PATCH: Upload or replace the acceptance letter for a placement.

    URL: /api/placements/<pk>/upload-letter/
    Allowed roles: student (own placement only), admin
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, pk):
        try:
            placement = InternshipPlacement.objects.get(pk=pk)
        except InternshipPlacement.DoesNotExist:
            return Response(
                {'error': 'Placement not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Students can only upload to their own placement
        user = request.user
        if user.role == 'student' and placement.student != user:
            return Response(
                {'error': 'You can only upload a letter for your own placement.'},
                status=status.HTTP_403_FORBIDDEN
            )

        letter = request.FILES.get('acceptance_letter')
        if not letter:
            return Response(
                {'error': 'No file provided. Use the key "acceptance_letter".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        placement.acceptance_letter = letter
        placement.save()

        serializer = InternshipPlacementSerializer(placement, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class PlacementDashboardView(APIView):
    """
    GET: Returns dashboard statistics tailored to the user's role.
    Includes detailed metrics and trends.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        if user.role in ['admin', 'administrator']:
            qs = InternshipPlacement.objects.all()

            # Basic counts
            total_placements = qs.count()
            active_placements = qs.filter(status='active').count()
            pending_placements = qs.filter(status='pending').count()
            completed_placements = qs.filter(status='completed').count()
            cancelled_placements = qs.filter(status='cancelled').count()

            # Company statistics
            company_stats = qs.values('company_name').annotate(
                count=Count('id')
            ).order_by('-count')[:5]

            # Monthly trends (last 6 months)
            from datetime import timedelta
            monthly_stats = []
            for i in range(6):
                month_start = (today.replace(day=1) - timedelta(days=i*30))
                month_end = month_start.replace(day=28) + timedelta(days=4)  # Handle month end
                month_end = min(month_end, today)

                month_placements = qs.filter(created_at__date__gte=month_start, created_at__date__lte=month_end)
                monthly_stats.append({
                    'month': month_start.strftime('%Y-%m'),
                    'total': month_placements.count(),
                    'active': month_placements.filter(status='active').count(),
                    'completed': month_placements.filter(status='completed').count(),
                })

            # Supervisor assignment stats
            unassigned_academic = qs.filter(academic_supervisor__isnull=True, status='active').count()
            unassigned_workplace = qs.filter(workplace_supervisor__isnull=True, status='active').count()

            return Response({
                'role': 'administrator',
                'summary': {
                    'total_placements': total_placements,
                    'active_placements': active_placements,
                    'pending_placements': pending_placements,
                    'completed_placements': completed_placements,
                    'cancelled_placements': cancelled_placements,
                },
                'company_distribution': list(company_stats),
                'monthly_trends': monthly_stats,
                'supervisor_assignments': {
                    'unassigned_academic': unassigned_academic,
                    'unassigned_workplace': unassigned_workplace,
                }
            })

        elif user.role == 'student':
            placements = InternshipPlacement.objects.filter(student=user)
            active = placements.filter(status='active').first()

            # Progress tracking
            total_placements = placements.count()
            completed_count = placements.filter(status='completed').count()
            success_rate = (completed_count / total_placements * 100) if total_placements > 0 else 0

            # Current placement details
            current_info = None
            if active:
                from datetime import date
                days_elapsed = (today - active.start_date).days
                total_days = (active.end_date - active.start_date).days
                progress_percentage = min((days_elapsed / total_days * 100), 100) if total_days > 0 else 0

                current_info = {
                    'company': active.company_name,
                    'start_date': active.start_date,
                    'end_date': active.end_date,
                    'days_elapsed': days_elapsed,
                    'total_days': total_days,
                    'progress_percentage': round(progress_percentage, 1),
                    'has_letter': active.acceptance_letter is not None,
                }

            return Response({
                'role': 'student',
                'summary': {
                    'total_placements': total_placements,
                    'completed_placements': completed_count,
                    'success_rate': round(success_rate, 1),
                },
                'current_placement': current_info,
            })

        elif user.role in ['workplace_supervisor', 'academic_supervisor']:
            if user.role == 'workplace_supervisor':
                placements = InternshipPlacement.objects.filter(workplace_supervisor=user)
            else:
                placements = InternshipPlacement.objects.filter(academic_supervisor=user)

            # Workload statistics
            total_students = placements.count()
            active_students = placements.filter(status='active').count()
            pending_reviews = placements.filter(status='pending').count()

            # Evaluation completion rates
            evaluated_students = 0
            if user.role == 'academic_supervisor':
                evaluated_students = placements.filter(
                    academicevaluation__isnull=False
                ).distinct().count()
            else:
                evaluated_students = placements.filter(
                    workplaceevaluation__isnull=False
                ).distinct().count()

            evaluation_rate = (evaluated_students / active_students * 100) if active_students > 0 else 0

            # Recent activity (last 30 days)
            recent_placements = placements.filter(
                created_at__gte=timezone.now() - timedelta(days=30)
            ).count()

            return Response({
                'role': user.role,
                'workload': {
                    'total_students': total_students,
                    'active_students': active_students,
                    'pending_reviews': pending_reviews,
                    'evaluation_completion_rate': round(evaluation_rate, 1),
                },
                'recent_activity': {
                    'new_assignments_last_30_days': recent_placements,
                }
            })

        return Response({'error': 'Unknown role'})
    

class StudentPlacementRequestView(generics.CreateAPIView):
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(student=self.request.user, status='pending')

class StudentUploadLetterView(generics.UpdateAPIView):
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return InternshipPlacement.objects.filter(student=self.request.user)
    
    def perform_update(self, serializer):
        from django.utils import timezone
        serializer.save(letter_submitted_at=timezone.now())

class AdminApprovePlacementView(generics.UpdateAPIView):
    queryset = InternshipPlacement.objects.all()
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_update(self, serializer):
        serializer.save(status='active')