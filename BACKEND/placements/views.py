from django.shortcuts import render
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
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
    Only allows access to users with the admin role.
    Used for creating, updating and deleting placements.
    """
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'admin'
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
            request.user.role == 'admin'
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
            request.user.role in ['student', 'admin']
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
                'admin'
            ]
        )


# ============================================================
# PLACEMENT VIEWS
# ============================================================

class PlacementListCreateView(generics.ListCreateAPIView):
    """
    GET: List all placements visible to the current user.
    POST: Create a new placement (admin only).

    Role based filtering:
    - Admin: sees all placements
    - Academic Supervisor: sees placements they supervise academically
    - Workplace Supervisor: sees placements they supervise at work
    - Student: sees only their own placements
    """
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name', 'student__username', 'status']
    ordering_fields = ['start_date', 'end_date', 'created_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return InternshipPlacement.objects.all()
        elif user.role == 'academic_supervisor':
            return InternshipPlacement.objects.filter(
                academic_supervisor=user
            )
        elif user.role == 'workplace_supervisor':
            return InternshipPlacement.objects.filter(
                workplace_supervisor=user
            )
        elif user.role == 'student':
            return InternshipPlacement.objects.filter(
                student=user
            )
        return InternshipPlacement.objects.none()

    def get_permissions(self):
        """Only admins can create placements."""
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsAdminOnly()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        """Automatically set status to pending on creation."""
        serializer.save(status='pending')

    def list(self, request, *args, **kwargs):
        """Override list to add summary statistics."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })


class PlacementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a single placement.
    PUT/PATCH: Update a placement (admin only).
    DELETE: Delete a placement (admin only).
    """
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return InternshipPlacement.objects.all()
        elif user.role == 'academic_supervisor':
            return InternshipPlacement.objects.filter(
                academic_supervisor=user
            )
        elif user.role == 'workplace_supervisor':
            return InternshipPlacement.objects.filter(
                workplace_supervisor=user
            )
        elif user.role == 'student':
            return InternshipPlacement.objects.filter(
                student=user
            )
        return InternshipPlacement.objects.none()

    def destroy(self, request, *args, **kwargs):
        """Prevent deletion of active placements."""
        placement = self.get_object()
        if placement.status == 'active':
            return Response(
                {'error': 'Cannot delete an active placement. '
                          'Please cancel it first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class PlacementStatusUpdateView(APIView):
    """
    PATCH: Update placement status only.
    Admin only endpoint.
    Valid transitions:
    pending → active → completed
    pending → cancelled
    active → cancelled
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def patch(self, request, pk):
        try:
            placement = InternshipPlacement.objects.get(pk=pk)
        except InternshipPlacement.DoesNotExist:
            return Response(
                {'error': 'Placement not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get('status')
        valid_statuses = ['pending', 'active', 'completed', 'cancelled']

        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Choose from: '
                          f'{", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent invalid transitions
        if placement.status == 'completed':
            return Response(
                {'error': 'Cannot change status of a completed placement.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = placement.status
        placement.status = new_status
        placement.save()

        return Response({
            'message': f'Placement status updated from '
                       f'{old_status} to {new_status}!',
            'placement_id': placement.id,
            'new_status': new_status
        }, status=status.HTTP_200_OK)


class AdminPlacementListView(generics.ListAPIView):
    """
    GET: List all placements with full details.
    Admin only endpoint.
    Includes statistics per status.
    """
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def get_queryset(self):
        return InternshipPlacement.objects.all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Add statistics
        stats = {
            'total': queryset.count(),
            'pending': queryset.filter(status='pending').count(),
            'active': queryset.filter(status='active').count(),
            'completed': queryset.filter(status='completed').count(),
            'cancelled': queryset.filter(status='cancelled').count(),
        }

        return Response({
            'statistics': stats,
            'results': serializer.data
        })


class StudentPlacementView(generics.ListAPIView):
    """
    GET: List all placements for the currently logged in student.
    Students can only see their own placements.
    """
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentOrAdmin]

    def get_queryset(self):
        if self.request.user.role == 'student':
            return InternshipPlacement.objects.filter(
                student=self.request.user
            ).order_by('-start_date')
        return InternshipPlacement.objects.none()


class PlacementDashboardView(APIView):
    """
    GET: Returns dashboard statistics for placements.
    Shows different data based on the user role.
    Used by the frontend dashboard components.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        if user.role == 'admin':
            total = InternshipPlacement.objects.count()
            active = InternshipPlacement.objects.filter(
                status='active'
            ).count()
            pending = InternshipPlacement.objects.filter(
                status='pending'
            ).count()
            completed = InternshipPlacement.objects.filter(
                status='completed'
            ).count()
            return Response({
                'role': 'admin',
                'total_placements': total,
                'active_placements': active,
                'pending_placements': pending,
                'completed_placements': completed,
            })

        elif user.role == 'student':
            placements = InternshipPlacement.objects.filter(student=user)
            active = placements.filter(status='active').first()
            return Response({
                'role': 'student',
                'total_placements': placements.count(),
                'current_placement': InternshipPlacementSerializer(
                    active
                ).data if active else None,
            })

        elif user.role in ['workplace_supervisor', 'academic_supervisor']:
            if user.role == 'workplace_supervisor':
                placements = InternshipPlacement.objects.filter(
                    workplace_supervisor=user
                )
            else:
                placements = InternshipPlacement.objects.filter(
                    academic_supervisor=user
                )
            return Response({
                'role': user.role,
                'total_students': placements.count(),
                'active_students': placements.filter(
                    status='active'
                ).count(),
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