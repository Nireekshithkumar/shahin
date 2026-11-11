import logging
from datetime import timedelta
from django.conf import settings
from django.db import models
from django.utils import timezone
from celery import shared_task

from apps.accounts.models import User
from apps.opportunities.models import Opportunity, ApplicationStatus
from apps.applications.models import SavedOpportunity, ApplicationTracker
from apps.eligibility.engine import EligibilityEngine
from apps.eligibility.models import EligibilityResultStatus
from apps.notifications.models import (
    Notification,
    UserNotificationPreference,
    EmailDeliveryLog,
    EmailDeliveryStatus,
    OpportunitySubscription,
    OpportunityChangeEvent,
    NotificationType,
)
from apps.notifications.email_service import EmailService

logger = logging.getLogger('notifications')

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_queued_email_task(self, log_id: int):
    """
    Worker task to process a single queued EmailDeliveryLog from the transactional outbox.
    """
    try:
        log = EmailDeliveryLog.objects.select_related('user', 'related_opportunity').get(id=log_id)
        if log.status in [EmailDeliveryStatus.SENT, EmailDeliveryStatus.DELIVERED, EmailDeliveryStatus.ACCEPTED]:
            return f"Log {log_id} already sent."

        # Fetch rendered HTML & text from metadata or re-render
        html_content = log.metadata.get('html_content', '')
        text_content = log.metadata.get('text_content', '')

        if not html_content:
            return f"Log {log_id} missing content in metadata."

        EmailService.send_email_message(
            recipient_email=log.recipient_email,
            subject=log.subject,
            html_content=html_content,
            text_content=text_content,
            notification_type=log.notification_type,
            user=log.user,
            opportunity=log.related_opportunity,
            idempotency_key=log.idempotency_key,
            deadline_version=log.deadline_version
        )
        return f"Processed queued email log {log_id}"
    except EmailDeliveryLog.DoesNotExist:
        logger.error(f"Queued email log {log_id} not found.")
        return "Log not found."
    except Exception as exc:
        logger.error(f"Error executing send_queued_email_task for log {log_id}: {exc}")
        raise self.retry(exc=exc)

@shared_task
def scan_upcoming_deadlines_task():
    """
    Periodic task running daily (at 06:00 IST).
    Calculates approaching deadlines for all configured intervals:
    [30, 14, 7, 3, 1, 0 (Deadline Day)].
    
    Documented Date Interpretation:
    Indian scholarship deadlines (Asia/Kolkata) are date-only and expire at 23:59:59 IST on that date.
    At 06:00 IST on date D, interval N targets opportunities closing on D + N days.
    N = 0 targets opportunities closing TODAY.
    """
    now = timezone.localtime(timezone.now())
    today = now.date()
    intervals = [30, 14, 7, 3, 1, 0]

    logger.info(f"Scanning upcoming deadlines on {today} for intervals {intervals}...")
    total_reminders_queued = 0

    for days in intervals:
        target_date = today + timedelta(days=days)

        # Query all open opportunities closing on target_date
        opportunities = Opportunity.objects.filter(
            application_closing_date=target_date,
            application_status__in=[ApplicationStatus.OPEN, ApplicationStatus.CLOSING_SOON]
        )

        for opp in opportunities:
            # 1. Users who saved this opportunity
            saved_users = User.objects.filter(
                saved_opportunities__opportunity=opp,
                is_active=True,
                is_email_verified=True
            ).distinct()

            # 2. Users who track this opportunity
            tracked_records = ApplicationTracker.objects.filter(
                opportunity=opp,
                reminder_enabled=True,
                user__is_active=True,
                user__is_email_verified=True
            ).select_related('user')
            tracked_map = {t.user_id: t for t in tracked_records}

            # 3. Users who explicitly subscribed to deadline alerts for this opportunity
            sub_users = User.objects.filter(
                opportunity_subscriptions__opportunity=opp,
                opportunity_subscriptions__notify_deadline=True,
                is_active=True,
                is_email_verified=True
            ).distinct()

            # Combine all candidate users
            candidate_user_ids = set(saved_users.values_list('id', flat=True)) | \
                                 set(tracked_map.keys()) | \
                                 set(sub_users.values_list('id', flat=True))

            for user_id in candidate_user_ids:
                user = User.objects.filter(id=user_id).first()
                if not user:
                    continue

                pref = getattr(user, 'notification_preferences', None)
                if not pref or not pref.email_notifications_enabled or not pref.deadline_reminders_enabled:
                    continue

                # Check interval preference
                if days == 0:
                    if not (pref.deadline_day_reminder_enabled or 0 in pref.reminder_days_before):
                        continue
                else:
                    if days not in pref.reminder_days_before:
                        continue

                tracker = tracked_map.get(user.id)
                log = EmailService.send_deadline_reminder(
                    user=user,
                    opportunity=opp,
                    days_remaining=days,
                    tracker=tracker
                )
                if log:
                    total_reminders_queued += 1

    logger.info(f"Upcoming deadlines scan completed. {total_reminders_queued} alerts dispatched or queued.")
    return f"Completed scan: {total_reminders_queued} reminders processed."

