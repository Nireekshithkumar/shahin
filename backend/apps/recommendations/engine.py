"""
Transparent Recommendation Engine for ScholarSetu AI.
Ranks eligible and potentially eligible opportunities based on multi-factor scores,
without ever inflating ineligible opportunities.
"""
from datetime import date
from decimal import Decimal
from typing import List, Dict, Any
from apps.opportunities.models import Opportunity, ApplicationStatus
from apps.profiles.models import UserProfile
from apps.eligibility.engine import EligibilityEngine
from apps.eligibility.models import EligibilityResultStatus

class RecommendationEngine:
    """
    Ranks opportunities with transparent explanation badges:
    - Eligibility Confidence (40%)
    - Deadline Urgency (20%)
    - Benefit Value (15%)
    - Domicile / State Fit (15%)
    - Education & Stream Alignment (10%)
    """

    @classmethod
    def get_recommendations(cls, profile: UserProfile, limit: int = 10) -> List[Dict[str, Any]]:
        opportunities = Opportunity.objects.exclude(
            application_status__in=[ApplicationStatus.EXPIRED, ApplicationStatus.ARCHIVED, ApplicationStatus.CLOSED]
        )

        ranked_results = []
        today = date.today()

        for opp in opportunities:
            eval_res = EligibilityEngine.evaluate(opp, profile=profile)

            # Strict rule: NEVER recommend Ineligible opportunities as recommended matches!
            if eval_res['status'] == EligibilityResultStatus.INELIGIBLE:
                continue

            # Calculate individual factor scores (0 - 100)
            factors = {}
            badges = []

            # 1. Eligibility Confidence factor (40% weight)
            conf_score = float(eval_res['confidence_score'])
            factors['eligibility'] = conf_score
            if conf_score >= 90:
                badges.append("High Eligibility Match")
            elif conf_score >= 60:
                badges.append("Potentially Eligible")

            # 2. Deadline Urgency factor (20% weight)
            urgency_score = 50.0
            if opp.application_closing_date:
                days_left = (opp.application_closing_date - today).days
                if days_left <= 0:
                    continue  # Already closed
                elif days_left <= 7:
                    urgency_score = 100.0
                    badges.append(f"Closing in {days_left} days!")
                elif days_left <= 15:
                    urgency_score = 85.0
                    badges.append(f"Closing soon ({days_left}d)")
                elif days_left <= 30:
                    urgency_score = 70.0
                else:
                    urgency_score = 50.0
            factors['deadline_urgency'] = urgency_score

            # 3. Benefit Value factor (15% weight)
            benefit_score = 40.0
            if opp.benefit_amount:
                amt = float(opp.benefit_amount)
                if amt >= 100000:
                    benefit_score = 100.0
                    badges.append(f"High Financial Aid (₹{int(amt):,})")
                elif amt >= 50000:
                    benefit_score = 85.0
                    badges.append(f"Substantial Benefit (₹{int(amt):,})")
                elif amt >= 20000:
                    benefit_score = 70.0
                else:
                    benefit_score = 55.0
            factors['benefit_value'] = benefit_score

            # 4. State / Domicile Exactness (15% weight)
            state_score = 60.0
            if opp.applicable_state and profile.state_or_ut and opp.applicable_state.lower() == profile.state_or_ut.lower():
                state_score = 100.0
                badges.append(f"Home State Scheme ({profile.state_or_ut})")
            elif opp.applicable_state and opp.applicable_state.lower() in ['all india', 'central']:
                state_score = 80.0
                badges.append("Central / Nationwide Scheme")
            factors['state_alignment'] = state_score

            # 5. Education & Stream Alignment (10% weight)
            edu_score = 50.0
            if opp.education_levels and profile.current_education_level:
                if profile.current_education_level in opp.education_levels:
                    edu_score = 90.0
                    badges.append("Targeted to Your Degree Level")
            factors['education_alignment'] = edu_score

            # Weighted composite score
            composite_score = (
                (factors['eligibility'] * 0.40) +
                (factors['deadline_urgency'] * 0.20) +
                (factors['benefit_value'] * 0.15) +
                (factors['state_alignment'] * 0.15) +
                (factors['education_alignment'] * 0.10)
            )

            ranked_results.append({
                'opportunity': opp,
                'composite_score': round(composite_score, 1),
                'factors': factors,
                'badges': badges[:3],
                'eligibility': eval_res,
            })

        # Sort strictly by composite score descending
        ranked_results.sort(key=lambda x: x['composite_score'], reverse=True)
        return ranked_results[:limit]
