from datetime import date, timedelta
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, permissions, views, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.opportunities.models import (
    Opportunity, OpportunitySource, ApplicationStatus, VerificationStatus,
    ScholarshipVisit, OpportunityDeadlineHistory, OpportunityAuditLog, AuditLogAction
)
from apps.opportunities.serializers import (
    OpportunityListSerializer, OpportunityDetailSerializer, OpportunitySourceSerializer,
    ScholarshipVisitSerializer, OpportunityDeadlineHistorySerializer, OpportunityAuditLogSerializer
)
from apps.accounts.permissions import IsAdminOrReadOnly, IsScholarSetuAdmin
from apps.opportunities.benefit_calculator import GovernmentBenefitCalculator

class OpportunityViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return OpportunityDetailSerializer
        return OpportunityListSerializer

    def perform_create(self, serializer):
        # By default new entries start in PENDING_VERIFICATION (or draft if requested)
        is_draft = self.request.data.get('is_draft', False)
        v_status = self.request.data.get('verification_status', VerificationStatus.PENDING_VERIFICATION)
        opp = serializer.save(
            verification_status=v_status,
            is_draft=is_draft,
            published_at=timezone.now() if not is_draft else None
        )
        if self.request.user.is_authenticated:
            OpportunityAuditLog.objects.create(
                admin_user=self.request.user,
                opportunity=opp,
                action=AuditLogAction.CREATE,
                change_summary=f"Created via Admin Hub: {opp.title} [Status: {v_status}]"
            )

    def perform_update(self, serializer):
        opp = serializer.save()
        if self.request.user.is_authenticated:
            OpportunityAuditLog.objects.create(
                admin_user=self.request.user,
                opportunity=opp,
                action=AuditLogAction.UPDATE,
                change_summary=f"Updated details for: {opp.title}"
            )

    def perform_destroy(self, instance):
        title = instance.title
        if self.request.user.is_authenticated:
            OpportunityAuditLog.objects.create(
                admin_user=self.request.user,
                object_repr=title,
                action=AuditLogAction.DELETE,
                change_summary=f"Deleted opportunity record: {title}"
            )
        instance.delete()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated:
            visit, created = ScholarshipVisit.objects.get_or_create(
                user=request.user,
                opportunity=instance,
                defaults={
                    'deadline_at_first_view': instance.application_closing_date,
                    'view_count': 1
                }
            )
            if not created:
                visit.view_count += 1
                visit.save(update_fields=['view_count', 'last_viewed_at'])

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def viewed(self, request):
        visits = ScholarshipVisit.objects.filter(user=request.user).select_related('opportunity').order_by('-last_viewed_at')
        page = self.paginate_queryset(visits)
        if page is not None:
            serializer = ScholarshipVisitSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ScholarshipVisitSerializer(visits, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def deadlines(self, request, id=None):
        opportunity = self.get_object()
        history = OpportunityDeadlineHistory.objects.filter(opportunity=opportunity).order_by('-detected_at')
        serializer = OpportunityDeadlineHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[IsScholarSetuAdmin])
    def audit_logs(self, request, id=None):
        opportunity = self.get_object()
        logs = OpportunityAuditLog.objects.filter(opportunity=opportunity).order_by('-timestamp')
        serializer = OpportunityAuditLogSerializer(logs, many=True)
        return Response(serializer.data)

    # --------------------------------------------------------------------------
    # Admin Exclusive Lifecycle Actions (Feature 9 & Admin Management Hub)
    # --------------------------------------------------------------------------
    @action(detail=True, methods=['post'], permission_classes=[IsScholarSetuAdmin])
    def verify(self, request, id=None):
        opp = self.get_object()
        opp.verification_status = VerificationStatus.VERIFIED
        opp.last_verified_date = timezone.now()
        opp.save(update_fields=['verification_status', 'last_verified_date', 'updated_at'])

        OpportunityAuditLog.objects.create(
            admin_user=request.user,
            opportunity=opp,
            action=AuditLogAction.VERIFY,
            change_summary=f"Officially verified by Admin: {opp.title}"
        )
        return Response({
            'message': f"Scheme '{opp.title}' has been successfully verified.",
            'verification_status': opp.verification_status,
            'last_verified_date': opp.last_verified_date
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsScholarSetuAdmin])
    def reject(self, request, id=None):
        opp = self.get_object()
        opp.verification_status = VerificationStatus.REJECTED
        opp.save(update_fields=['verification_status', 'updated_at'])

        OpportunityAuditLog.objects.create(
            admin_user=request.user,
            opportunity=opp,
            action=AuditLogAction.REJECT,
            change_summary=f"Marked as rejected/invalid by Admin: {opp.title}"
        )
        return Response({
            'message': f"Scheme '{opp.title}' marked as rejected.",
            'verification_status': opp.verification_status
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsScholarSetuAdmin])
    def publish(self, request, id=None):
        opp = self.get_object()
        opp.is_draft = False
        opp.published_at = timezone.now()
        opp.save(update_fields=['is_draft', 'published_at', 'updated_at'])

        OpportunityAuditLog.objects.create(
            admin_user=request.user,
            opportunity=opp,
            action=AuditLogAction.PUBLISH,
            change_summary=f"Published to citizen portal: {opp.title}"
        )
        return Response({
            'message': f"Scheme '{opp.title}' is now published and live for citizens.",
            'is_draft': opp.is_draft
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsScholarSetuAdmin])
    def unpublish(self, request, id=None):
        opp = self.get_object()
        opp.is_draft = True
        opp.save(update_fields=['is_draft', 'updated_at'])

        OpportunityAuditLog.objects.create(
            admin_user=request.user,
            opportunity=opp,
            action=AuditLogAction.UNPUBLISH,
            change_summary=f"Unpublished (moved to draft): {opp.title}"
        )
        return Response({
            'message': f"Scheme '{opp.title}' unpublished and hidden from citizens.",
            'is_draft': opp.is_draft
        }, status=status.HTTP_200_OK)

    def get_queryset(self):
        qs = Opportunity.objects.all()
        user = self.request.user

        # Strict RBAC data visibility: Normal users NEVER see unverified rejected schemes or drafts
        is_admin = user.is_authenticated and (getattr(user, 'role', '') == 'ADMIN' or user.is_superuser)
        if not is_admin:
            qs = qs.filter(is_draft=False).exclude(verification_status__in=['REJECTED', 'DISCONTINUED'])

        params = self.request.query_params

        # Search filter
        search = params.get('search', '').strip()
        if search:
            search_lower = search.lower()
            q_filter = (
                Q(title__icontains=search) |
                Q(provider__icontains=search) |
                Q(short_description__icontains=search) |
                Q(detailed_description__icontains=search) |
                Q(applicable_state__icontains=search) |
                Q(source_name__icontains=search) |
                Q(official_application_url__icontains=search)
            )
            if 'ssp' in search_lower:
                q_filter |= Q(title__icontains='ssp') | Q(source_name__icontains='ssp') | Q(applicable_state__iexact='Karnataka')
            if 'nsp' in search_lower:
                q_filter |= Q(title__icontains='nsp') | Q(source_name__icontains='nsp') | Q(official_application_url__icontains='scholarships.gov.in')
            if 'mahadbt' in search_lower:
                q_filter |= Q(title__icontains='mahadbt') | Q(source_name__icontains='mahadbt') | Q(applicable_state__iexact='Maharashtra')

            qs = qs.filter(q_filter)

        # State filter
        state = params.get('state')
        if state and state != 'All':
            qs = qs.filter(
                Q(applicable_state__iexact=state) |
                Q(applicable_state='All India') |
                Q(eligible_states__icontains=state)
            )

        # Opportunity Type filter
        opp_type = params.get('type')
        if opp_type and opp_type != 'ALL':
            qs = qs.filter(opportunity_type=opp_type)

        # Government Level
        gov_level = params.get('gov_level')
        if gov_level and gov_level != 'ALL':
            qs = qs.filter(government_level=gov_level)

        # Verification Status filter (Admin filter)
        v_status = params.get('verification_status')
        if v_status and v_status != 'ALL':
            qs = qs.filter(verification_status=v_status)

        # Education Level
        edu = params.get('education_level')
        if edu and edu != 'ALL':
            qs = qs.filter(Q(education_levels__icontains=edu) | Q(education_levels__icontains='ALL'))

        # Category
        cat = params.get('category')
        if cat and cat != 'ALL':
            qs = qs.filter(Q(eligible_categories__icontains=cat) | Q(eligible_categories__icontains='ALL'))

        # Gender
        gender = params.get('gender')
        if gender and gender != 'ALL':
            qs = qs.filter(Q(eligible_genders__icontains=gender) | Q(eligible_genders__icontains='ALL'))

        # Disability
        is_pwd = params.get('disability')
        if is_pwd == 'true':
            qs = qs.filter(disability_eligible_only=True)

        # Sorting
        sort = params.get('sort', 'default')
        if sort == 'deadline':
            qs = qs.order_by('application_closing_date')
        elif sort == 'benefit':
            qs = qs.order_by('-benefit_amount')
        elif sort == 'recent':
            qs = qs.order_by('-created_at')
        else:
            qs = qs.order_by('-is_featured', 'application_closing_date', '-created_at')

        return qs