@shared_task
def notify_new_opportunity_task(opportunity_id: int):
    """
    Triggered when an opportunity is newly published or verified.
    Evaluates applicant profiles using deterministic EligibilityEngine.
    Distinguishes ELIGIBLE, POTENTIALLY_ELIGIBLE, INELIGIBLE, INSUFFICIENT_INFORMATION.
    """
    try:
        opp = Opportunity.objects.get(id=opportunity_id)
    except Opportunity.DoesNotExist:
        logger.error(f"Opportunity {opportunity_id} does not exist.")
        return "Opportunity not found."

    if opp.application_status in ['CLOSED', 'EXPIRED', 'ARCHIVED']:
        logger.info(f"Skipping notifications for inactive opportunity {opp.id}.")
        return "Opportunity inactive."

    is_scheme = opp.opportunity_type not in ['SCHOLARSHIP', 'FELLOWSHIP', 'STIPEND']

    # Find active verified users
    users = User.objects.filter(is_active=True, is_email_verified=True).select_related(
        'profile', 'notification_preferences'
    )

    sent_count = 0

    for user in users:
        pref = getattr(user, 'notification_preferences', None)
        if not pref or not pref.email_notifications_enabled:
            continue

        if is_scheme and not pref.new_schemes_enabled:
            continue
        if not is_scheme and not pref.new_scholarships_enabled:
            continue

        profile = getattr(user, 'profile', None)

        if profile and pref.personalized_matches_enabled:
            # Evaluate deterministic eligibility
            eval_result = EligibilityEngine.evaluate(opp, profile=profile)
            status = eval_result['status']

            if status == EligibilityResultStatus.ELIGIBLE:
                # Confirmed match
                log = EmailService.send_new_opportunity_alert(
                    user=user,
                    opportunity=opp,
                    match_explanation=eval_result.get('explanation', ''),
                    is_eligibility_match=True
                )
                if log and log.status == EmailDeliveryStatus.SENT:
                    sent_count += 1
            elif status == EligibilityResultStatus.POTENTIALLY_ELIGIBLE and pref.include_potentially_eligible:
                # User opted to receive potentially eligible alerts
                explanation = f"Potentially eligible based on available profile information: {eval_result.get('explanation', '')}"
                log = EmailService.send_new_opportunity_alert(
                    user=user,
                    opportunity=opp,
                    match_explanation=explanation,
                    is_eligibility_match=True
                )
                if log and log.status == EmailDeliveryStatus.SENT:
                    sent_count += 1
            # If INSUFFICIENT_INFORMATION or INELIGIBLE, do NOT treat as match!
        elif not pref.personalized_matches_enabled:
            # User wants general alerts without profile filtering
            log = EmailService.send_new_opportunity_alert(
                user=user,
                opportunity=opp,
                match_explanation=None,
                is_eligibility_match=False
            )
            if log and log.status == EmailDeliveryStatus.SENT:
                sent_count += 1

    logger.info(f"New opportunity {opportunity_id} alert sent to {sent_count} users.")
    return f"Notified {sent_count} users."

