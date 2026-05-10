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
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()

        if user.role in ['admin', 'administrator']:
            qs = InternshipPlacement.objects.all()
            return Response({
                'role': 'administrator',
                'total_placements':     qs.count(),
                'active_placements':    qs.filter(status='active').count(),
                'pending_placements':   qs.filter(status='pending').count(),
                'completed_placements': qs.filter(status='completed').count(),
            })

        elif user.role == 'student':
            placements = InternshipPlacement.objects.filter(student=user)
            active = placements.filter(status='active').first()
            return Response({
                'role': 'student',
                'total_placements': placements.count(),
                'current_placement': InternshipPlacementSerializer(
                    active, context={'request': request}
                ).data if active else None,
            })

        elif user.role in ['workplace_supervisor', 'academic_supervisor']:
            if user.role == 'workplace_supervisor':
                placements = InternshipPlacement.objects.filter(workplace_supervisor=user)
            else:
                placements = InternshipPlacement.objects.filter(academic_supervisor=user)
            return Response({
                'role': user.role,
                'total_students': placements.count(),
                'active_students': placements.filter(status='active').count(),
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