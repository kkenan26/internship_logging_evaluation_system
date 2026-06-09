from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer, UserSerializer
from .models import CustomUser

class IsAdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'administrator']

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': f'Welcome {user.username}!'
        }, status=201)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        username_or_email = request.data.get('username')
        password = request.data.get('password')
        if not username_or_email or not password:
            return Response({'error': 'Username/email and password required.'}, status=400)
        user = authenticate(username=username_or_email, password=password)
        if not user:
            try:
                user_obj = CustomUser.objects.get(email__iexact=username_or_email)
                user = authenticate(username=user_obj.username, password=password)
            except:
                user = None
        if not user:
            return Response({'error': 'Invalid credentials.'}, status=401)
        if not user.is_active:
            return Response({'error': 'Account deactivated.'}, status=403)
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': f'Welcome back {user.username}!'
        }, status=200)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        return Response({'message': 'Logged out.'}, status=200)

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response(UserSerializer(request.user).data)
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'user': serializer.data, 'message': 'Profile updated.'})
        return Response(serializer.errors, status=400)

class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'date_joined', 'role']
    ordering = ['username']
    def get_queryset(self):
        qs = CustomUser.objects.all()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs
    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        stats = {
            'total_users': CustomUser.objects.count(),
            'students': CustomUser.objects.filter(role='student').count(),
            'workplace_supervisors': CustomUser.objects.filter(role='workplace_supervisor').count(),
            'academic_supervisors': CustomUser.objects.filter(role='academic_supervisor').count(),
            'admins': CustomUser.objects.filter(role='admin').count(),
        }
        return Response({'statistics': stats, 'count': qs.count(), 'results': serializer.data})