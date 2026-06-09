from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Count, Q
from .models import InternshipPlacement
from .serializers import InternshipPlacementSerializer, PlacementStatusUpdateSerializer

class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'administrator']

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role in ['admin', 'administrator']

class IsStudentOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['student', 'admin', 'administrator']

class IsSupervisorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['workplace_supervisor', 'academic_supervisor', 'admin', 'administrator']

class PlacementListCreateView(generics.ListCreateAPIView):
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name', 'student__username', 'status']
    ordering_fields = ['start_date', 'end_date', 'created_at', 'status']
    ordering = ['-created_at']
    def get_queryset(self):
        user = self.request.user
        qs = InternshipPlacement.objects.select_related('student', 'academic_supervisor', 'workplace_supervisor')
        if user.role in ['admin', 'administrator']:
            return qs
        elif user.role == 'academic_supervisor':
            return qs.filter(academic_supervisor=user)
        elif user.role == 'workplace_supervisor':
            return qs.filter(workplace_supervisor=user)
        elif user.role == 'student':
            return qs.filter(student=user)
        return InternshipPlacement.objects.none()
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsAdminOnly()]
        return [permissions.IsAuthenticated()]
    def perform_create(self, serializer):
        serializer.save(status='pending')
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'count': queryset.count(), 'results': serializer.data})

class PlacementDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    def get_queryset(self):
        user = self.request.user
        qs = InternshipPlacement.objects.select_related('student', 'academic_supervisor', 'workplace_supervisor')
        if user.role in ['admin', 'administrator']:
            return qs
        elif user.role == 'academic_supervisor':
            return qs.filter(academic_supervisor=user)
        elif user.role == 'workplace_supervisor':
            return qs.filter(workplace_supervisor=user)
        elif user.role == 'student':
            return qs.filter(student=user)
        return InternshipPlacement.objects.none()
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status == 'active':
            return Response({'error': 'Cannot delete active placement.'}, status=400)
        return super().destroy(request, *args, **kwargs)

class PlacementStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    VALID_TRANSITIONS = {'pending': ['active', 'cancelled'], 'active': ['completed', 'cancelled'], 'completed': [], 'cancelled': []}
    def patch(self, request, pk):
        try:
            placement = InternshipPlacement.objects.get(pk=pk)
        except:
            return Response({'error': 'Placement not found.'}, status=404)
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'status field required.'}, status=400)
        if new_status not in ['pending', 'active', 'completed', 'cancelled']:
            return Response({'error': 'Invalid status.'}, status=400)
        if new_status not in self.VALID_TRANSITIONS.get(placement.status, []):
            return Response({'error': f'Cannot transition from {placement.status} to {new_status}.'}, status=400)
        placement.status = new_status
        placement.save()
        return Response({'message': f'Status updated to {new_status}.'}, status=200)

class AdminPlacementListView(generics.ListAPIView):
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    def get_queryset(self):
        return InternshipPlacement.objects.all().order_by('-created_at')
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        stats = {
            'total': queryset.count(),
            'pending': queryset.filter(status='pending').count(),
            'active': queryset.filter(status='active').count(),
            'completed': queryset.filter(status='completed').count(),
            'cancelled': queryset.filter(status='cancelled').count(),
        }
        return Response({'statistics': stats, 'results': serializer.data})

class StudentPlacementView(generics.ListCreateAPIView):
    serializer_class = InternshipPlacementSerializer
    permission_classes = [permissions.IsAuthenticated, IsStudentOrAdmin]
    def get_queryset(self):
        if self.request.user.role == 'student':
            return InternshipPlacement.objects.filter(student=self.request.user).order_by('-start_date')
        return InternshipPlacement.objects.none()
    def perform_create(self, serializer):
        serializer.save(student=self.request.user, status='pending')
    def create(self, request, *args, **kwargs):
        existing = InternshipPlacement.objects.filter(student=request.user, status__in=['pending', 'active']).first()
        if existing:
            return Response({'error': 'You already have a pending or active placement request.'}, status=400)
        return super().create(request, *args, **kwargs)

class PlacementDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        user = request.user
        today = timezone.now().date()
        if user.role in ['admin', 'administrator']:
            qs = InternshipPlacement.objects.all()
            return Response({
                'role': 'administrator',
                'summary': {
                    'total_placements': qs.count(),
                    'active_placements': qs.filter(status='active').count(),
                    'pending_placements': qs.filter(status='pending').count(),
                    'completed_placements': qs.filter(status='completed').count(),
                    'cancelled_placements': qs.filter(status='cancelled').count(),
                }
            })
        elif user.role == 'student':
            placements = InternshipPlacement.objects.filter(student=user)
            active = placements.filter(status='active').first()
            return Response({
                'role': 'student',
                'total_placements': placements.count(),
                'current_placement': InternshipPlacementSerializer(active).data if active else None,
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