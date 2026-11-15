from datetime import date
from django.core.management.base import BaseCommand
from apps.profiles.models import (
    UserDocument, CertificateExpiryMilestone, ValidityStatusChoices
)
from apps.profiles.validity_engine import CertificateValidityEngine
from apps.notifications.models import Notification, NotificationType

class Command(BaseCommand):
    help = 'Monitors certificate validity and dispatches expiry milestone notifications (30d, 15d, 7d, 0d, expired).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Runs checks without writing notifications or saving milestones to DB.'
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        today = date.today()
        self.stdout.write(f"[{today}] Starting Certificate Validity & Expiry Monitoring Scan...")

        # Select documents that have a date to monitor
        docs = UserDocument.objects.exclude(
            validity_status=ValidityStatusChoices.NO_EXPIRY_APPLICABLE
        )

        checked_count = 0
        expiring_count = 0
        expired_count = 0
        notifications_sent = 0

        for doc in docs:
            checked_count += 1
            # Re-evaluate validity
            if not dry_run:
                CertificateValidityEngine.apply_validity_evaluation(doc, save=True)

            target_date = doc.expiry_date or doc.detected_expiry_date
            if not target_date:
                continue

            remaining_days = (target_date - today).days

            # Determine matching milestone
            milestone = None
            title = None
            message = None
            notif_type = NotificationType.CERTIFICATE_EXPIRING

            if remaining_days == 30:
                milestone = '30_DAYS'
                title = f"Certificate Expiring in 30 Days: {doc.get_document_type_display()}"
                message = f"Your {doc.get_document_type_display()} ({doc.original_filename}) will expire on {target_date}. Please prepare required renewal documents."
                expiring_count += 1
            elif remaining_days == 15:
                milestone = '15_DAYS'
                title = f"Urgent: Certificate Expiring in 15 Days ({doc.get_document_type_display()})"
                message = f"Your {doc.get_document_type_display()} expires on {target_date}. Begin your renewal application to avoid scholarship disruption."
                expiring_count += 1
            elif remaining_days == 7:
                milestone = '7_DAYS'
                title = f"Critical Alert: Certificate Expiring in 7 Days ({doc.get_document_type_display()})"
                message = f"Only 7 days remaining for your {doc.get_document_type_display()} ({doc.original_filename}). Visit the official portal for expedited renewal."
                expiring_count += 1
            elif remaining_days == 0:
                milestone = 'EXPIRY_DAY'
                title = f"Action Required: Certificate Expires Today ({doc.get_document_type_display()})"
                message = f"Your {doc.get_document_type_display()} expires today ({target_date}). Expired documents cannot be submitted for government schemes."
                expiring_count += 1
            elif remaining_days < 0:
                expired_count += 1
                milestone = 'AFTER_EXPIRY'
                notif_type = NotificationType.CERTIFICATE_EXPIRED
                title = f"Expired Certificate Notice: {doc.get_document_type_display()}"
                message = f"Your {doc.get_document_type_display()} expired on {target_date} ({abs(remaining_days)} days ago). Please upload a renewed certificate to maintain scheme eligibility."

            if milestone:
                # Deduplication check: Has this milestone already been notified for this document?
                already_notified = CertificateExpiryMilestone.objects.filter(
                    document=doc,
                    milestone=milestone
                ).exists()

                if not already_notified:
                    self.stdout.write(
                        self.style.WARNING(
                            f"-> Alert for {doc.user.email}: Doc #{doc.id} ({doc.get_document_type_display()}) - Milestone: {milestone} (Remaining: {remaining_days}d)"
                        )
                    )
                    if not dry_run:
                        # 1. Create in-app Notification
                        Notification.objects.create(
                            user=doc.user,
                            notification_type=notif_type,
                            title=title,
                            message=message,
                            action_url='/document-readiness'
                        )

                        # 2. Try sending optional email notification if configured
                        try:
                            from apps.notifications.email_service import EmailDeliveryService
                            EmailDeliveryService.send_email_message(
                                recipient_email=doc.user.email,
                                subject=title,
                                notification_type=notif_type,
                                plain_content=message,
                                user=doc.user,
                                action_url='http://localhost:5173/document-readiness',
                                action_text='View Document Tracker'
                            )
                        except Exception as e:
                            # Log and continue
                            pass

                        # 3. Record milestone deduplication entry
                        CertificateExpiryMilestone.objects.create(
                            document=doc,
                            milestone=milestone
                        )
                        notifications_sent += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Scan Complete. Checked {checked_count} documents. Expiring: {expiring_count}, Expired: {expired_count}. New notifications dispatched: {notifications_sent}"
            )
        )
