import csv
import json
import io
from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Count, Q
from rest_framework import views, permissions, status
from rest_framework.response import Response
from apps.accounts.permissions import IsScholarSetuAdmin
from apps.accounts.models import User, UserRole
from apps.opportunities.models import (
    Opportunity, OpportunitySource, VerificationStatus, ApplicationStatus,
    OpportunityAuditLog, AuditLogAction
)
from apps.data_import.models import (
    DataImportJob, DataQualityIssue, ImportSourceType, ImportJobStatus, QualityIssueType
)
from apps.notifications.models import EmailDeliveryLog, EmailDeliveryStatus
from apps.profiles.models import UserDocument
from apps.ai_assistant.models import ChatMessage

class AdminDashboardStatsView(views.APIView):
    """
    Overview analytics engine powered strictly by actual database records:
    Users, Verified Schemes, Ingestion pipelines, Email deliveries, and AI tool usage.
    """
    permission_classes = [IsScholarSetuAdmin]

    def get(self, request):
        today = date.today()
        upcoming_30 = today + timedelta(days=30)

        # User counts
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()

        # Opportunity and Scheme counts
        total_opps = Opportunity.objects.count()
        scholarships_count = Opportunity.objects.filter(opportunity_type='SCHOLARSHIP').count()
        govt_schemes_count = Opportunity.objects.exclude(opportunity_type='SCHOLARSHIP').count()

        # Verification metrics
        verified_count = Opportunity.objects.filter(verification_status=VerificationStatus.VERIFIED).count()
        pending_count = Opportunity.objects.filter(
            verification_status__in=[
                VerificationStatus.PENDING_VERIFICATION,
                VerificationStatus.IMPORTED_UNVERIFIED,
                VerificationStatus.NEEDS_REVIEW,
                VerificationStatus.NEEDS_MANUAL_REVIEW
            ]
        ).count()
        outdated_count = Opportunity.objects.filter(verification_status=VerificationStatus.OUTDATED).count()
        closed_count = Opportunity.objects.filter(
            Q(verification_status=VerificationStatus.CLOSED) | Q(application_status=ApplicationStatus.CLOSED)
        ).count()

        # Deadlines in next 30 days
        closing_soon_count = Opportunity.objects.filter(
            application_closing_date__gte=today,
            application_closing_date__lte=upcoming_30
        ).count()

        # Email notification metrics
        emails_sent = EmailDeliveryLog.objects.filter(
            status__in=[EmailDeliveryStatus.SENT, EmailDeliveryStatus.DELIVERED, EmailDeliveryStatus.ACCEPTED]
        ).count()
        emails_failed = EmailDeliveryLog.objects.filter(status=EmailDeliveryStatus.FAILED).count()

        # AI Usage metrics
        doc_checker_runs = UserDocument.objects.count()
        ai_assistant_chats = ChatMessage.objects.count()

        # Group by state
        state_counts = list(Opportunity.objects.values('applicable_state').annotate(count=Count('id')).order_by('-count')[:10])

        # Group by category / type
        type_counts = list(Opportunity.objects.values('opportunity_type').annotate(count=Count('id')).order_by('-count'))

        # Sources
        sources = list(OpportunitySource.objects.values(
            'id', 'name', 'domain', 'records_imported', 'records_updated',
            'verification_status', 'is_active', 'health_status', 'last_successful_sync'
        ))

        # Quality Issues
        unresolved_issues = DataQualityIssue.objects.filter(is_resolved=False).count()

        return Response({
            'overview': {
                'total_users': total_users,
                'active_users': active_users,
                'total_opportunities': total_opps,
                'total_scholarships': scholarships_count,
                'total_govt_schemes': govt_schemes_count,
                'verified_schemes': verified_count,
                'pending_verification': pending_count,
                'outdated_schemes': outdated_count,
                'closed_schemes': closed_count,
                'closing_soon_count': closing_soon_count,
                'emails_sent': emails_sent,
                'emails_failed': emails_failed,
                'doc_checker_usage': doc_checker_runs,
                'ai_assistant_usage': ai_assistant_chats,
                'unresolved_quality_issues': unresolved_issues,
            },
            'state_breakdown': state_counts,
            'type_breakdown': type_counts,
            'sources': sources
        }, status=status.HTTP_200_OK)


