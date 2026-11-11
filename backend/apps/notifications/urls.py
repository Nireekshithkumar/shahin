from django.urls import path
from apps.notifications.views import (
    NotificationListView,
    MarkNotificationReadView,
    NotificationPreferencesView,
    EmailDeliveryHistoryView,
    SendTestEmailView,
    PublicUnsubscribeView,
    AdminNotificationStatsView,
    AdminDeliveryLogsView,
    AdminRetryEmailView,
    AdminTemplatePreviewView,
)

urlpatterns = [
    # Core User Notifications
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:id>/read/', MarkNotificationReadView.as_view(), name='notification-mark-read'),
    path('preferences/', NotificationPreferencesView.as_view(), name='notification-preferences'),
    path('email-history/', EmailDeliveryHistoryView.as_view(), name='notification-email-history'),
    path('test-email/', SendTestEmailView.as_view(), name='notification-test-email'),
    path('unsubscribe/', PublicUnsubscribeView.as_view(), name='notification-unsubscribe'),

    # Admin Monitoring & Ops
    path('admin/stats/', AdminNotificationStatsView.as_view(), name='notification-admin-stats'),
    path('admin/logs/', AdminDeliveryLogsView.as_view(), name='notification-admin-logs'),
    path('admin/retry/<int:log_id>/', AdminRetryEmailView.as_view(), name='notification-admin-retry'),
    path('admin/templates/<str:template_type>/preview/', AdminTemplatePreviewView.as_view(), name='notification-admin-preview'),
]