# ==============================================================================
# Feature 6: Government Benefit Calculator API View
# ==============================================================================
class CalculateBenefitView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        opp_ids = request.data.get('opportunity_ids') or [request.data.get('opportunity_id')]
        opp_ids = [i for i in opp_ids if i]

        if not opp_ids:
            return Response({'error': 'Please provide opportunity_id or opportunity_ids.'}, status=status.HTTP_400_BAD_REQUEST)

        education_level = request.data.get('education_level', 'UNDERGRADUATE')
        is_hosteller = request.data.get('is_hosteller', False)
        course_years = int(request.data.get('course_years', 3))
        annual_income = request.data.get('annual_income')

        results = []
        for oid in opp_ids:
            try:
                opp = Opportunity.objects.get(id=oid)
                calc = GovernmentBenefitCalculator.calculate_benefit(
                    opportunity=opp,
                    education_level=education_level,
                    is_hosteller=is_hosteller,
                    course_years=course_years,
                    annual_income=annual_income
                )
                results.append(calc)
            except Opportunity.DoesNotExist:
                continue

        if not results:
            return Response({'error': 'No matching opportunities found.'}, status=status.HTTP_404_NOT_FOUND)

        if len(results) == 1:
            return Response(results[0], status=status.HTTP_200_OK)
        return Response({'comparisons': results}, status=status.HTTP_200_OK)


class FeaturedOpportunitiesView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OpportunityListSerializer

    def get_queryset(self):
        return Opportunity.objects.filter(is_featured=True, is_draft=False)[:6]

class ClosingSoonOpportunitiesView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OpportunityListSerializer

    def get_queryset(self):
        today = date.today()
        upcoming = today + timedelta(days=30)
        return Opportunity.objects.filter(
            is_draft=False,
            application_closing_date__gte=today,
            application_closing_date__lte=upcoming
        ).order_by('application_closing_date')[:6]

class RecentOpportunitiesView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OpportunityListSerializer

    def get_queryset(self):
        return Opportunity.objects.filter(is_draft=False).order_by('-created_at')[:6]

class SourceListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OpportunitySourceSerializer
    queryset = OpportunitySource.objects.filter(is_active=True)
