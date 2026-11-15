from rest_framework import views, permissions, status
from rest_framework.response import Response
from apps.profiles.models import UserProfile
from apps.opportunities.models import Opportunity
from apps.opportunities.serializers import OpportunityListSerializer
from apps.recommendations.engine import RecommendationEngine

class RecommendationsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        is_categorized = request.query_params.get('categorized') == 'true'

        if request.user.is_authenticated:
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            if is_categorized:
                cat_data = RecommendationEngine.get_categorized_recommendations(profile, limit_per_category=15)
                serialized = {
                    'summary': cat_data['summary'],
                    'eligible': [
                        {
                            'opportunity': OpportunityListSerializer(item['opportunity']).data,
                            'composite_score': item['composite_score'],
                            'status': item['status'],
                            'recommendation_reason': item['recommendation_reason'],
                            'missing_information': item['missing_information'],
                            'eligibility': item['eligibility'],
                            'badges': item['badges'],
                        }
                        for item in cat_data['eligible']
                    ],
                    'potentially_eligible': [
                        {
                            'opportunity': OpportunityListSerializer(item['opportunity']).data,
                            'composite_score': item['composite_score'],
                            'status': item['status'],
                            'recommendation_reason': item['recommendation_reason'],
                            'missing_information': item['missing_information'],
                            'eligibility': item['eligibility'],
                            'badges': item['badges'],
                        }
                        for item in cat_data['potentially_eligible']
                    ],
                    'not_eligible': [
                        {
                            'opportunity': OpportunityListSerializer(item['opportunity']).data,
                            'composite_score': item['composite_score'],
                            'status': item['status'],
                            'recommendation_reason': item['recommendation_reason'],
                            'missing_information': item['missing_information'],
                            'eligibility': item['eligibility'],
                            'badges': item['badges'],
                        }
                        for item in cat_data['not_eligible']
                    ],
                }
                return Response(serialized, status=status.HTTP_200_OK)

            recs = RecommendationEngine.get_recommendations(profile, limit=10)
            data = []
            for item in recs:
                opp_data = OpportunityListSerializer(item['opportunity']).data
                data.append({
                    'opportunity': opp_data,
                    'composite_score': item['composite_score'],
                    'factors': item['factors'],
                    'badges': item['badges'],
                    'eligibility': item['eligibility'],
                })
            return Response(data, status=status.HTTP_200_OK)
        else:
            # Featured / Top opportunities for visitors
            featured = Opportunity.objects.filter(is_featured=True)[:6]
            data = [
                {
                    'opportunity': OpportunityListSerializer(opp).data,
                    'composite_score': 85.0,
                    'factors': {'featured': 100},
                    'badges': ['Featured National Scheme', 'Open for Applications'],
                    'eligibility': {'status': 'POTENTIALLY_ELIGIBLE', 'confidence_score': 80.0}
                }
                for opp in featured
            ]
            if is_categorized:
                return Response({
                    'summary': {'eligible_count': 0, 'potentially_eligible_count': len(data), 'not_eligible_count': 0, 'total_evaluated': len(data)},
                    'eligible': [],
                    'potentially_eligible': data,
                    'not_eligible': []
                }, status=status.HTTP_200_OK)
            return Response(data, status=status.HTTP_200_OK)
