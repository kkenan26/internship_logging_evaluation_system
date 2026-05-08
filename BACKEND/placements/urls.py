from django.urls import path
from . import views
from .views import StudentPlacementRequestView, StudentUploadLetterView, AdminApprovePlacementView

urlpatterns = [
    path('', views.PlacementListCreateView.as_view(), name='placement-list-create'),
    path('<int:pk>/', views.PlacementDetailView.as_view(), name='placement-detail'),
    path('<int:pk>/status/', views.PlacementStatusUpdateView.as_view(), name='placement-status'),
    path('admin/', views.AdminPlacementListView.as_view(), name='admin-placements'),
    path('my-placement/', views.StudentPlacementView.as_view(), name='student-placement'),
    path('dashboard/', views.PlacementDashboardView.as_view(), name='placement-dashboard'),
    path('request/', StudentPlacementRequestView.as_view(), name='placement_request'),
    path('<int:pk>/upload-letter/', StudentUploadLetterView.as_view(), name='upload_letter'),
    path('<int:pk>/approve/', AdminApprovePlacementView.as_view(), name='approve_placement'),
]