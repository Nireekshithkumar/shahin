from django.urls import path
from apps.profiles.views import (
    ProfileDetailView,
    UserDocumentListCreateView,
    UserDocumentDetailView,
    DocumentReadinessCheckView,
    FamilyMemberListCreateView,
    FamilyMemberDetailView,
    FamilySchemeDiscoveryView
)

urlpatterns = [
    path('', ProfileDetailView.as_view(), name='profile-detail'),
    path('documents/', UserDocumentListCreateView.as_view(), name='user-documents'),
    path('documents/<int:pk>/', UserDocumentDetailView.as_view(), name='user-document-detail'),
    path('documents/readiness/', DocumentReadinessCheckView.as_view(), name='document-readiness-check'),
    path('family/', FamilyMemberListCreateView.as_view(), name='family-member-list'),
    path('family/<int:pk>/', FamilyMemberDetailView.as_view(), name='family-member-detail'),
    path('family/<int:pk>/schemes/', FamilySchemeDiscoveryView.as_view(), name='family-scheme-discovery'),
]
