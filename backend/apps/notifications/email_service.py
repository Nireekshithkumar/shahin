import logging
import smtplib
import socket
from datetime import timedelta
from typing import Optional, Dict, Any, List

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

from apps.notifications.models import (
    Notification,
    UserNotificationPreference,
    EmailDeliveryLog,
    NotificationType,
    EmailDeliveryStatus,
    EmailTemplate,
)
from apps.opportunities.models import Opportunity

logger = logging.getLogger('notifications')

class EmailService:
    """
    Production-ready email service for ScholarSetu AI.
    Handles rendering, delivery logs, idempotency, rate limiting, and provider error classification.
    """

    @classmethod
    def get_frontend_url(cls) -> str:
        return getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')

    @classmethod
    def get_backend_url(cls) -> str:
        return getattr(settings, 'BACKEND_URL', 'http://localhost:8000').rstrip('/')

    @classmethod
    def build_preference_urls(cls, pref: Optional[UserNotificationPreference]) -> Dict[str, str]:
        frontend = cls.get_frontend_url()
        backend = cls.get_backend_url()
        token = pref.unsubscribe_token if pref else ''
        return {
            'portal_url': frontend,
            'preferences_url': f"{frontend}/notifications?tab=preferences",
            'unsubscribe_url': f"{frontend}/notifications?unsubscribe_token={token}" if token else f"{frontend}/notifications",
            'direct_api_unsubscribe_url': f"{backend}/api/notifications/unsubscribe/?token={token}" if token else '',
        }

    @classmethod
    def check_rate_limit(cls, user, pref: Optional[UserNotificationPreference], notification_type: str) -> bool:
        """
        Enforce daily sending limits for non-security emails.
        Security messages (Email verification, Password reset) bypass rate limits.
        """
        bypass_types = [
            NotificationType.EMAIL_VERIFICATION,
            NotificationType.PASSWORD_RESET,
            NotificationType.TEST_EMAIL,
        ]
        if notification_type in bypass_types:
            return True

        if not pref:
            return True

        max_daily = pref.max_emails_per_day or 5
        since = timezone.now() - timedelta(hours=24)
        sent_count = EmailDeliveryLog.objects.filter(
            recipient_email=user.email,
            status__in=[EmailDeliveryStatus.SENT, EmailDeliveryStatus.DELIVERED, EmailDeliveryStatus.ACCEPTED],
            sent_at__gte=since
        ).count()

        if sent_count >= max_daily:
            logger.warning(f"Rate limit exceeded for user {user.email}: {sent_count}/{max_daily} emails in last 24h.")
            return False

        return True

    @classmethod
    def render_content(
        cls,
        template_name: str,
        context: Dict[str, Any],
        notification_type: Optional[str] = None
    ) -> tuple[str, str]:
        """
        Renders HTML and plain-text email bodies.
        Checks for active database EmailTemplate override first, falls back to filesystem template.
        """
        html_body = ""
        text_body = ""

        # Check for DB override template
        if notification_type:
            db_template = EmailTemplate.objects.filter(
                template_type=notification_type,
                is_active=True
            ).first()
            if db_template and db_template.html_template:
                from django.template import Template, Context
                t = Template(db_template.html_template)
                html_body = t.render(Context(context))
                if db_template.text_template:
                    t_text = Template(db_template.text_template)
                    text_body = t_text.render(Context(context))

        if not html_body:
            html_body = render_to_string(f"emails/{template_name}.html", context)

        if not text_body:
            try:
                text_body = render_to_string(f"emails/{template_name}.txt", context)
            except Exception:
                text_body = strip_tags(html_body)

        return html_body, text_body

    @classmethod
    def send_email_message(
        cls,
        recipient_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        notification_type: str,
        user=None,
        opportunity=None,
        idempotency_key: Optional[str] = None,
        deadline_version: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EmailDeliveryLog:
        """
        Core low-level send method.
        Records delivery log, guarantees idempotency, classifies errors, and returns the log instance.
        """
        # Idempotency check: if key already processed, suppress duplicate
        if idempotency_key:
            existing_log = EmailDeliveryLog.objects.filter(idempotency_key=idempotency_key).first()
            if existing_log and existing_log.status in [
                EmailDeliveryStatus.SENT,
                EmailDeliveryStatus.DELIVERED,
                EmailDeliveryStatus.ACCEPTED,
                EmailDeliveryStatus.QUEUED
            ]:
                logger.info(f"Duplicate suppressed for idempotency_key: {idempotency_key}")
                return existing_log

        # Create or update log entry
        log, _ = EmailDeliveryLog.objects.get_or_create(
            idempotency_key=idempotency_key,
            defaults={
                'recipient_email': recipient_email,
                'user': user,
                'subject': subject,
                'notification_type': notification_type,
                'related_opportunity': opportunity,
                'status': EmailDeliveryStatus.QUEUED,
                'deadline_version': deadline_version,
                'metadata': metadata or {},
            }
        )

        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'ScholarSetu AI <noreply@scholarsetu.gov.in>')
        timeout = getattr(settings, 'EMAIL_TIMEOUT', 15)

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[recipient_email],
        )
        msg.attach_alternative(html_content, "text/html")

        try:
            # Send message through configured backend
            msg.send(fail_silently=False)
            log.status = EmailDeliveryStatus.SENT
            log.sent_at = timezone.now()
            log.error_message = ""
            log.error_category = ""
            log.save()
            logger.info(f"Successfully sent {notification_type} to {recipient_email} (log_id={log.id})")
        except smtplib.SMTPAuthenticationError as e:
            log.status = EmailDeliveryStatus.FAILED
            log.error_category = "SMTP_AUTH"
            log.error_message = f"SMTP Authentication failed: {str(e)}"
            log.save()
            logger.error(f"Permanent SMTP Auth error delivering to {recipient_email}: {str(e)}")
        except (smtplib.SMTPSenderRefused, smtplib.SMTPRecipientsRefused) as e:
            log.status = EmailDeliveryStatus.FAILED
            log.error_category = "RECIPIENT_REFUSED"
            log.error_message = f"Recipient or sender address rejected: {str(e)}"
            log.save()
            logger.error(f"Permanent recipient error delivering to {recipient_email}: {str(e)}")
        except (socket.timeout, TimeoutError) as e:
            log.retry_count += 1
            log.error_category = "TIMEOUT"
            log.error_message = f"Connection timed out: {str(e)}"
            log.status = EmailDeliveryStatus.RETRYING if log.retry_count < log.max_retries else EmailDeliveryStatus.FAILED
            log.save()
            logger.warning(f"Timeout sending email to {recipient_email}: {str(e)} (retry {log.retry_count}/{log.max_retries})")
        except (ConnectionRefusedError, smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError) as e:
            log.retry_count += 1
            log.error_category = "CONNECTION_ERROR"
            log.error_message = f"Connection error: {str(e)}"
            log.status = EmailDeliveryStatus.RETRYING if log.retry_count < log.max_retries else EmailDeliveryStatus.FAILED
            log.save()
            logger.warning(f"Transient connection error for {recipient_email}: {str(e)} (retry {log.retry_count}/{log.max_retries})")
        except Exception as e:
            log.retry_count += 1
            log.error_category = "GENERAL"
            log.error_message = f"Delivery failed: {str(e)}"
            log.status = EmailDeliveryStatus.RETRYING if log.retry_count < log.max_retries else EmailDeliveryStatus.FAILED
            log.save()
            logger.error(f"Unexpected error sending email to {recipient_email}: {str(e)}")

        return log

    # =========================================================================
    # High-level Typed Dispatchers with In-App Notification Mirroring
    # =========================================================================

    @classmethod
    def send_new_opportunity_alert(
        cls,
        user,
        opportunity: Opportunity,
        match_explanation: Optional[str] = None,
        is_eligibility_match: bool = False
    ) -> Optional[EmailDeliveryLog]:
        """
        Sends an alert for a newly published or matching opportunity.
        """
        pref = getattr(user, 'notification_preferences', None)
        if pref and not pref.email_notifications_enabled:
            return None
        if not user.is_email_verified:
            logger.info(f"Skipping alert for unverified email: {user.email}")
            return None

        opp_type_label = opportunity.get_opportunity_type_display() or "Opportunity"
        is_scheme = opportunity.opportunity_type not in ['SCHOLARSHIP', 'FELLOWSHIP', 'STIPEND']

        if pref:
            if is_scheme and not pref.new_schemes_enabled:
                return None
            if not is_scheme and not pref.new_scholarships_enabled:
                return None
            if is_eligibility_match and not pref.personalized_matches_enabled:
                return None

        notif_type = NotificationType.NEW_MATCHING_OPPORTUNITY if is_eligibility_match else (
            NotificationType.NEW_SCHEME if is_scheme else NotificationType.NEW_SCHOLARSHIP
        )

        if not cls.check_rate_limit(user, pref, notif_type):
            return None

        idempotency_key = f"new_opp:{user.id}:{opportunity.id}:{notif_type}"
        urls = cls.build_preference_urls(pref)
        opp_url = f"{urls['portal_url']}/scholarships?id={opportunity.id}"

        subject = f"[ScholarSetu AI] {'Verified Match: ' if is_eligibility_match else 'New '}{opp_type_label}: {opportunity.title}"

        context = {
            'opportunity': opportunity,
            'opportunity_category': opp_type_label,
            'is_eligibility_match': is_eligibility_match,
            'match_explanation': match_explanation,
            'last_verified_date': str(opportunity.last_verified_date.date()) if opportunity.last_verified_date else "Recently Verified",
            'opportunity_url': opp_url,
            'recipient_email': user.email,
            **urls
        }

        html, text = cls.render_content("new_opportunity", context, notif_type)

        # Mirror in-app notification
        Notification.objects.create(
            user=user,
            notification_type=notif_type,
            title=f"{'Profile Match: ' if is_eligibility_match else 'New '}{opportunity.title}",
            message=match_explanation or opportunity.short_description or f"New {opp_type_label} published by {opportunity.provider}.",
            related_opportunity=opportunity,
            action_url=f"/scholarships?id={opportunity.id}"
        )

        return cls.send_email_message(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=notif_type,
            user=user,
            opportunity=opportunity,
            idempotency_key=idempotency_key,
        )

    @classmethod
    def send_deadline_reminder(
        cls,
        user,
        opportunity: Opportunity,
        days_remaining: int,
        tracker=None
    ) -> Optional[EmailDeliveryLog]:
        """
        Sends an upcoming deadline alert for an opportunity (e.g. 30, 14, 7, 3, 1, 0 days remaining).
        """
        pref = getattr(user, 'notification_preferences', None)
        if pref and not pref.email_notifications_enabled:
            return None
        if pref and not pref.deadline_reminders_enabled:
            return None
        if not user.is_email_verified:
            return None

        # Re-check active status right before sending
        if opportunity.application_status in ['CLOSED', 'EXPIRED', 'ARCHIVED']:
            logger.info(f"Skipping deadline reminder for closed opportunity: {opportunity.id}")
            return None

        deadline_str = str(opportunity.application_closing_date)
        idempotency_key = f"deadline:{user.id}:{opportunity.id}:{deadline_str}:{days_remaining}"

        if not cls.check_rate_limit(user, pref, NotificationType.DEADLINE_APPROACHING):
            return None

        urls = cls.build_preference_urls(pref)
        opp_url = f"{urls['portal_url']}/scholarships?id={opportunity.id}"
        tracker_url = f"{urls['portal_url']}/tracker"

        if days_remaining == 0:
            remaining_text = "Today is the Last Day"
            urgent_prefix = "[URGENT TODAY] "
        elif days_remaining == 1:
            remaining_text = "1 Day Remaining (Closing Tomorrow)"
            urgent_prefix = "[CLOSING TOMORROW] "
        else:
            remaining_text = f"{days_remaining} Days Remaining"
            urgent_prefix = f"[{days_remaining} Days Left] "

        subject = f"{urgent_prefix}Deadline Approaching: {opportunity.title}"

        tracker_status = tracker.get_status_display() if tracker else None
        is_saved_only = tracker is None

        context = {
            'opportunity': opportunity,
            'days_remaining': days_remaining,
            'remaining_time_text': remaining_text,
            'tracker_status': tracker_status,
            'is_saved_only': is_saved_only,
            'opportunity_url': opp_url,
            'tracker_url': tracker_url,
            'recipient_email': user.email,
            **urls
        }

        html, text = cls.render_content("deadline_reminder", context, NotificationType.DEADLINE_APPROACHING)

        Notification.objects.create(
            user=user,
            notification_type=NotificationType.DEADLINE_APPROACHING,
            title=f"Deadline Approaching: {opportunity.title} ({remaining_text})",
            message=f"Application window closes on {opportunity.application_closing_date}. Verify required documents and submit.",
            related_opportunity=opportunity,
            action_url=f"/scholarships?id={opportunity.id}"
        )

        return cls.send_email_message(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=NotificationType.DEADLINE_APPROACHING,
            user=user,
            opportunity=opportunity,
            idempotency_key=idempotency_key,
            deadline_version=f"{deadline_str}-interval-{days_remaining}"
        )

    @classmethod
    def send_deadline_extended_alert(
        cls,
        user,
        opportunity: Opportunity,
        old_deadline: str,
        new_deadline: str
    ) -> Optional[EmailDeliveryLog]:
        """
        Sends an alert when an official deadline has been extended.
        """
        pref = getattr(user, 'notification_preferences', None)
        if pref and not pref.email_notifications_enabled:
            return None
        if pref and not pref.deadline_extension_alerts_enabled:
            return None
        if not user.is_email_verified:
            return None

        idempotency_key = f"extended:{user.id}:{opportunity.id}:{new_deadline}"
        urls = cls.build_preference_urls(pref)
        opp_url = f"{urls['portal_url']}/scholarships?id={opportunity.id}"

        subject = f"[DEADLINE EXTENDED] {opportunity.title} (New Date: {new_deadline})"

        context = {
            'opportunity': opportunity,
            'old_deadline': old_deadline,
            'new_deadline': new_deadline,
            'opportunity_url': opp_url,
            'recipient_email': user.email,
            **urls
        }

        html, text = cls.render_content("deadline_extended", context, NotificationType.DEADLINE_EXTENDED)

        Notification.objects.create(
            user=user,
            notification_type=NotificationType.DEADLINE_EXTENDED,
            title=f"Deadline Extended: {opportunity.title}",
            message=f"Official deadline extended from {old_deadline} to {new_deadline}.",
            related_opportunity=opportunity,
            action_url=f"/scholarships?id={opportunity.id}"
        )

        return cls.send_email_message(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=NotificationType.DEADLINE_EXTENDED,
            user=user,
            opportunity=opportunity,
            idempotency_key=idempotency_key,
            deadline_version=f"extended-{new_deadline}"
        )

    @classmethod
    def send_opportunity_changes_alert(
        cls,
        user,
        opportunity: Opportunity,
        change_summary: str
    ) -> Optional[EmailDeliveryLog]:
        """
        Sends an alert when requirements, benefits, or documents for an opportunity have changed.
        """
        pref = getattr(user, 'notification_preferences', None)
        if pref and not pref.email_notifications_enabled:
            return None
        if pref and not pref.changes_alerts_enabled:
            return None
        if not user.is_email_verified:
            return None

        idempotency_key = f"changes:{user.id}:{opportunity.id}:{opportunity.updated_at.strftime('%Y%m%d%H%M')}"
        urls = cls.build_preference_urls(pref)
        opp_url = f"{urls['portal_url']}/scholarships?id={opportunity.id}"

        subject = f"[Criteria Update] Important Changes to {opportunity.title}"

        context = {
            'opportunity': opportunity,
            'change_summary': change_summary,
            'opportunity_url': opp_url,
            'recipient_email': user.email,
            **urls
        }

        html, text = cls.render_content("opportunity_changed", context, NotificationType.REQUIREMENTS_CHANGED)

        Notification.objects.create(
            user=user,
            notification_type=NotificationType.REQUIREMENTS_CHANGED,
            title=f"Criteria Update: {opportunity.title}",
            message=change_summary,
            related_opportunity=opportunity,
            action_url=f"/scholarships?id={opportunity.id}"
        )

        return cls.send_email_message(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=NotificationType.REQUIREMENTS_CHANGED,
            user=user,
            opportunity=opportunity,
            idempotency_key=idempotency_key
        )

    @classmethod
    def send_opportunity_closed_alert(
        cls,
        user,
        opportunity: Opportunity,
        status_reason: str = ""
    ) -> Optional[EmailDeliveryLog]:
        """
        Sends an alert when a saved/subscribed opportunity has been marked closed, expired, or discontinued.
        """
        pref = getattr(user, 'notification_preferences', None)
        if pref and not pref.email_notifications_enabled:
            return None
        if not user.is_email_verified:
            return None

        idempotency_key = f"closed:{user.id}:{opportunity.id}"
        urls = cls.build_preference_urls(pref)

        subject = f"[Closed] Applications Concluded: {opportunity.title}"

        context = {
            'opportunity': opportunity,
            'status_reason': status_reason,
            'recommendations_url': f"{urls['portal_url']}/scholarships",
            'recipient_email': user.email,
            **urls
        }

        html, text = cls.render_content("opportunity_closed", context, NotificationType.OPPORTUNITY_CLOSED_OR_EXPIRED)

        Notification.objects.create(
            user=user,
            notification_type=NotificationType.OPPORTUNITY_CLOSED_OR_EXPIRED,
            title=f"Closed: {opportunity.title}",
            message=status_reason or "Applications have closed for this opportunity.",
            related_opportunity=opportunity,
            action_url=f"/scholarships?id={opportunity.id}"
        )

        return cls.send_email_message(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=NotificationType.OPPORTUNITY_CLOSED_OR_EXPIRED,
            user=user,
            opportunity=opportunity,
            idempotency_key=idempotency_key
        )

    @classmethod
    def send_tracker_reminder(
        cls,
        user,
        tracker,
        reminder_message: str
    ) -> Optional[EmailDeliveryLog]:
        """
        Sends a follow-up reminder for a tracked application with pending documents or upcoming deadline.
        """
        pref = getattr(user, 'notification_preferences', None)
        if pref and not pref.email_notifications_enabled:
            return None
        if pref and not pref.application_tracker_reminders_enabled:
            return None
        if not user.is_email_verified:
            return None

        opp = tracker.opportunity
        idempotency_key = f"tracker:{user.id}:{tracker.id}:{timezone.now().strftime('%Y%m%d')}"
        urls = cls.build_preference_urls(pref)

        subject = f"[Action Required] Application Tracker Milestone: {opp.title}"

        context = {
            'opportunity': opp,
            'tracker': tracker,
            'reminder_message': reminder_message,
            'tracker_url': f"{urls['portal_url']}/tracker",
            'recipient_email': user.email,
            **urls
        }

        html, text = cls.render_content("tracker_reminder", context, NotificationType.TRACKER_REMINDER)

        Notification.objects.create(
            user=user,
            notification_type=NotificationType.TRACKER_REMINDER,
            title=f"Tracker Reminder: {opp.title}",
            message=reminder_message,
            related_opportunity=opp,
            action_url="/tracker"
        )

        return cls.send_email_message(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=NotificationType.TRACKER_REMINDER,
            user=user,
            opportunity=opp,
            idempotency_key=idempotency_key
        )

    @classmethod
    def send_renewal_reminder(
        cls,
        user,
        opportunity: Opportunity
    ) -> Optional[EmailDeliveryLog]:
        """
        Sends an annual/semester renewal reminder for recurring scholarships.
        """
        pref = getattr(user, 'notification_preferences', None)
        if pref and not pref.email_notifications_enabled:
            return None
        if pref and not pref.renewal_reminders_enabled:
            return None
        if not user.is_email_verified:
            return None

        idempotency_key = f"renewal:{user.id}:{opportunity.id}:{timezone.now().year}"
        urls = cls.build_preference_urls(pref)

        subject = f"[Renewal Reminder] Reapply for Continuing Grant: {opportunity.title}"

        context = {
            'opportunity': opportunity,
            'opportunity_url': f"{urls['portal_url']}/scholarships?id={opportunity.id}",
            'tracker_url': f"{urls['portal_url']}/tracker",
            'recipient_email': user.email,
            **urls
        }

        html, text = cls.render_content("renewal_reminder", context, NotificationType.RENEWAL_REMINDER)

        Notification.objects.create(
            user=user,
            notification_type=NotificationType.RENEWAL_REMINDER,
            title=f"Renewal Due: {opportunity.title}",
            message="Time to submit previous academic marks and bonafide certificates for continuing grant renewal.",
            related_opportunity=opportunity,
            action_url=f"/scholarships?id={opportunity.id}"
        )

        return cls.send_email_message(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=NotificationType.RENEWAL_REMINDER,
            user=user,
            opportunity=opportunity,
            idempotency_key=idempotency_key
        )

    @classmethod
    def send_weekly_digest(
        cls,
        user,
        matches: List[Dict[str, Any]],
        closing_soon: List[Opportunity]
    ) -> Optional[EmailDeliveryLog]:
        """
        Sends a personalized weekly opportunity digest.
        """
        pref = getattr(user, 'notification_preferences', None)
        if pref and not pref.email_notifications_enabled:
            return None
        if pref and not pref.weekly_digest_enabled:
            return None
        if not user.is_email_verified:
            return None

        # Check if user had a digest in last 6 days
        if pref and pref.last_digest_sent:
            if timezone.now() - pref.last_digest_sent < timedelta(days=6):
                return None

        year, week_num, _ = timezone.now().isocalendar()
        idempotency_key = f"digest:{user.id}:{year}-W{week_num}"
        urls = cls.build_preference_urls(pref)

        subject = f"[Weekly Digest] Your Top Scholarship Matches & Approaching Deadlines"

        context = {
            'matches': matches[:5],
            'closing_soon': closing_soon[:5],
            'recipient_email': user.email,
            **urls
        }

        html, text = cls.render_content("weekly_digest", context, NotificationType.WEEKLY_DIGEST)

        Notification.objects.create(
            user=user,
            notification_type=NotificationType.WEEKLY_DIGEST,
            title="Weekly Opportunity Digest",
            message=f"We found {len(matches)} matching schemes and {len(closing_soon)} closing deadlines this week.",
            action_url="/notifications"
        )

        log = cls.send_email_message(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=NotificationType.WEEKLY_DIGEST,
            user=user,
            idempotency_key=idempotency_key
        )

        if pref:
            pref.last_digest_sent = timezone.now()
            pref.save(update_fields=['last_digest_sent'])

        return log

    @classmethod
    def send_verification_email(cls, user, verification_url: str) -> EmailDeliveryLog:
        """
        Sends an email verification link to confirm account ownership.
        """
        urls = cls.build_preference_urls(getattr(user, 'notification_preferences', None))
        subject = "Verify Your Email Address - ScholarSetu AI"

        context = {
            'verification_url': verification_url,
            'recipient_email': user.email,
            **urls
        }

        html, text = cls.render_content("email_verification", context, NotificationType.EMAIL_VERIFICATION)

        return cls.send_email_message(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=NotificationType.EMAIL_VERIFICATION,
            user=user,
        )

    @classmethod
    def send_password_reset_email(cls, user, reset_url: str) -> EmailDeliveryLog:
        """
        Sends a secure password reset link.
        """
        urls = cls.build_preference_urls(getattr(user, 'notification_preferences', None))
        subject = "Reset Your ScholarSetu AI Password"

        context = {
            'reset_url': reset_url,
            'recipient_email': user.email,
            **urls
        }

        html, text = cls.render_content("password_reset", context, NotificationType.PASSWORD_RESET)

        return cls.send_email_message(
            recipient_email=user.email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=NotificationType.PASSWORD_RESET,
            user=user,
        )

    @classmethod
    def send_test_email(cls, user, recipient_email: Optional[str] = None) -> EmailDeliveryLog:
        """
        Sends a diagnostic test email to verify user preferences and SMTP delivery.
        """
        pref = getattr(user, 'notification_preferences', None)
        urls = cls.build_preference_urls(pref)
        subject = "[Test Send] ScholarSetu AI Notification Channel Active"
        target_email = recipient_email.strip() if recipient_email and recipient_email.strip() else user.email

        context = {
            'timestamp': timezone.now().strftime('%d %b %Y, %I:%M %p %Z'),
            'recipient_email': target_email,
            'preferred_language': pref.preferred_language if pref else 'en',
            'reminder_intervals': pref.reminder_days_before if pref else [30, 14, 7, 3, 1],
            'preferred_timezone': pref.preferred_timezone if pref else 'Asia/Kolkata',
            **urls
        }

        html, text = cls.render_content("test_email", context, NotificationType.TEST_EMAIL)

        return cls.send_email_message(
            recipient_email=target_email,
            subject=subject,
            html_content=html,
            text_content=text,
            notification_type=NotificationType.TEST_EMAIL,
            user=user,
        )

