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

    @classmethod
    def get_categorized_recommendations(cls, profile: UserProfile, limit_per_category: int = 15) -> Dict[str, Any]:
        """
        Classifies all active opportunities into three categories:
        A. Eligible Schemes
        B. Potentially Eligible Schemes
        C. Not Currently Eligible
        Includes recommendation reasons and missing eligibility information.
        """
        opportunities = Opportunity.objects.exclude(
            application_status__in=[ApplicationStatus.EXPIRED, ApplicationStatus.ARCHIVED, ApplicationStatus.CLOSED]
        )

        categories = {
            'eligible': [],
            'potentially_eligible': [],
            'not_eligible': []
        }

        today = date.today()

        for opp in opportunities:
            eval_res = EligibilityEngine.evaluate(opp, profile=profile)
            status = eval_res['status']

            # Factors
            conf_score = float(eval_res['confidence_score'])
            badges = []

            # Reason for recommendation
            if status == EligibilityResultStatus.ELIGIBLE:
                rec_reason = f"You satisfy all structured criteria for this {opp.applicable_state or 'Central'} program based on your verified education ({profile.current_education_level}) and income limit."
                badges.append("Eligible Opportunity")
            elif status == EligibilityResultStatus.POTENTIALLY_ELIGIBLE:
                missing_str = ", ".join(eval_res.get('missing_profile_fields', [])) or "supporting document validation"
                rec_reason = f"You potentially qualify for this program. Additional information required: {missing_str}."
                badges.append("Potentially Eligible")
            else:
                failed_items = [f.get('condition_name', 'Criteria') for f in eval_res.get('failed_conditions', [])]
                failed_str = ", ".join(failed_items) or "criteria limits"
                rec_reason = f"You do not currently satisfy the specific condition: {failed_str}."
                badges.append("Not Currently Eligible")

            item_data = {
                'opportunity': opp,
                'composite_score': conf_score,
                'status': status,
                'recommendation_reason': rec_reason,
                'missing_information': eval_res.get('missing_profile_fields', []) + [u.get('condition_name') for u in eval_res.get('unconfirmed_conditions', []) if u.get('condition_name')],
                'eligibility': eval_res,
                'badges': badges,
            }

            if status == EligibilityResultStatus.ELIGIBLE:
                categories['eligible'].append(item_data)
            elif status == EligibilityResultStatus.POTENTIALLY_ELIGIBLE:
                categories['potentially_eligible'].append(item_data)
            else:
                categories['not_eligible'].append(item_data)

        # Sort within each category by confidence score
        for k in categories:
            categories[k].sort(key=lambda x: x['composite_score'], reverse=True)
            categories[k] = categories[k][:limit_per_category]

        return {
            'summary': {
                'eligible_count': len(categories['eligible']),
                'potentially_eligible_count': len(categories['potentially_eligible']),
                'not_eligible_count': len(categories['not_eligible']),
                'total_evaluated': len(opportunities)
            },
            'eligible': categories['eligible'],
            'potentially_eligible': categories['potentially_eligible'],
            'not_eligible': categories['not_eligible']
        }
