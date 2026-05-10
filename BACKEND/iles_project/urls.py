from django.http import HttpResponse
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)
def home(request):
    return HttpResponse("Welcome 🚀")
from users.views import (
    RegisterView,
    LoginView,
    ProfileView,
    LogoutView,
    AdminUserListView
)
from evaluations.views import (
    AdminReportView,
    StudentEvaluationView,
    AcademicEvaluationListCreateView
)
from logbook.views import StudentLogbookView, SupervisorReviewListView
from placements.views import StudentPlacementView

urlpatterns = [
     path('', home),   #  homepage
    path('admin/', admin.site.urls),

    # JWT Authentication
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Authentication endpoints (prefer /api/auth/ paths)
    path('api/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/auth/profile/', ProfileView.as_view(), name='auth-profile'),
    path('api/auth/logout/', LogoutView.as_view(), name='auth-logout'),
    
    # Users management
    path('api/users/', include('users.urls')),

    # Placements
    path('api/placements/', include('placements.urls')),

    # Logbook
    path('api/logs/', include('logbook.urls')),

    # Evaluations
    path('api/evaluations/', include('evaluations.urls')),

    # Admin endpoints
    path('api/admin/users/', AdminUserListView.as_view(), name='admin-users'),
    path('api/admin/reports/', AdminReportView.as_view(), name='admin-reports'),

    # Student endpoints
    path('api/student/logbook/', StudentLogbookView.as_view(), name='student-logbook'),
    path('api/student/placement/', StudentPlacementView.as_view(), name='student-placement'),
    path('api/student/evaluation/', StudentEvaluationView.as_view(), name='student-evaluation'),

    # Supervisor endpoints
    path('api/supervisor/reviews/', SupervisorReviewListView.as_view(), name='supervisor-reviews'),

    # Academic evaluation endpoint
    path('api/academic/evaluations/', AcademicEvaluationListCreateView.as_view(), name='academic-evaluations'),
    
]