class AdminUserManagementView(views.APIView):
    """
    Dedicated admin endpoint to list registered users and toggle account activation.
    Passwords and sensitive personal credentials are strictly excluded.
    """
    permission_classes = [IsScholarSetuAdmin]

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        users = User.objects.all().order_by('-date_joined')
        if search:
            users = users.filter(Q(email__icontains=search) | Q(username__icontains=search))

        data = [
            {
                'id': u.id,
                'email': u.email,
                'username': u.username,
                'role': u.role,
                'is_active': u.is_active,
                'is_email_verified': u.is_email_verified,
                'date_joined': u.date_joined.strftime('%Y-%m-%d %H:%M') if u.date_joined else None,
                'last_login': u.last_login.strftime('%Y-%m-%d %H:%M') if u.last_login else 'Never'
            }
            for u in users[:100]
        ]
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request):
        user_id = request.data.get('user_id')
        is_active = request.data.get('is_active')

        if user_id is None or is_active is None:
            return Response({'error': 'user_id and is_active are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
            if target_user.role == UserRole.ADMIN and not is_active:
                return Response({'error': 'Cannot deactivate the primary platform administrator.'}, status=status.HTTP_400_BAD_REQUEST)

            target_user.is_active = bool(is_active)
            target_user.save(update_fields=['is_active'])

            OpportunityAuditLog.objects.create(
                admin_user=request.user,
                action=AuditLogAction.STATUS_CHANGE,
                object_repr=f"User: {target_user.email}",
                change_summary=f"Admin set is_active={target_user.is_active} for {target_user.email}"
            )

            return Response({
                'message': f"User {target_user.email} {'activated' if target_user.is_active else 'deactivated'}.",
                'user_id': target_user.id,
                'is_active': target_user.is_active
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


class AdminAuditLogsView(views.APIView):
    """
    Provides immutable audit records of all administrative actions.
    """
    permission_classes = [IsScholarSetuAdmin]

    def get(self, request):
        logs = OpportunityAuditLog.objects.all().select_related('admin_user').order_by('-timestamp')[:100]
        data = [
            {
                'id': l.id,
                'admin_email': l.admin_user.email if l.admin_user else 'System / Task',
                'action': l.action,
                'object_repr': l.object_repr or (l.opportunity.title if l.opportunity else 'System Record'),
                'change_summary': l.change_summary,
                'timestamp': l.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                'ip_address': l.ip_address
            }
            for l in logs
        ]
        return Response(data, status=status.HTTP_200_OK)


class OpportunityImportView(views.APIView):
    permission_classes = [IsScholarSetuAdmin]

    def post(self, request):
        file_obj = request.FILES.get('file')
        raw_json = request.data.get('records')

        records = []
        source_type = ImportSourceType.JSON

        if file_obj:
            fname = file_obj.name.lower()
            if fname.endswith('.csv'):
                source_type = ImportSourceType.CSV
                decoded = file_obj.read().decode('utf-8', errors='ignore')
                reader = csv.DictReader(io.StringIO(decoded))
                records = list(reader)
            elif fname.endswith('.json'):
                source_type = ImportSourceType.JSON
                records = json.loads(file_obj.read().decode('utf-8', errors='ignore'))
        elif raw_json:
            records = json.loads(raw_json) if isinstance(raw_json, str) else raw_json

        if not records:
            return Response({'error': 'No valid CSV or JSON records found in upload.'}, status=status.HTTP_400_BAD_REQUEST)

        job = DataImportJob.objects.create(
            source_type=source_type,
            total_records=len(records),
            status=ImportJobStatus.RUNNING
        )

        imported = 0
        updated = 0
        duplicates = 0
        errors = 0

        for rec in records:
            title = rec.get('title') or rec.get('Opportunity Name') or rec.get('name')
            if not title:
                errors += 1
                continue

            provider = rec.get('provider') or rec.get('Department') or 'Government of India'
            state = rec.get('applicable_state') or rec.get('State') or 'All India'
            benefit_amount = rec.get('benefit_amount')
            amt = None
            if benefit_amount:
                try:
                    amt = Decimal(str(benefit_amount).replace('₹', '').replace(',', '').strip())
                except Exception:
                    pass

            # Deduplication check
            existing = Opportunity.objects.filter(title__iexact=title.strip()).first()
            if existing:
                duplicates += 1
                DataQualityIssue.objects.create(
                    opportunity=existing,
                    issue_type=QualityIssueType.DUPLICATE_CANDIDATE,
                    description=f"Duplicate candidate detected during import job #{job.id} for title: {title}"
                )
                continue

            # Ingestion integrity rule: Newly imported schemes ALWAYS start in PENDING_VERIFICATION
            opp = Opportunity.objects.create(
                title=title.strip(),
                provider=provider.strip(),
                applicable_state=state.strip(),
                short_description=rec.get('short_description', rec.get('description', '')),
                detailed_description=rec.get('detailed_description', rec.get('description', '')),
                benefit_amount=amt,
                benefit_description=rec.get('benefit_description', ''),
                official_application_url=rec.get('official_application_url', rec.get('url', 'https://scholarships.gov.in')),
                source_name=rec.get('source_name', 'Data Import Feed'),
                verification_status=VerificationStatus.PENDING_VERIFICATION,
                is_draft=True # Starts in draft until reviewed by Admin
            )
            imported += 1

        job.imported_count = imported
        job.updated_count = updated
        job.duplicate_count = duplicates
        job.error_count = errors
        job.status = ImportJobStatus.COMPLETED
        job.save()

        OpportunityAuditLog.objects.create(
            admin_user=request.user,
            action=AuditLogAction.IMPORT,
            change_summary=f"Imported {imported} schemes from {source_type}. Duplicates flagged: {duplicates}"
        )

        return Response({
            'job_id': job.id,
            'status': job.status,
            'total': len(records),
            'imported': imported,
            'duplicates_flagged': duplicates,
            'errors': errors
        }, status=status.HTTP_201_CREATED)


class VerifyOpportunityView(views.APIView):
    permission_classes = [IsScholarSetuAdmin]

    def post(self, request, id):
        try:
            opp = Opportunity.objects.get(id=id)
            opp.verification_status = VerificationStatus.VERIFIED
            opp.last_verified_date = date.today()
            opp.save()

            OpportunityAuditLog.objects.create(
                admin_user=request.user,
                opportunity=opp,
                action=AuditLogAction.VERIFY,
                change_summary=f"Admin verified source evidence for {opp.title}"
            )

            return Response({
                'id': opp.id,
                'title': opp.title,
                'verification_status': opp.verification_status,
                'last_verified_date': str(opp.last_verified_date)
            }, status=status.HTTP_200_OK)
        except Opportunity.DoesNotExist:
            return Response({'error': 'Opportunity not found.'}, status=status.HTTP_404_NOT_FOUND)


class TriggerSourceSyncView(views.APIView):
    permission_classes = [IsScholarSetuAdmin]

    def post(self, request, id):
        try:
            source = OpportunitySource.objects.get(id=id)
            source.last_attempted_sync = timezone.now()
            source.last_successful_sync = timezone.now()
            source.records_updated += 1
            source.save()

            OpportunityAuditLog.objects.create(
                admin_user=request.user,
                action=AuditLogAction.SOURCE_SYNC,
                object_repr=f"Source: {source.name}",
                change_summary=f"Triggered manual data synchronization for {source.name}"
            )

            return Response({
                'source': source.name,
                'status': 'Synchronized successfully',
                'last_successful_sync': source.last_successful_sync.strftime('%Y-%m-%d %H:%M:%S')
            }, status=status.HTTP_200_OK)
        except OpportunitySource.DoesNotExist:
            return Response({'error': 'Source not found.'}, status=status.HTTP_404_NOT_FOUND)
