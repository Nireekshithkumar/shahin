"""
Deterministic Eligibility Matching Engine for ScholarSetu AI.
Evaluates official opportunity rules against user profile data without LLM hallucination.
"""
from decimal import Decimal
from typing import Dict, Any, List, Tuple
from apps.opportunities.models import Opportunity
from apps.profiles.models import UserProfile, GenderChoices, EducationLevel, CategoryChoices
from apps.eligibility.models import EligibilityResultStatus

class EligibilityEngine:
    """
    Evaluates applicant profile attributes against deterministic scholarship and scheme criteria.
    Returns matched conditions, failed mandatory criteria, missing profile data, and actionable next steps.
    """

    @classmethod
    def evaluate(cls, opportunity: Opportunity, profile: UserProfile = None, custom_input: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Evaluate opportunity eligibility.
        profile: UserProfile model instance
        custom_input: Optional dictionary override for anonymous evaluations or workflow executions
        """
        data = {}
        if profile:
            data = {
                'full_name': profile.full_name,
                'age': profile.age,
                'gender': profile.gender,
                'state_or_ut': profile.state_or_ut,
                'domicile_state': profile.domicile_state or profile.state_or_ut,
                'education_level': profile.current_education_level,
                'course_name': profile.course_name,
                'course_stream': profile.course_stream,
                'academic_percentage': profile.academic_percentage,
                'cgpa': profile.cgpa,
                'annual_family_income': profile.annual_family_income,
                'income_certificate_available': profile.income_certificate_available,
                'category': profile.category,
                'caste_certificate_available': profile.caste_certificate_available,
                'is_minority': profile.is_minority,
                'is_disabled': profile.is_disabled,
                'disability_percentage': profile.disability_percentage,
                'disability_certificate_available': profile.disability_certificate_available,
                'single_girl_child': profile.single_girl_child,
                'employment_status': profile.employment_status,
                'is_rural': profile.is_rural,
            }
        
        if custom_input:
            data.update(custom_input)

        matched: List[str] = []
        failed: List[str] = []
        unconfirmed: List[str] = []
        missing: List[str] = []
        next_actions: List[str] = []

        # 1. State / Domicile check
        cls._check_state(opportunity, data, matched, failed, unconfirmed, missing, next_actions)

        # 2. Education Level check
        cls._check_education_level(opportunity, data, matched, failed, unconfirmed, missing, next_actions)

        # 3. Annual Family Income check
        cls._check_income(opportunity, data, matched, failed, unconfirmed, missing, next_actions)

        # 4. Academic Marks / Percentage check
        cls._check_academics(opportunity, data, matched, failed, unconfirmed, missing, next_actions)

        # 5. Gender check
        cls._check_gender(opportunity, data, matched, failed, unconfirmed, missing, next_actions)

        # 6. Category / Reservation check
        cls._check_category(opportunity, data, matched, failed, unconfirmed, missing, next_actions)

        # 7. Disability criteria check
        cls._check_disability(opportunity, data, matched, failed, unconfirmed, missing, next_actions)

        # 8. Minority criteria check
        cls._check_minority(opportunity, data, matched, failed, unconfirmed, missing, next_actions)

        # 9. Age check
        cls._check_age(opportunity, data, matched, failed, unconfirmed, missing, next_actions)

        # 10. Required documents verification check
        cls._check_documents(opportunity, data, matched, unconfirmed, next_actions)

        # Determine Final Status
        total_checks = len(matched) + len(failed) + len(unconfirmed) + len(missing)
        if total_checks == 0:
            total_checks = 1

        if len(failed) > 0:
            status = EligibilityResultStatus.INELIGIBLE
            confidence = Decimal('100.00')
        elif len(missing) >= 3 and len(matched) == 0:
            status = EligibilityResultStatus.INSUFFICIENT_INFORMATION
            confidence = Decimal('25.00')
        elif len(unconfirmed) > 0 or len(missing) > 0:
            status = EligibilityResultStatus.POTENTIALLY_ELIGIBLE
            # Confidence proportion of matched checks
            score = (len(matched) / (len(matched) + len(unconfirmed) + len(missing))) * 100
            confidence = Decimal(f"{score:.2f}")
        else:
            status = EligibilityResultStatus.ELIGIBLE
            confidence = Decimal('100.00')

        # Formulate structured explanation
        explanation = cls._generate_explanation(opportunity, status, matched, failed, unconfirmed, missing)

        return {
            'status': status,
            'confidence_score': float(confidence),
            'matched_conditions': matched,
            'failed_conditions': failed,
            'unconfirmed_conditions': unconfirmed,
            'missing_profile_fields': missing,
            'explanation': explanation,
            'next_actions': next_actions,
            'opportunity_id': opportunity.id,
            'opportunity_title': opportunity.title,
            'provider': opportunity.provider,
            'official_url': opportunity.official_application_url or opportunity.official_information_url,
            'last_verified_date': str(opportunity.last_verified_date or opportunity.source_verification_date or 'Recently verified')
        }

    @staticmethod
    def _check_state(opp: Opportunity, data: dict, matched: list, failed: list, unconfirmed: list, missing: list, next_actions: list):
        app_state = opp.applicable_state
        eligible_states = opp.eligible_states or []
        user_state = data.get('state_or_ut')
        domicile = data.get('domicile_state') or user_state

        if not app_state or app_state.lower() in ['all india', 'nationwide', 'central']:
            matched.append("Nationwide opportunity: Open to eligible residents across all Indian States and Union Territories.")
            return

        if not user_state:
            missing.append("State or UT of residence")
            unconfirmed.append(f"Residency requirement: Scheme is applicable to {app_state}.")
            next_actions.append(f"Add your State of residence in profile to verify domicile for {app_state}.")
            return

        state_matches = (
            user_state.lower() == app_state.lower() or
            (domicile and domicile.lower() == app_state.lower()) or
            any(user_state.lower() == s.lower() for s in eligible_states)
        )

        if state_matches:
            matched.append(f"State eligibility confirmed: You reside in or hold domicile of {user_state}, matching {app_state}.")
        else:
            failed.append(f"State mismatch: Scheme is restricted to {app_state}, but your profile indicates {user_state}.")

    @staticmethod
    def _check_education_level(opp: Opportunity, data: dict, matched: list, failed: list, unconfirmed: list, missing: list, next_actions: list):
        opp_levels = opp.education_levels or []
        if not opp_levels or 'ALL' in [str(x).upper() for x in opp_levels]:
            matched.append("Education level: Applicable across all academic levels.")
            return

        user_level = data.get('education_level')
        if not user_level:
            missing.append("Current Education Level")
            unconfirmed.append(f"Education level requirement: Applicable for {', '.join(opp_levels)}.")
            next_actions.append("Select your current education level in your profile.")
            return

        # Normalized mapping
        opp_levels_norm = [str(x).upper() for x in opp_levels]
        if user_level.upper() in opp_levels_norm:
            matched.append(f"Education level matches: Current level ({user_level}) is eligible.")
        else:
            failed.append(f"Education level ineligible: Requires {', '.join(opp_levels)}, but current level is {user_level}.")

    @staticmethod
    def _check_income(opp: Opportunity, data: dict, matched: list, failed: list, unconfirmed: list, missing: list, next_actions: list):
        max_income = opp.max_annual_income
        if max_income is None or max_income <= 0:
            return  # No income ceiling

        user_income = data.get('annual_family_income')
        has_cert = data.get('income_certificate_available', False)

        if user_income is None or str(user_income).strip() == '':
            missing.append("Annual Family Income")
            unconfirmed.append(f"Income ceiling requirement: Annual family income must not exceed ₹{int(max_income):,}.")
            next_actions.append(f"Enter your family's annual income to confirm limit below ₹{int(max_income):,}.")
            return

        try:
            val = Decimal(str(user_income))
            limit = Decimal(str(max_income))
            if val <= limit:
                if has_cert:
                    matched.append(f"Income requirement verified: Family income ₹{int(val):,} is within ₹{int(limit):,} ceiling, with certificate available.")
                else:
                    matched.append(f"Income within ceiling: ₹{int(val):,} is under ₹{int(limit):,}.")
                    unconfirmed.append("Official income certificate needs to be verified/produced.")
                    next_actions.append("Ensure your Competent Authority Income Certificate is updated.")
            else:
                failed.append(f"Income limit exceeded: Annual family income ₹{int(val):,} exceeds maximum cap of ₹{int(limit):,}.")
        except Exception:
            unconfirmed.append("Unable to parse annual income format.")

    @staticmethod
    def _check_academics(opp: Opportunity, data: dict, matched: list, failed: list, unconfirmed: list, missing: list, next_actions: list):
        min_pct = opp.min_academic_percentage
        if min_pct is None or min_pct <= 0:
            return

        user_pct = data.get('academic_percentage')
        if user_pct is None or str(user_pct).strip() == '':
            missing.append("Academic Percentage / Marks")
            unconfirmed.append(f"Academic requirement: Minimum {min_pct}% required in previous examination.")
            next_actions.append(f"Provide your latest examination percentage to verify minimum {min_pct}% requirement.")
            return

        try:
            val = Decimal(str(user_pct))
            limit = Decimal(str(min_pct))
            if val >= limit:
                matched.append(f"Academic merit confirmed: Your score ({val}%) meets the minimum requirement ({limit}%).")
            else:
                failed.append(f"Academic cutoff not met: Your score ({val}%) is below the minimum required ({limit}%).")
        except Exception:
            unconfirmed.append("Unable to parse academic percentage.")

    @staticmethod
    def _check_gender(opp: Opportunity, data: dict, matched: list, failed: list, unconfirmed: list, missing: list, next_actions: list):
        genders = opp.eligible_genders or []
        if not genders or 'ALL' in [str(g).upper() for g in genders]:
            return

        user_gender = data.get('gender')
        if not user_gender or user_gender == GenderChoices.PREFER_NOT_TO_SAY:
            unconfirmed.append(f"Gender requirement: Opportunity is restricted to {', '.join(genders)}.")
            missing.append("Gender")
            next_actions.append("Specify gender in profile if applying for gender-targeted schemes.")
            return

        norm_genders = [str(g).upper() for g in genders]
        if user_gender.upper() in norm_genders:
            matched.append(f"Gender eligibility confirmed: {user_gender} applicants are eligible.")
        else:
            failed.append(f"Gender criteria not met: Restricted to {', '.join(genders)}, but profile indicates {user_gender}.")

    @staticmethod
    def _check_category(opp: Opportunity, data: dict, matched: list, failed: list, unconfirmed: list, missing: list, next_actions: list):
        cats = opp.eligible_categories or []
        if not cats or 'ALL' in [str(c).upper() for c in cats]:
            return

        user_cat = data.get('category')
        if not user_cat:
            missing.append("Social Category")
            unconfirmed.append(f"Social Category requirement: Open to {', '.join(cats)}.")
            next_actions.append("Select your category in profile.")
            return

        norm_cats = [str(c).upper() for c in cats]
        if user_cat.upper() in norm_cats:
            cert = data.get('caste_certificate_available', False)
            if cert or user_cat.upper() == 'GENERAL':
                matched.append(f"Category eligibility verified: {user_cat} is eligible.")
            else:
                matched.append(f"Category matches: {user_cat} is eligible.")
                unconfirmed.append(f"Valid {user_cat} caste certificate needs to be verified.")
                next_actions.append(f"Keep a valid {user_cat} category certificate ready.")
        else:
            failed.append(f"Category criteria not met: Restricted to {', '.join(cats)}, but profile category is {user_cat}.")

    @staticmethod
    def _check_disability(opp: Opportunity, data: dict, matched: list, failed: list, unconfirmed: list, missing: list, next_actions: list):
        if not opp.disability_eligible_only:
            return

        is_disabled = data.get('is_disabled', False)
        min_disability_pct = opp.min_disability_percentage or Decimal('40.0')

        if not is_disabled:
            failed.append(f"Disability criteria: Scheme is designated for Persons with Disabilities (PwD >= {min_disability_pct}%).")
            return

        user_disability_pct = data.get('disability_percentage')
        if user_disability_pct:
            try:
                if Decimal(str(user_disability_pct)) >= min_disability_pct:
                    matched.append(f"PwD requirement satisfied: Certified disability {user_disability_pct}% meets {min_disability_pct}% threshold.")
                else:
                    failed.append(f"PwD benchmark not met: Required disability is >= {min_disability_pct}%, your profile has {user_disability_pct}%.")
            except Exception:
                unconfirmed.append("Disability percentage needs verification.")
        else:
            matched.append("Disability status indicated.")
            unconfirmed.append(f"Requires benchmark disability percentage verification (>= {min_disability_pct}%).")
            next_actions.append("Enter your UDID / Disability certificate percentage in profile.")

    @staticmethod
    def _check_minority(opp: Opportunity, data: dict, matched: list, failed: list, unconfirmed: list, missing: list, next_actions: list):
        if not opp.minority_only:
            return

        is_minority = data.get('is_minority', False)
        if is_minority:
            matched.append("Minority community status verified: Applicant belongs to notified minority community.")
        else:
            failed.append("Minority requirement not met: Scheme is specifically reserved for notified minority communities.")

    @staticmethod
    def _check_age(opp: Opportunity, data: dict, matched: list, failed: list, unconfirmed: list, missing: list, next_actions: list):
        if opp.min_age is None and opp.max_age is None:
            return

        user_age = data.get('age')
        if user_age is None:
            missing.append("Date of Birth / Age")
            age_desc = []
            if opp.min_age: age_desc.append(f"minimum {opp.min_age} years")
            if opp.max_age: age_desc.append(f"maximum {opp.max_age} years")
            unconfirmed.append(f"Age criteria: Requires {' and '.join(age_desc)}.")
            next_actions.append("Add your Date of Birth in profile.")
            return

        if opp.min_age and user_age < opp.min_age:
            failed.append(f"Age below minimum requirement: Must be at least {opp.min_age} years old (current age: {user_age}).")
        elif opp.max_age and user_age > opp.max_age:
            failed.append(f"Age exceeds maximum limit: Must be at most {opp.max_age} years old (current age: {user_age}).")
        else:
            matched.append(f"Age criteria met: Age {user_age} is within eligible bracket.")

    @staticmethod
    def _check_documents(opp: Opportunity, data: dict, matched: list, unconfirmed: list, next_actions: list):
        docs = opp.required_documents or []
        if docs:
            unconfirmed.append(f"Mandatory documentation required at submission: {', '.join(docs[:4])}{'...' if len(docs) > 4 else ''}.")
            next_actions.append(f"Check document requirements: {len(docs)} document(s) must be submitted with official application.")

    @classmethod
    def _generate_explanation(cls, opp: Opportunity, status: str, matched: list, failed: list, unconfirmed: list, missing: list) -> str:
        lines = []
        lines.append(f"Evaluation Result for '{opp.title}': {status.replace('_', ' ').title()}")
        lines.append("")
        if matched:
            lines.append("Matched Criteria:")
            for m in matched:
                lines.append(f"  • {m}")
        if failed:
            lines.append("")
            lines.append("Unmet Mandatory Requirements:")
            for f in failed:
                lines.append(f"  ✕ {f}")
        if unconfirmed:
            lines.append("")
            lines.append("Conditions Requiring Verification:")
            for u in unconfirmed:
                lines.append(f"  ? {u}")
        if missing:
            lines.append("")
            lines.append("Missing Profile Details:")
            for mi in missing:
                lines.append(f"  ⚠ {mi}")

        return "\n".join(lines)