@shared_task
def process_opportunity_changes_task():
    """
    Periodic task running every 15 minutes.
    Processes OpportunityChangeEvent records (deadline extensions, criteria changes, closed).
    """
    events = OpportunityChangeEvent.objects.filter(processed=False).select_related('opportunity')[:50]
    processed_count = 0

    for event in events:
        opp = event.opportunity
        # Find subscribed, saved, or tracking users
        saved_user_ids = set(SavedOpportunity.objects.filter(opportunity=opp).values_list('user_id', flat=True))
        tracked_user_ids = set(ApplicationTracker.objects.filter(opportunity=opp).values_list('user_id', flat=True))
        sub_user_ids = set(OpportunitySubscription.objects.filter(opportunity=opp, notify_changes=True).values_list('user_id', flat=True))

        target_user_ids = saved_user_ids | tracked_user_ids | sub_user_ids

        for user_id in target_user_ids:
            user = User.objects.filter(id=user_id, is_active=True, is_email_verified=True).first()
            if not user:
                continue

            pref = getattr(user, 'notification_preferences', None)
            if not pref or not pref.email_notifications_enabled:
                continue

            if event.change_type == OpportunityChangeEvent.ChangeType.DEADLINE_EXTENDED:
                if pref.deadline_extension_alerts_enabled:
                    old_date = event.old_values.get('closing_date', 'Previous Deadline')
                    new_date = event.new_values.get('closing_date', str(opp.application_closing_date))
                    EmailService.send_deadline_extended_alert(user, opp, old_date, new_date)

            elif event.change_type in [
                OpportunityChangeEvent.ChangeType.REQUIREMENTS_CHANGED,
                OpportunityChangeEvent.ChangeType.BENEFITS_CHANGED,
                OpportunityChangeEvent.ChangeType.DOCUMENTS_CHANGED
            ]:
                if pref.changes_alerts_enabled:
                    change_desc = event.new_values.get('summary', 'Important eligibility criteria or document updates detected.')
                    EmailService.send_opportunity_changes_alert(user, opp, change_desc)

            elif event.change_type in [
                OpportunityChangeEvent.ChangeType.CLOSED_OR_EXPIRED,
                OpportunityChangeEvent.ChangeType.STATUS_CHANGED
            ]:
                reason = event.new_values.get('reason', 'Applications have officially closed.')
                EmailService.send_opportunity_closed_alert(user, opp, reason)

        event.processed = True
        event.processed_at = timezone.now()
        event.save()
        processed_count += 1

    return f"Processed {processed_count} opportunity change events."

@shared_task
def send_weekly_digests_task():
    """
    Periodic task running weekly (Monday at 08:00 IST).
    Compiles top deterministic matches and upcoming deadlines into a single personalized email.
    """
    logger.info("Starting weekly opportunity digest task...")
    users = User.objects.filter(is_active=True, is_email_verified=True).select_related(
        'profile', 'notification_preferences'
    )
    today = timezone.localtime(timezone.now()).date()
    in_14_days = today + timedelta(days=14)

    sent_count = 0

    for user in users:
        pref = getattr(user, 'notification_preferences', None)
        if not pref or not pref.email_notifications_enabled or not pref.weekly_digest_enabled:
            continue

        profile = getattr(user, 'profile', None)
        if not profile:
            continue

        # Find closing soon opportunities
        closing_soon = list(Opportunity.objects.filter(
            application_closing_date__gte=today,
            application_closing_date__lte=in_14_days,
            application_status=ApplicationStatus.OPEN
        )[:5])

        # Evaluate recent open opportunities
        recent_open = Opportunity.objects.filter(
            application_status=ApplicationStatus.OPEN
        ).order_by('-created_at')[:25]

        matches = []
        for opp in recent_open:
            res = EligibilityEngine.evaluate(opp, profile=profile)
            if res['status'] == EligibilityResultStatus.ELIGIBLE:
                matches.append({'opportunity': opp, 'explanation': res.get('explanation', '')})
            elif res['status'] == EligibilityResultStatus.POTENTIALLY_ELIGIBLE and pref.include_potentially_eligible:
                matches.append({'opportunity': opp, 'explanation': res.get('explanation', '')})

        if matches or closing_soon:
            log = EmailService.send_weekly_digest(user, matches=matches[:5], closing_soon=closing_soon[:5])
            if log and log.status == EmailDeliveryStatus.SENT:
                sent_count += 1

    logger.info(f"Weekly digest dispatched to {sent_count} users.")
    return f"Dispatched {sent_count} weekly digests."

