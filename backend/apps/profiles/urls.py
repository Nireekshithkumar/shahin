from django.urls import path
from apps.profiles.views import (
    ProfileDetailView,
    UserDocumentListCreateView,
    UserDocumentDetailView,
    UserDocumentReplaceView,
    DocumentProposalsView,
    AllPendingProposalsView,
    DocumentRenewalGuidanceView,
    CertificateValidityRulesView,
    DocumentAuditLogsView,
    UserDocumentRAGAnalysisView,
    DocumentReadinessCheckView,
    FamilyMemberListCreateView,
    FamilyMemberDetailView,
    FamilySchemeDiscoveryView
)

urlpatterns = [
    path('', ProfileDetailView.as_view(), name='profile-detail'),
    path('documents/', UserDocumentListCreateView.as_view(), name='user-documents'),
    path('documents/rules/', CertificateValidityRulesView.as_view(), name='document-validity-rules'),
    path('documents/audit-logs/', DocumentAuditLogsView.as_view(), name='document-audit-logs'),
    path('documents/proposals/pending/', AllPendingProposalsView.as_view(), name='document-all-pending-proposals'),
    path('documents/<int:pk>/', UserDocumentDetailView.as_view(), name='user-document-detail'),
    path('documents/<int:pk>/replace/', UserDocumentReplaceView.as_view(), name='user-document-replace'),
    path('documents/<int:pk>/proposals/', DocumentProposalsView.as_view(), name='document-proposals'),
    path('documents/<int:pk>/renewal-guidance/', DocumentRenewalGuidanceView.as_view(), name='document-renewal-guidance'),
    path('documents/<int:pk>/rag-analysis/', UserDocumentRAGAnalysisView.as_view(), name='user-document-rag-analysis'),
    path('documents/readiness/', DocumentReadinessCheckView.as_view(), name='document-readiness-check'),
    path('family/', FamilyMemberListCreateView.as_view(), name='family-member-list'),
    path('family/<int:pk>/', FamilyMemberDetailView.as_view(), name='family-member-detail'),
    path('family/<int:pk>/schemes/', FamilySchemeDiscoveryView.as_view(), name='family-scheme-discovery'),
]
