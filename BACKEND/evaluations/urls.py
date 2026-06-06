"""
URLs for the Evaluations App
This module defines all API endpoints related to student evaluations,
academic evaluations, criteria management, and reporting.
"""

from django.urls import path
from . import views

app_name = 'evaluations'

urlpatterns = [
    # ====================== EVALUATION CRITERIA ======================
    path(
        'criteria/',
        views.EvaluationCriteriaListView.as_view(),
        name='criteria-list'
    ),
    path(
        'criteria/<int:pk>/',
        views.EvaluationCriteriaDetailView.as_view(),
        name='criteria-detail'
    ),

    # ====================== CORE EVALUATIONS ======================
    path(
        '',
        views.EvaluationListCreateView.as_view(),
        name='evaluation-list-create'
    ),
    path(
        '<int:pk>/',
        views.EvaluationDetailView.as_view(),
        name='evaluation-detail'
    ),

    # ====================== STUDENT ENDPOINTS ======================
    path(
        'student/',
        views.StudentEvaluationView.as_view(),
        name='student-evaluations'
    ),
    path(
        'score/<int:student_id>/',
        views.StudentScoreView.as_view(),
        name='student-total-score'
    ),

    # ====================== ACADEMIC EVALUATIONS ======================
    path(
        'academic/',
        views.AcademicEvaluationListCreateView.as_view(),
        name='academic-evaluation-list-create'
    ),
    path(
        'academic/<int:pk>/',
        views.AcademicEvaluationDetailView.as_view(),
        name='academic-evaluation-detail'
    ),

    # ====================== ADMIN & REPORTING ======================
    path(
        'admin-report/',
        views.AdminReportView.as_view(),
        name='admin-report'
    ),
    path(
        'comprehensive-dashboard/',
        views.ComprehensiveDashboardView.as_view(),
        name='comprehensive-dashboard'
    ),

    # ====================== FUTURE ENDPOINTS (Commented) ======================
    # path('ranking/', views.StudentRankingView.as_view(), name='student-ranking'),
    # path('statistics/', views.EvaluationStatisticsView.as_view(), name='evaluation-statistics'),
    # path('bulk-upload/', views.BulkEvaluationUploadView.as_view(), name='bulk-upload'),
]