@shared_task
def send_tracker_reminders_task():
    """
    Periodic task running daily (at 07:00 IST).
    Checks tracked applications for pending milestones and documents.
    """
    now = timezone.localtime(timezone.now()).date()
    trackers = ApplicationTracker.objects.filter(
        reminder_enabled=True,
        user__is_active=True,
        user__is_email_verified=True,
        opportunity__application_status=ApplicationStatus.OPEN
    ).select_related('user', 'opportunity')

    reminders_sent = 0

    for tracker in trackers:
        user = tracker.user
        opp = tracker.opportunity
        pref = getattr(user, 'notification_preferences', None)
        if not pref or not pref.email_notifications_enabled or not pref.application_tracker_reminders_enabled:
            continue

        # Check if closing within 7 days or has pending documents
        days_left = (opp.application_closing_date - now).days if opp.application_closing_date else 999
        pending_docs = [d for d in tracker.documents_checklist if d.get('status') not in ['READY', 'VERIFIED']]

        msg = ""
        if 0 <= days_left <= 7:
            msg = f"The deadline for this tracked scheme is in {days_left} day{'s' if days_left != 1 else ''}. Please ensure all documents are submitted."
        elif len(pending_docs) > 0:
            msg = f"You have {len(pending_docs)} document(s) pending for your tracked application: {', '.join([d.get('name', 'Doc') for d in pending_docs[:3]])}."

        if msg:
            log = EmailService.send_tracker_reminder(user, tracker, msg)
            if log and log.status == EmailDeliveryStatus.SENT:
                reminders_sent += 1

    return f"Dispatched {reminders_sent} tracker reminders."

@shared_task
def process_email_retries_task():
    """
    Periodic task running every 5 minutes.
    Retries transient failed email deliveries with exponential backoff.
    """
    logs = EmailDeliveryLog.objects.filter(
        status=EmailDeliveryStatus.RETRYING,
        retry_count__lt=models.F('max_retries')
    ).select_related('user', 'related_opportunity')[:30]

    retried_count = 0
    now = timezone.now()

    for log in logs:
        # Exponential backoff calculation: 5min * 2^(retry_count)
        delay_minutes = 5 * (2 ** (log.retry_count - 1)) if log.retry_count > 0 else 5
        scheduled_retry = (log.sent_at or log.created_at) + timedelta(minutes=delay_minutes)

        if now >= scheduled_retry:
            logger.info(f"Retrying email log {log.id} to {log.recipient_email} (attempt {log.retry_count + 1})...")
            
            html_content = log.metadata.get('html_content', '')
            text_content = log.metadata.get('text_content', '')
            if not html_content:
                # If content not saved in metadata, re-attempt via general message
                text_content = f"ScholarSetu AI notification retry: {log.subject}"
                html_content = f"<p>{text_content}</p>"

            EmailService.send_email_message(
                recipient_email=log.recipient_email,
                subject=log.subject,
                html_content=html_content,
                text_content=text_content,
                notification_type=log.notification_type,
                user=log.user,
                opportunity=log.related_opportunity,
                idempotency_key=log.idempotency_key,
                deadline_version=log.deadline_version
            )
            retried_count += 1

    return f"Processed {retried_count} retries."

@shared_task
def cleanup_expired_notifications_task():
    """
    Retention Policy Enforcement:
    - Sent and duplicate-suppressed email delivery logs older than 90 days are deleted.
    - Read notifications older than 60 days are purged.
    - Processed opportunity change events older than 90 days are deleted.
    - Failed delivery logs with permanent failure older than 180 days are deleted.
    """
    now = timezone.now()
    log_cutoff = now - timedelta(days=90)
    read_notif_cutoff = now - timedelta(days=60)
    change_events_cutoff = now - timedelta(days=90)
    failed_log_cutoff = now - timedelta(days=180)

    deleted_logs, _ = EmailDeliveryLog.objects.filter(
        status__in=[EmailDeliveryStatus.SENT, EmailDeliveryStatus.SUPPRESSED_DUPLICATE, EmailDeliveryStatus.DELIVERED],
        created_at__lt=log_cutoff
    ).delete()

    deleted_notifs, _ = Notification.objects.filter(
        is_read=True,
        read_at__lt=read_notif_cutoff
    ).delete()

    deleted_changes, _ = OpportunityChangeEvent.objects.filter(
        processed=True,
        processed_at__lt=change_events_cutoff
    ).delete()

    deleted_failures, _ = EmailDeliveryLog.objects.filter(
        status=EmailDeliveryStatus.FAILED,
        created_at__lt=failed_log_cutoff
    ).delete()

    summary = f"Retention cleanup: {deleted_logs} logs, {deleted_notifs} notifications, {deleted_changes} change events, {deleted_failures} failed logs deleted."
    logger.info(summary)
    return summary
