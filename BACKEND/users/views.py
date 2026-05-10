from django.shortcuts import render
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer, UserSerializer
from .models import CustomUser

# CUSTOM PERMISSIONS

class IsAdminOnly(permissions.BasePermission):
    """
    Only allows administrators to access the view.
    Used for user management endpoints.
    """
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'admin'
        )

# AUTHENTICATION VIEWS

class RegisterView(generics.CreateAPIView):
    """
    POST: Register a new user account.
    Open to everyone — no authentication required.
    Returns JWT tokens on successful registration.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': f'Account created successfully! Welcome {user.username}!'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST: Login with username/email and password.
    Returns JWT access and refresh tokens on success.
    Access token expires after 1 day.
    Refresh token expires after 7 days.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username_or_email = request.data.get('username')
        password = request.data.get('password')

        # Check username/email and password are provided
        if not username_or_email or not password:
            return Response(
                {'error': 'Please provide username/email and password!'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authenticate with username first, then fallback to email
        user = authenticate(username=username_or_email, password=password)
        if not user:
            try:
                user_obj = CustomUser.objects.get(email__iexact=username_or_email)
                user = authenticate(username=user_obj.username, password=password)
            except CustomUser.DoesNotExist:
                user = None

        # Check if user exists
        if not user:
            return Response(
                {'error': 'Invalid username/email or password!'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Check if account is active
        if not user.is_active:
            return Response(
                {'error': 'Your account has been deactivated! '
                          'Please contact the administrator.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': f'Welcome back {user.username}!'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST: Logout the current user.
    Blacklists the refresh token so it cannot be used again.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
       return Response(
                {'message': 'Logged out successfully!'},
                status=status.HTTP_200_OK)

# PROFILE VIEWS

class ProfileView(APIView):
    """
    GET: Retrieve the current user profile.
    PUT/PATCH: Update the current user profile.
    Only the logged in user can view and update their profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return the current user profile data."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update the current user profile."""
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'user': serializer.data,
                'message': 'Profile updated successfully!'
            })
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class ChangePasswordView(APIView):
    """
    POST: Change the current user password.
    Requires old password for verification.
    Returns new JWT tokens after successful password change.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        # Check all fields are provided
        if not old_password or not new_password or not confirm_password:
            return Response(
                {'error': 'Please provide old password, '
                          'new password and confirm password!'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify old password is correct
        if not user.check_password(old_password):
            return Response(
                {'error': 'Old password is incorrect!'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check new passwords match
        if new_password != confirm_password:
            return Response(
                {'error': 'New passwords do not match!'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check new password is not same as old password
        if old_password == new_password:
            return Response(
                {'error': 'New password cannot be the same as old password!'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set the new password
        user.set_password(new_password)
        user.save()

        # Generate new tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Password changed successfully!',
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)

# ADMIN USER MANAGEMENT VIEWS

class AdminUserListView(generics.ListAPIView):
    """
    GET: List all users in the system.
    Admin only endpoint.
    Supports filtering by role and searching by username.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'date_joined', 'role']
    ordering = ['username']

    def get_queryset(self):
        queryset = CustomUser.objects.all()
        # Filter by role if provided in query params
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Add user statistics
        stats = {
            'total_users': CustomUser.objects.count(),
            'students': CustomUser.objects.filter(role='student').count(),
            'workplace_supervisors': CustomUser.objects.filter(
                role='workplace_supervisor'
            ).count(),
            'academic_supervisors': CustomUser.objects.filter(
                role='academic_supervisor'
            ).count(),
            'admins': CustomUser.objects.filter(role='admin').count(),
        }

        return Response({
            'statistics': stats,
            'count': queryset.count(),
            'results': serializer.data
        })


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET: Retrieve a single user by ID.
    PUT/PATCH: Update a user (admin only).
    Admin only endpoint.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    queryset = CustomUser.objects.all()


class AdminUserActivateView(APIView):
    """
    POST: Activate or deactivate a user account.
    Admin only endpoint.
    Used to enable or disable user access to the system.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def post(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Cannot deactivate yourself
        if user == request.user:
            return Response(
                {'error': 'You cannot deactivate your own account!'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Toggle active status
        user.is_active = not user.is_active
        user.save()

        action = 'activated' if user.is_active else 'deactivated'
        return Response({
            'message': f'User {user.username} has been {action}!',
            'is_active': user.is_active
        }, status=status.HTTP_200_OK)


class UsersByRoleView(generics.ListAPIView):
    """
    GET: List all users with a specific role.
    Used by admins to find students, supervisors etc.
    Example: /api/users/by-role/?role=student
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def get_queryset(self):
        role = self.request.query_params.get('role', '')
        valid_roles = [
            'student',
            'workplace_supervisor',
            'academic_supervisor',
            'admin'
        ]
        if role not in valid_roles:
            return CustomUser.objects.none()
        return CustomUser.objects.filter(
            role=role,
            is_active=True
        ).order_by('username')