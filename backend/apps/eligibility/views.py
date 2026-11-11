from rest_framework import views, permissions, status
from rest_framework.response import Response
from apps.opportunities.models import Opportunity
from apps.profiles.models import UserProfile
from apps.eligibility.models import EligibilityEvaluation
from apps.eligibility.engine import EligibilityEngine

class EvaluateEligibilityView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        opp_id = request.data.get('opportunity_id')
        custom_input = request.data.get('custom_input', {})
        
        user_profile = None
        if request.user.is_authenticated:
            user_profile = getattr(request.user, 'profile', None)

        # Single opportunity evaluation
        if opp_id:
            try:
                opportunity = Opportunity.objects.get(id=opp_id)
            except Opportunity.DoesNotExist:
                return Response({'error': 'Opportunity not found.'}, status=status.HTTP_404_NOT_FOUND)

            result = EligibilityEngine.evaluate(opportunity, profile=user_profile, custom_input=custom_input)

            # Persist if user is logged in
            if request.user.is_authenticated:
                EligibilityEvaluation.objects.create(
                    user=request.user,
                    opportunity=opportunity,
                    status=result['status'],
                    confidence_score=result['confidence_score'],
                    matched_conditions=result['matched_conditions'],
                    failed_conditions=result['failed_conditions'],
                    unconfirmed_conditions=result['unconfirmed_conditions'],
                    missing_profile_fields=result['missing_profile_fields'],
                    explanation=result['explanation'],
                    next_actions=result['next_actions']
                )

            return Response(result, status=status.HTTP_200_OK)

        # Batch evaluation across opportunities
        all_opps = Opportunity.objects.all()
        results = []
        for opp in all_opps:
            res = EligibilityEngine.evaluate(opp, profile=user_profile, custom_input=custom_input)
            results.append(res)

        return Response({
            'total_evaluated': len(results),
            'results': results
        }, status=status.HTTP_200_OK)

class EligibilityResultsListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        evals = EligibilityEvaluation.objects.filter(user=request.user).select_related('opportunity')[:20]
        data = [
            {
                'id': e.id,
                'opportunity_id': e.opportunity.id,
                'opportunity_title': e.opportunity.title,
                'provider': e.opportunity.provider,
                'status': e.status,
                'confidence_score': float(e.confidence_score),
                'matched_conditions': e.matched_conditions,
                'failed_conditions': e.failed_conditions,
                'unconfirmed_conditions': e.unconfirmed_conditions,
                'missing_profile_fields': e.missing_profile_fields,
                'explanation': e.explanation,
                'next_actions': e.next_actions,
                'evaluated_at': e.evaluated_at
            }
            for e in evals
        ]
        return Response(data, status=status.HTTP_200_OK)
