import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import views, permissions, status, generics
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from apps.notifications.models import (
    Notification,
    UserNotificationPreference,
    EmailDeliveryLog,
    EmailDeliveryStatus,
    NotificationType,
    OpportunitySubscription,
    EmailTemplate,
)
from apps.notifications.serializers import (
    NotificationSerializer,
    UserNotificationPreferenceSerializer,
    EmailDeliveryLogSerializer,
    OpportunitySubscriptionSerializer,
    EmailTemplateSerializer,
)
from apps.notifications.email_service import EmailService
from apps.opportunities.models import Opportunity

from apps.accounts.permissions import IsScholarSetuAdmin

logger = logging.getLogger('notifications')

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class NotificationListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'
        qs = Notification.objects.filter(user=request.user)
        if unread_only:
            qs = qs.filter(is_read=False)
        
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = NotificationSerializer(page, many=True)

        return paginator.get_paginated_response({
            'unread_count': unread_count,
            'notifications': serializer.data
        })

    def patch(self, request):
        """Mark all notifications as read."""
        updated = Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'status': 'all marked as read', 'count': updated}, status=status.HTTP_200_OK)

class MarkNotificationReadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, id):
        try:
            notif = Notification.objects.get(id=id, user=request.user)
            notif.is_read = True
            notif.read_at = timezone.now()
            notif.save(update_fields=['is_read', 'read_at'])
            return Response({'status': 'marked as read', 'id': notif.id}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

class NotificationPreferencesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        pref, _ = UserNotificationPreference.objects.get_or_create(
            user=request.user,
            defaults={'reminder_days_before': [30, 14, 7, 3, 1]}
        )
        serializer = UserNotificationPreferenceSerializer(pref)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        pref, _ = UserNotificationPreference.objects.get_or_create(
            user=request.user,
            defaults={'reminder_days_before': [30, 14, 7, 3, 1]}
        )
        serializer = UserNotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmailDeliveryHistoryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EmailDeliveryLogSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Return email logs specifically addressed to current authenticated user
        return EmailDeliveryLog.objects.filter(
            Q(user=self.request.user) | Q(recipient_email=self.request.user.email)
        ).order_by('-created_at')

class SendTestEmailView(views.APIView):
    permission_classes = [IsScholarSetuAdmin]

    def post(self, request):
        user = request.user
        target_email = request.data.get('email', '').strip()
        recipient = target_email if target_email else user.email
        try:
            log = EmailService.send_test_email(user, recipient_email=recipient)
            return Response({
                'message': f"Test email dispatched to {recipient}.",
                'recipient': recipient,
                'delivery_status': log.status,
                'log_id': log.id,
                'sent_at': log.sent_at,
                'error_message': log.error_message
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Test email failed for {recipient}: {e}")
            return Response({'error': f"Failed to send test email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PublicUnsubscribeView(views.APIView):
    """
    Public, secure unsubscribe endpoint using opaque token (secrets.token_urlsafe).
    Complies with anti-spam standards and supports safe repeated requests.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = request.query_params.get('token', '').strip()
        if not token:
            return Response({'error': 'Unsubscribe token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        pref = UserNotificationPreference.objects.filter(unsubscribe_token=token).select_related('user').first()
        if not pref:
            return Response({'error': 'Invalid or expired unsubscribe link.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'valid': True,
            'email': pref.user.email,
            'email_notifications_enabled': pref.email_notifications_enabled,
            'unsubscribed_at': pref.unsubscribed_at
        }, status=status.HTTP_200_OK)

    def post(self, request):
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'error': 'Unsubscribe token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        pref = UserNotificationPreference.objects.filter(unsubscribe_token=token).select_related('user').first()
        if not pref:
            return Response({'error': 'Invalid or expired unsubscribe link.'}, status=status.HTTP_404_NOT_FOUND)

        unsubscribe_all = request.data.get('all', True)
        if unsubscribe_all:
            pref.email_notifications_enabled = False
            pref.unsubscribed_at = timezone.now()
            pref.save(update_fields=['email_notifications_enabled', 'unsubscribed_at'])
            return Response({
                'message': f"You have been successfully unsubscribed from ScholarSetu AI notifications ({pref.user.email}).",
                'email_notifications_enabled': False
            }, status=status.HTTP_200_OK)
        else:
            # Granular updates from unsubscribe page
            serializer = UserNotificationPreferenceSerializer(pref, data=request.data.get('preferences', {}), partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# =============================================================================
# Per-Opportunity Subscription Endpoints
# =============================================================================

class OpportunitySubscriptionSettingsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        try:
            opp = Opportunity.objects.get(id=id)
        except Opportunity.DoesNotExist:
            return Response({'error': 'Opportunity not found.'}, status=status.HTTP_404_NOT_FOUND)

        sub = OpportunitySubscription.objects.filter(user=request.user, opportunity=opp).first()
        is_saved = request.user.saved_opportunities.filter(opportunity=opp).exists()
        is_tracked = request.user.tracked_applications.filter(opportunity=opp).exists()

        return Response({
            'opportunity_id': opp.id,
            'opportunity_title': opp.title,
            'is_subscribed': sub is not None,
            'notify_deadline': sub.notify_deadline if sub else True,
            'notify_changes': sub.notify_changes if sub else True,
            'is_saved': is_saved,
            'is_tracked': is_tracked,
        }, status=status.HTTP_200_OK)

    def post(self, request, id):
        try:
            opp = Opportunity.objects.get(id=id)
        except Opportunity.DoesNotExist:
            return Response({'error': 'Opportunity not found.'}, status=status.HTTP_404_NOT_FOUND)

        notify_deadline = request.data.get('notify_deadline', True)
        notify_changes = request.data.get('notify_changes', True)

        sub, created = OpportunitySubscription.objects.update_or_create(
            user=request.user,
            opportunity=opp,
            defaults={
                'notify_deadline': notify_deadline,
                'notify_changes': notify_changes
            }
        )

        return Response({
            'message': f"Successfully subscribed to updates for {opp.title}.",
            'subscription': OpportunitySubscriptionSerializer(sub).data
        }, status=status.HTTP_200_OK)

    def delete(self, request, id):
        try:
            opp = Opportunity.objects.get(id=id)
        except Opportunity.DoesNotExist:
            return Response({'error': 'Opportunity not found.'}, status=status.HTTP_404_NOT_FOUND)

        deleted, _ = OpportunitySubscription.objects.filter(user=request.user, opportunity=opp).delete()
        return Response({
            'message': f"Unsubscribed from updates for {opp.title}.",
            'removed': deleted > 0
        }, status=status.HTTP_200_OK)

# =============================================================================
# Admin Notification Monitoring & Control Views
# =============================================================================

class AdminNotificationStatsView(views.APIView):
    permission_classes = [IsScholarSetuAdmin]

    def get(self, request):
        now = timezone.now()
        last_24h = now - timedelta(hours=24)

        # Totals by status
        status_counts = dict(
            EmailDeliveryLog.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )

        # Recent 24h metrics
        sent_24h = EmailDeliveryLog.objects.filter(
            status__in=[EmailDeliveryStatus.SENT, EmailDeliveryStatus.DELIVERED, EmailDeliveryStatus.ACCEPTED],
            sent_at__gte=last_24h
        ).count()

        pending_count = EmailDeliveryLog.objects.filter(status=EmailDeliveryStatus.QUEUED).count()
        retry_count = EmailDeliveryLog.objects.filter(status=EmailDeliveryStatus.RETRYING).count()
        failed_count = EmailDeliveryLog.objects.filter(status=EmailDeliveryStatus.FAILED).count()
        bounced_count = EmailDeliveryLog.objects.filter(status=EmailDeliveryStatus.BOUNCED).count()

        # Opted out users count
        opted_out_count = UserNotificationPreference.objects.filter(email_notifications_enabled=False).count()
        total_subscribers = UserNotificationPreference.objects.filter(email_notifications_enabled=True).count()

        # Breakdown by notification type
        type_breakdown = list(
            EmailDeliveryLog.objects.values('notification_type').annotate(count=Count('id')).order_by('-count')[:10]
        )

        # Upcoming reminder jobs count (opportunities closing within 30 days)
        today = timezone.localtime(now).date()
        upcoming_reminders_count = Opportunity.objects.filter(
            application_closing_date__gte=today,
            application_closing_date__lte=today + timedelta(days=30),
            application_status=Opportunity.ApplicationStatus.OPEN if hasattr(Opportunity, 'ApplicationStatus') else 'OPEN'
        ).count()

        return Response({
            'totals': {
                'total_logged': EmailDeliveryLog.objects.count(),
                'sent_24h': sent_24h,
                'pending': pending_count,
                'retrying': retry_count,
                'failed': failed_count,
                'bounced': bounced_count,
                'opted_out_users': opted_out_count,
                'active_subscribers': total_subscribers,
                'upcoming_30d_deadlines': upcoming_reminders_count,
            },
            'status_breakdown': status_counts,
            'type_breakdown': type_breakdown,
            'scheduler': {
                'timezone': settings.TIME_ZONE,
                'active_periodic_tasks': [
                    'scan-upcoming-deadlines-daily (06:00 IST)',
                    'send-tracker-reminders-daily (07:00 IST)',
                    'process-opportunity-changes (Every 15 min)',
                    'send-weekly-opportunity-digest (Monday 08:00 IST)',
                    'process-email-retries (Every 5 min)',
                    'cleanup-expired-notification-data (Weekly Sunday)'
                ]
            }
        }, status=status.HTTP_200_OK)

class AdminDeliveryLogsView(generics.ListAPIView):
    permission_classes = [IsScholarSetuAdmin]
    serializer_class = EmailDeliveryLogSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = EmailDeliveryLog.objects.all().order_by('-created_at')
        status_param = self.request.query_params.get('status')
        type_param = self.request.query_params.get('type')
        search_param = self.request.query_params.get('search')

        if status_param:
            qs = qs.filter(status=status_param)
        if type_param:
            qs = qs.filter(notification_type=type_param)
        if search_param:
            qs = qs.filter(
                Q(recipient_email__icontains=search_param) |
                Q(subject__icontains=search_param) |
                Q(idempotency_key__icontains=search_param)
            )
        return qs

class AdminRetryEmailView(views.APIView):
    permission_classes = [IsScholarSetuAdmin]

    def post(self, request, log_id):
        try:
            log = EmailDeliveryLog.objects.get(id=log_id)
        except EmailDeliveryLog.DoesNotExist:
            return Response({'error': 'Delivery log not found.'}, status=status.HTTP_404_NOT_FOUND)

        if log.status not in [EmailDeliveryStatus.FAILED, EmailDeliveryStatus.RETRYING]:
            return Response({
                'error': f'Log {log_id} has status {log.status} and cannot be manually retried.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Trigger immediate re-send
        retried_log = EmailService.send_email_message(
            recipient_email=log.recipient_email,
            subject=log.subject,
            html_content=log.metadata.get('html_content', f"<p>{log.subject}</p>"),
            text_content=log.metadata.get('text_content', log.subject),
            notification_type=log.notification_type,
            user=log.user,
            opportunity=log.related_opportunity,
            idempotency_key=None,  # Bypass old idempotency lock for forced manual retry
            deadline_version=log.deadline_version
        )

        return Response({
            'message': f"Retry attempted for log {log_id}.",
            'status': retried_log.status,
            'sent_at': retried_log.sent_at,
            'error_message': retried_log.error_message
        }, status=status.HTTP_200_OK)

class AdminTemplatePreviewView(views.APIView):
    permission_classes = [IsScholarSetuAdmin]

    def get(self, request, template_type):
        opp = Opportunity.objects.first()
        user = request.user
        pref = getattr(user, 'notification_preferences', None)
        urls = EmailService.build_preference_urls(pref)

        context = {
            'opportunity': opp,
            'opportunity_category': 'Scholarship',
            'is_eligibility_match': True,
            'match_explanation': 'Matched criteria: Karnataka resident, Undergraduate Engineering, Annual family income under Rs 2,50,000.',
            'days_remaining': 7,
            'remaining_time_text': '7 Days Remaining',
            'old_deadline': '2026-11-15',
            'new_deadline': '2026-11-30',
            'change_summary': 'Income ceiling relaxed to Rs 3,50,000 per annum and Caste certificate format updated.',
            'verification_url': f"{urls['portal_url']}/notifications?verify_token=demo-token",
            'reset_url': f"{urls['portal_url']}/notifications?reset_token=demo-token",
            'recipient_email': user.email,
            'opportunity_url': f"{urls['portal_url']}/scholarships?id={opp.id if opp else 1}",
            'timestamp': timezone.now().strftime('%d %b %Y, %I:%M %p IST'),
            'reminder_intervals': [30, 14, 7, 3, 1],
            **urls
        }

        template_map = {
            NotificationType.NEW_SCHOLARSHIP: 'new_opportunity',
            NotificationType.NEW_SCHEME: 'new_opportunity',
            NotificationType.NEW_MATCHING_OPPORTUNITY: 'new_opportunity',
            NotificationType.DEADLINE_APPROACHING: 'deadline_reminder',
            NotificationType.DEADLINE_EXTENDED: 'deadline_extended',
            NotificationType.REQUIREMENTS_CHANGED: 'opportunity_changed',
            NotificationType.OPPORTUNITY_CLOSED_OR_EXPIRED: 'opportunity_closed',
            NotificationType.TRACKER_REMINDER: 'tracker_reminder',
            NotificationType.RENEWAL_REMINDER: 'renewal_reminder',
            NotificationType.WEEKLY_DIGEST: 'weekly_digest',
            NotificationType.EMAIL_VERIFICATION: 'email_verification',
            NotificationType.PASSWORD_RESET: 'password_reset',
            NotificationType.TEST_EMAIL: 'test_email',
        }

        template_name = template_map.get(template_type, 'new_opportunity')
        html, text = EmailService.render_content(template_name, context, template_type)

        return Response({
            'template_type': template_type,
            'html': html,
            'text': text
        }, status=status.HTTP_200_OK)
