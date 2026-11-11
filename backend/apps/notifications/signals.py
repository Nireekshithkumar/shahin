import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.db import transaction

from apps.opportunities.models import Opportunity, VerificationStatus, ApplicationStatus
from apps.notifications.models import OpportunityChangeEvent
from apps.notifications.tasks import notify_new_opportunity_task

logger = logging.getLogger('notifications')

@receiver(pre_save, sender=Opportunity)
def opportunity_pre_save_tracker(sender, instance, **kwargs):
    """
    Captures pre-save snapshot of Opportunity fields to detect deadline extensions,
    criteria modifications, benefits adjustments, or closing events.
    """
    if instance.pk:
        try:
            old = Opportunity.objects.filter(pk=instance.pk).values(
                'application_closing_date',
                'application_status',
                'verification_status',
                'benefit_amount',
                'benefit_description',
                'required_documents',
                'max_annual_income',
                'min_academic_percentage',
                'education_levels'
            ).first()
            instance._old_state = old
        except Exception as e:
            logger.warning(f"Failed to record pre-save state for Opportunity {instance.pk}: {e}")
            instance._old_state = None
    else:
        instance._old_state = None

@receiver(post_save, sender=Opportunity)
def opportunity_post_save_dispatcher(sender, instance, created, **kwargs):
    """
    Dispatches notifications and creates OpportunityChangeEvent records.
    Uses transaction.on_commit for durable, reliable background execution.
    """
    old = getattr(instance, '_old_state', None)

    # 1. Newly created verified opportunity
    if created:
        if instance.verification_status == VerificationStatus.OFFICIAL_VERIFIED:
            def dispatch_new():
                try:
                    notify_new_opportunity_task.delay(instance.id)
                except Exception as exc:
                    logger.warning(f"Could not queue Celery task for new opportunity {instance.id}, running synchronously: {exc}")
                    notify_new_opportunity_task(instance.id)
            transaction.on_commit(dispatch_new)
        return

    # 2. Updated opportunity
    if not old:
        return

    # Opportunity just verified
    if old.get('verification_status') != VerificationStatus.OFFICIAL_VERIFIED and \
       instance.verification_status == VerificationStatus.OFFICIAL_VERIFIED:
        def dispatch_verified():
            try:
                notify_new_opportunity_task.delay(instance.id)
            except Exception as exc:
                logger.warning(f"Could not queue Celery task for verified opportunity {instance.id}, running synchronously: {exc}")
                notify_new_opportunity_task(instance.id)
        transaction.on_commit(dispatch_verified)

    # Deadline extended
    old_closing = old.get('application_closing_date')
    new_closing = instance.application_closing_date
    if old_closing and new_closing and new_closing > old_closing:
        OpportunityChangeEvent.objects.create(
            opportunity=instance,
            change_type=OpportunityChangeEvent.ChangeType.DEADLINE_EXTENDED,
            old_values={'closing_date': str(old_closing)},
            new_values={'closing_date': str(new_closing)}
        )

    # Opportunity marked closed or expired
    old_status = old.get('application_status')
    if old_status != instance.application_status and instance.application_status in [
        ApplicationStatus.CLOSED, ApplicationStatus.EXPIRED, ApplicationStatus.ARCHIVED
    ]:
        OpportunityChangeEvent.objects.create(
            opportunity=instance,
            change_type=OpportunityChangeEvent.ChangeType.CLOSED_OR_EXPIRED,
            old_values={'status': old_status},
            new_values={'status': instance.application_status, 'reason': f"Marked {instance.get_application_status_display()}"}
        )

    # Benefits or required documents changed
    if old.get('benefit_amount') != instance.benefit_amount or \
       old.get('benefit_description') != instance.benefit_description or \
       old.get('required_documents') != instance.required_documents:
        summary_parts = []
        if old.get('benefit_amount') != instance.benefit_amount:
            summary_parts.append(f"Benefit amount updated to Rs {instance.benefit_amount or 'variable'}")
        if old.get('required_documents') != instance.required_documents:
            summary_parts.append("Required documents list updated")

        OpportunityChangeEvent.objects.create(
            opportunity=instance,
            change_type=OpportunityChangeEvent.ChangeType.BENEFITS_CHANGED,
            old_values={
                'benefit_amount': str(old.get('benefit_amount')),
                'required_documents': old.get('required_documents')
            },
            new_values={
                'benefit_amount': str(instance.benefit_amount),
                'required_documents': instance.required_documents,
                'summary': '; '.join(summary_parts) if summary_parts else "Benefits and documentation revised."
            }
        )

    # Eligibility criteria modified (income ceiling, percentage, education levels)
    if old.get('max_annual_income') != instance.max_annual_income or \
       old.get('min_academic_percentage') != instance.min_academic_percentage or \
       old.get('education_levels') != instance.education_levels:
        summary_parts = []
        if old.get('max_annual_income') != instance.max_annual_income:
            summary_parts.append(f"Annual family income limit updated to Rs {instance.max_annual_income or 'No limit'}")
        if old.get('min_academic_percentage') != instance.min_academic_percentage:
            summary_parts.append(f"Minimum marks requirement adjusted to {instance.min_academic_percentage or 'None'}%")

        OpportunityChangeEvent.objects.create(
            opportunity=instance,
            change_type=OpportunityChangeEvent.ChangeType.REQUIREMENTS_CHANGED,
            old_values={
                'max_annual_income': str(old.get('max_annual_income')),
                'min_academic_percentage': str(old.get('min_academic_percentage')),
                'education_levels': old.get('education_levels')
            },
            new_values={
                'max_annual_income': str(instance.max_annual_income),
                'min_academic_percentage': str(instance.min_academic_percentage),
                'education_levels': instance.education_levels,
                'summary': '; '.join(summary_parts) if summary_parts else "Eligibility rules updated."
            }
        )
