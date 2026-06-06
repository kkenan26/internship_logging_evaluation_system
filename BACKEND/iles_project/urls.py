from django.http import HttpResponse
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)
def home(request):
    return HttpResponse(
        """
        <html>
            <head>
                <title>Internship Logging and Evaluation System</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    button { padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #007bff; color: white; border: none; border-radius: 5px; }
                    button:hover { background-color: #0056b3; }
                </style>
            </head>
            <body>
                <h1>Internship Logging and Evaluation System</h1>
                <p><strong>Track. Monitor. Evaluate. Grow.</strong></p>
                <p>A centralized platform designed to simplify internship management through digital activity logging, supervisor feedback, and performance evaluation.</p>
                <a href="http://localhost:5173/"><button>Get Started</button></a>
            </body>
        </html>
        """,
        content_type="text/html"
    )
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
    path('', home, name='home'),
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