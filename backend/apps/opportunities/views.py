from datetime import date, timedelta
from django.db.models import Q
from rest_framework import viewsets, permissions, views, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.opportunities.models import (
    Opportunity, OpportunitySource, ApplicationStatus, VerificationStatus,
    ScholarshipVisit, OpportunityDeadlineHistory, OpportunityAuditLog
)
from apps.opportunities.serializers import (
    OpportunityListSerializer, OpportunityDetailSerializer, OpportunitySourceSerializer,
    ScholarshipVisitSerializer, OpportunityDeadlineHistorySerializer, OpportunityAuditLogSerializer
)

class OpportunityViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return OpportunityDetailSerializer
        return OpportunityListSerializer

    def perform_create(self, serializer):
        opp = serializer.save(verification_status=VerificationStatus.OFFICIAL_VERIFIED)
        if self.request.user.is_authenticated:
            OpportunityAuditLog.objects.create(
                admin_user=self.request.user,
                opportunity=opp,
                action=__import__('apps.opportunities.models', fromlist=['AuditLogAction']).AuditLogAction.CREATE,
                change_summary=f"Created via Admin Portal: {opp.title}"
            )


    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Track visit if user is authenticated
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
        """Returns the list of opportunities viewed by the current user."""
        visits = ScholarshipVisit.objects.filter(user=request.user).select_related('opportunity').order_by('-last_viewed_at')
        page = self.paginate_queryset(visits)
        if page is not None:
            serializer = ScholarshipVisitSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ScholarshipVisitSerializer(visits, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def deadlines(self, request, id=None):
        """Returns verified deadline changes history for this opportunity."""
        opportunity = self.get_object()
        history = OpportunityDeadlineHistory.objects.filter(opportunity=opportunity).order_by('-detected_at')
        serializer = OpportunityDeadlineHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def audit_logs(self, request, id=None):
        """Returns admin audit logs for this opportunity."""
        opportunity = self.get_object()
        logs = OpportunityAuditLog.objects.filter(opportunity=opportunity).order_by('-timestamp')
        serializer = OpportunityAuditLogSerializer(logs, many=True)
        return Response(serializer.data)


    def get_queryset(self):
        qs = Opportunity.objects.all()
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
            # Portal alias mapping
            if 'ssp' in search_lower:
                q_filter |= Q(title__icontains='ssp') | Q(source_name__icontains='ssp') | Q(official_application_url__icontains='ssp') | Q(applicable_state__iexact='Karnataka')
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

class FeaturedOpportunitiesView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OpportunityListSerializer

    def get_queryset(self):
        return Opportunity.objects.filter(is_featured=True)[:6]

class ClosingSoonOpportunitiesView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OpportunityListSerializer

    def get_queryset(self):
        today = date.today()
        upcoming = today + timedelta(days=30)
        return Opportunity.objects.filter(
            application_closing_date__gte=today,
            application_closing_date__lte=upcoming
        ).order_by('application_closing_date')[:6]

class RecentOpportunitiesView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OpportunityListSerializer

    def get_queryset(self):
        return Opportunity.objects.order_by('-created_at')[:6]

class SourceListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OpportunitySourceSerializer
    queryset = OpportunitySource.objects.filter(is_active=True)
