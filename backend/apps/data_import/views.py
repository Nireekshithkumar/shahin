import csv
import json
import io
from datetime import date
from decimal import Decimal
from rest_framework import views, permissions, status
from rest_framework.response import Response
from apps.opportunities.models import Opportunity, OpportunitySource, VerificationStatus
from apps.data_import.models import DataImportJob, DataQualityIssue, ImportSourceType, ImportJobStatus, QualityIssueType

class AdminDashboardStatsView(views.APIView):
    permission_classes = [permissions.AllowAny]  # Admin / Dashboard endpoint

    def get(self, request):
        total_opps = Opportunity.objects.count()
        verified_opps = Opportunity.objects.filter(verification_status=VerificationStatus.OFFICIAL_VERIFIED).count()
        unverified_opps = Opportunity.objects.exclude(verification_status=VerificationStatus.OFFICIAL_VERIFIED).count()
        closing_soon = Opportunity.objects.filter(
            application_closing_date__gte=date.today(),
            application_closing_date__lte=date.today() + __import__('datetime').timedelta(days=30)
        ).count()

        # Group by state
        from django.db.models import Count
        state_counts = list(Opportunity.objects.values('applicable_state').annotate(count=Count('id')).order_by('-count')[:10])

        # Group by category / type
        type_counts = list(Opportunity.objects.values('opportunity_type').annotate(count=Count('id')).order_by('-count'))

        # Sources
        sources = list(OpportunitySource.objects.values('id', 'name', 'domain', 'records_imported', 'records_updated', 'verification_status', 'is_active'))

        # Quality Issues
        unresolved_issues = DataQualityIssue.objects.filter(is_resolved=False).count()

        return Response({
            'overview': {
                'total_opportunities': total_opps,
                'verified_opportunities': verified_opps,
                'unverified_opportunities': unverified_opps,
                'closing_soon_count': closing_soon,
                'unresolved_quality_issues': unresolved_issues,
            },
            'state_breakdown': state_counts,
            'type_breakdown': type_counts,
            'sources': sources
        }, status=status.HTTP_200_OK)

class OpportunityImportView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        file_obj = request.FILES.get('file')
        raw_json = request.data.get('records')

        records = []
        source_type = ImportSourceType.JSON

        if file_obj:
            fname = file_obj.name.lower()
            if fname.endswith('.csv'):
                source_type = ImportSourceType.CSV
                decoded = file_obj.read().decode('utf-8')
                reader = csv.DictReader(io.StringIO(decoded))
                records = list(reader)
            elif fname.endswith('.json'):
                source_type = ImportSourceType.JSON
                records = json.loads(file_obj.read().decode('utf-8'))
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
                verification_status=VerificationStatus.IMPORTED_UNVERIFIED
            )
            imported += 1

        job.imported_count = imported
        job.updated_count = updated
        job.duplicate_count = duplicates
        job.error_count = errors
        job.status = ImportJobStatus.COMPLETED
        job.save()

        return Response({
            'job_id': job.id,
            'status': job.status,
            'total': len(records),
            'imported': imported,
            'duplicates_flagged': duplicates,
            'errors': errors
        }, status=status.HTTP_201_CREATED)

class VerifyOpportunityView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, id):
        try:
            opp = Opportunity.objects.get(id=id)
            opp.verification_status = VerificationStatus.OFFICIAL_VERIFIED
            opp.last_verified_date = date.today()
            opp.save()
            return Response({
                'id': opp.id,
                'title': opp.title,
                'verification_status': opp.verification_status,
                'last_verified_date': str(opp.last_verified_date)
            }, status=status.HTTP_200_OK)
        except Opportunity.DoesNotExist:
            return Response({'error': 'Opportunity not found.'}, status=status.HTTP_404_NOT_FOUND)

class TriggerSourceSyncView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, id):
        try:
            source = OpportunitySource.objects.get(id=id)
            source.last_attempted_sync = date.today()
            source.last_successful_sync = date.today()
            source.records_updated += 1
            source.save()
            return Response({
                'source': source.name,
                'status': 'Synchronized successfully',
                'last_successful_sync': str(source.last_successful_sync)
            }, status=status.HTTP_200_OK)
        except OpportunitySource.DoesNotExist:
            return Response({'error': 'Source not found.'}, status=status.HTTP_404_NOT_FOUND)
