from decimal import Decimal
from apps.opportunities.models import Opportunity, BenefitFrequency

class GovernmentBenefitCalculator:
    """
    Deterministic rule-based calculator for Indian Government Scholarships & Citizen Benefits.
    Calculates tuition fee support, monthly maintenance stipends, one-time grants,
    and multi-year financial estimates based on official published scheme rules.
    """

    @classmethod
    def calculate_benefit(cls, opportunity, education_level='UNDERGRADUATE', is_hosteller=False, course_years=3, annual_income=None):
        base_amt = Decimal(str(opportunity.benefit_amount or 20000.00))
        freq = opportunity.benefit_frequency

        # Technical/Medical vs General stream adjustments
        title_lower = (opportunity.title + " " + opportunity.short_description).lower()
        is_technical = any(k in title_lower for k in ['technical', 'engineering', 'b.tech', 'polytechnic', 'diploma', 'medical', 'mbbs'])
        is_girl_scheme = any(k in title_lower for k in ['pragati', 'girl', 'kanya', 'ladli'])

        # Monthly maintenance allowance calculation based on GoI Post-Matric standards
        if is_hosteller:
            monthly_stipend = Decimal('1200.00') if is_technical else Decimal('750.00')
        else:
            monthly_stipend = Decimal('550.00') if is_technical else Decimal('380.00')

        annual_maintenance = monthly_stipend * Decimal('10') # 10 academic months per year

        # Book and contingency grant
        book_grant = Decimal('5000.00') if is_technical else Decimal('2000.00')

        # Compute total annual estimate
        if freq == BenefitFrequency.ANNUALLY:
            annual_total = base_amt
            multi_year_total = annual_total * Decimal(str(course_years))
        elif freq == BenefitFrequency.MONTHLY:
            annual_total = base_amt * Decimal('12')
            multi_year_total = annual_total * Decimal(str(course_years))
        elif freq == BenefitFrequency.ONE_TIME:
            annual_total = base_amt
            multi_year_total = base_amt
        elif freq == BenefitFrequency.COURSE_DURATION:
            annual_total = base_amt / Decimal(str(max(1, course_years)))
            multi_year_total = base_amt
        else:
            annual_total = base_amt
            multi_year_total = annual_total * Decimal(str(course_years))

        # Check income threshold compliance
        income_eligible = True
        income_note = "Income criteria met or not restricted."
        if annual_income and opportunity.max_annual_income:
            user_inc = Decimal(str(annual_income))
            if user_inc > opportunity.max_annual_income:
                income_eligible = False
                income_note = f"Your declared income (₹{user_inc:,.2f}) exceeds the maximum scheme ceiling of ₹{opportunity.max_annual_income:,.2f}."
            else:
                income_note = f"Your declared income (₹{user_inc:,.2f}) is within the scheme ceiling of ₹{opportunity.max_annual_income:,.2f}."

        breakdown = [
            {
                'component': 'Base Scholarship / Fee Support',
                'amount': f"₹{base_amt:,.2f}",
                'frequency': opportunity.get_benefit_frequency_display(),
                'type': 'Direct Benefit Transfer (DBT)'
            },
            {
                'component': f"Maintenance Allowance ({'Hosteller' if is_hosteller else 'Day Scholar'})",
                'amount': f"₹{monthly_stipend:,.2f} / month",
                'frequency': '10 academic months/year (₹' + f"{annual_maintenance:,.2f}/yr)",
                'type': 'Recurring Living Stipend'
            },
            {
                'component': 'Book & Equipment Contingency',
                'amount': f"₹{book_grant:,.2f}",
                'frequency': 'Annual Reimbursement',
                'type': 'Study Material Grant'
            }
        ]

        conditions = [
            f"Maximum family income ceiling: ₹{opportunity.max_annual_income:,.2f}" if opportunity.max_annual_income else "No strict family income limit.",
            f"Minimum academic cutoff required: {opportunity.min_academic_percentage}%" if opportunity.min_academic_percentage else "Satisfactory passing grade in qualifying exam.",
            "Student must not be holding any other concurrent central government scholarship.",
            "Payment credited exclusively through DBT into Aadhaar-seeded NPCI bank account.",
            f"Official scheme source: {opportunity.provider} ({opportunity.source_name})."
        ]

        return {
            'opportunity_id': opportunity.id,
            'opportunity_title': opportunity.title,
            'provider': opportunity.provider,
            'official_url': opportunity.official_application_url,
            'frequency': opportunity.get_benefit_frequency_display(),
            'is_hosteller': is_hosteller,
            'course_years': course_years,
            'estimated_annual_benefit': float(annual_total),
            'estimated_monthly_stipend': float(monthly_stipend),
            'estimated_multi_year_total': float(multi_year_total),
            'formatted_annual': f"₹{annual_total:,.2f}",
            'formatted_multi_year': f"₹{multi_year_total:,.2f}",
            'income_eligible': income_eligible,
            'income_evaluation': income_note,
            'breakdown_items': breakdown,
            'financial_conditions': conditions,
            'restriction_notice': 'Government Anti-Duplication Rule: Under Ministry guidelines, a candidate may benefit from only ONE central government scholarship simultaneously. However, fee concessions by state universities can be availed concurrently where explicitly permitted.'
        }

