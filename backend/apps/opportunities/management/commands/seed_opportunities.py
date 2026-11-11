import os
import json
from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.opportunities.models import (
    Opportunity, OpportunitySource, OpportunityDocumentRequirement,
    OpportunityType, GovernmentLevel, VerificationStatus, ReliabilityStatus,
    ApplicationStatus, BenefitFrequency, ApplicationMethod
)
from apps.workflows.models import EligibilityWorkflow

class Command(BaseCommand):
    help = 'Seeds authentic Indian scholarships, central & state government schemes, official source registry, and workflow templates'

    def handle(self, *args, **options):
        self.stdout.write("Registering Official Indian Sources...")
        sources = [
            {
                'name': 'National Scholarship Portal (NSP)',
                'domain': 'scholarships.gov.in',
                'source_type': 'PORTAL_FEED',
                'records_imported': 142,
                'verification_status': 'VERIFIED'
            },
            {
                'name': 'myScheme Platform (MeitY)',
                'domain': 'myscheme.gov.in',
                'source_type': 'API',
                'records_imported': 310,
                'verification_status': 'VERIFIED'
            },
            {
                'name': 'Ministry of Social Justice and Empowerment',
                'domain': 'socialjustice.gov.in',
                'source_type': 'PUBLISHED_DATASET',
                'records_imported': 85,
                'verification_status': 'VERIFIED'
            },
            {
                'name': 'University Grants Commission (UGC)',
                'domain': 'ugc.gov.in',
                'source_type': 'PORTAL_FEED',
                'records_imported': 45,
                'verification_status': 'VERIFIED'
            },
            {
                'name': 'All India Council for Technical Education (AICTE)',
                'domain': 'aicte-india.org',
                'source_type': 'PORTAL_FEED',
                'records_imported': 38,
                'verification_status': 'VERIFIED'
            },
            {
                'name': 'State Scholarship Portal (SSP) Karnataka',
                'domain': 'ssp.postmatric.karnataka.gov.in',
                'source_type': 'STATE_PORTAL',
                'records_imported': 64,
                'verification_status': 'VERIFIED'
            },
            {
                'name': 'MahaDBT Scholarship Portal Maharashtra',
                'domain': 'mahadbt.maharashtra.gov.in',
                'source_type': 'STATE_PORTAL',
                'records_imported': 72,
                'verification_status': 'VERIFIED'
            },
            {
                'name': 'Uttar Pradesh Scholarship & Fee Reimbursement Portal',
                'domain': 'scholarship.up.gov.in',
                'source_type': 'STATE_PORTAL',
                'records_imported': 80,
                'verification_status': 'VERIFIED'
            },
            {
                'name': 'Tamil Nadu e-Scholarship Portal',
                'domain': 'escholarship.tn.gov.in',
                'source_type': 'STATE_PORTAL',
                'records_imported': 50,
                'verification_status': 'VERIFIED'
            },
            {
                'name': 'West Bengal Oasis / SVMCM Portal',
                'domain': 'svmcm.wbhed.gov.in',
                'source_type': 'STATE_PORTAL',
                'records_imported': 55,
                'verification_status': 'VERIFIED'
            }
        ]

        for s in sources:
            OpportunitySource.objects.update_or_create(
                name=s['name'],
                defaults=s
            )

        self.stdout.write("Seeding genuine Indian Scholarships and Government Schemes...")
        today = date.today()

        opportunities_data = [
            # 1. Central Sector Scheme of Scholarship for College and University Students
            {
                'title': 'Central Sector Scheme of Scholarship for College and University Students (PM-USP)',
                'opportunity_type': OpportunityType.SCHOLARSHIP,
                'short_description': 'Merit-cum-means scholarship by Ministry of Education for undergraduate and postgraduate students scoring above 80th percentile in Class 12 board exams.',
                'detailed_description': 'The Central Sector Scheme of Scholarship for College and University Students is implemented by the Department of Higher Education, Ministry of Education, Government of India. The objective is to provide financial assistance to meritorious students from low-income families to meet day-to-day expenses while pursuing higher studies in colleges and universities.',
                'provider': 'Department of Higher Education, Ministry of Education',
                'government_level': GovernmentLevel.CENTRAL,
                'applicable_state': 'All India',
                'eligible_states': ['All India'],
                'education_levels': ['UNDERGRADUATE', 'POSTGRADUATE'],
                'eligible_courses': ['General Degree (BA, B.Sc, B.Com)', 'Engineering', 'Medical', 'Management', 'Law'],
                'institution_requirements': 'Recognized universities, colleges, and institutions accredited by UGC, AICTE, or Medical Council.',
                'min_academic_percentage': Decimal('80.00'),
                'max_annual_income': Decimal('450000.00'),
                'eligible_genders': ['ALL'],
                'eligible_categories': ['ALL'],
                'required_documents': ['Class 12 Marksheet', 'Income Certificate', 'Aadhaar Card', 'Bank Passbook linked with Aadhaar', 'College Admission Proof / Fee Receipt'],
                'benefit_amount': Decimal('12000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '₹12,000 per annum for the first three years of undergraduate study; ₹20,000 per annum at postgraduate level.',
                'application_opening_date': today - timedelta(days=30),
                'application_closing_date': today + timedelta(days=45),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.NSP,
                'official_application_url': 'https://scholarships.gov.in',
                'official_information_url': 'https://www.education.gov.in/higher_education',
                'source_name': 'National Scholarship Portal (NSP)',
                'source_organization': 'Ministry of Education, GoI',
                'source_verification_date': today - timedelta(days=15),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': True
            },

            # 2. AICTE Pragati Scholarship for Girl Students (Technical Degree/Diploma)
            {
                'title': 'AICTE Pragati Scholarship Scheme for Girl Students',
                'opportunity_type': OpportunityType.SCHOLARSHIP,
                'short_description': 'Empowering girl students pursuing technical education (B.Tech / BE or Diploma) in AICTE-approved institutions with financial support of ₹50,000/year.',
                'detailed_description': 'Pragati is a MHRD (now Ministry of Education) scheme being implemented by AICTE aimed at providing assistance for Advancement of Girls pursuing Technical Education. Maximum two girls per family are eligible. Selection is made based on merit in qualifying examination.',
                'provider': 'All India Council for Technical Education (AICTE)',
                'government_level': GovernmentLevel.CENTRAL,
                'applicable_state': 'All India',
                'eligible_states': ['All India'],
                'education_levels': ['UNDERGRADUATE', 'DIPLOMA'],
                'eligible_courses': ['Engineering / Technology (B.Tech / B.E.)', 'Diploma in Engineering'],
                'institution_requirements': 'First-year admission in AICTE-approved technical institution.',
                'max_annual_income': Decimal('800000.00'),
                'eligible_genders': ['FEMALE'],
                'eligible_categories': ['ALL'],
                'required_documents': ['10th and 12th/Diploma Marksheets', 'Annual Family Income Certificate issued by Tehsildar', 'Tuition Fee Receipt', 'Aadhaar Card', 'Parent Affidavit declaring only two girl children in family'],
                'benefit_amount': Decimal('50000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '₹50,000 per annum towards payment of college fees, purchase of books, equipment, computer/laptop and software.',
                'application_opening_date': today - timedelta(days=20),
                'application_closing_date': today + timedelta(days=25),
                'application_status': ApplicationStatus.CLOSING_SOON,
                'application_method': ApplicationMethod.NSP,
                'official_application_url': 'https://scholarships.gov.in',
                'official_information_url': 'https://www.aicte-india.org/schemes/students-development-schemes/Pragati',
                'source_name': 'AICTE Portal',
                'source_organization': 'All India Council for Technical Education',
                'source_verification_date': today - timedelta(days=10),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': True
            },

            # 3. Post-Matric Scholarship for SC Students (Central Scheme)
            {
                'title': 'Post-Matric Scholarship for Scheduled Caste (SC) Students',
                'opportunity_type': OpportunityType.SCHOLARSHIP,
                'short_description': 'Centrally sponsored scholarship scheme providing complete tuition fee reimbursement and monthly maintenance allowances for SC students in post-matric studies.',
                'detailed_description': 'The objective of the scheme is to appreciably increase the Gross Enrolment Ratio of SC students in higher education with a focus on those from the poorest households. Administered by Ministry of Social Justice and Empowerment, covering non-refundable fees and academic allowances.',
                'provider': 'Ministry of Social Justice and Empowerment',
                'government_level': GovernmentLevel.CENTRAL,
                'applicable_state': 'All India',
                'eligible_states': ['All India'],
                'education_levels': ['CLASS_11_12', 'DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE', 'PHD_RESEARCH', 'ITI_VOCATIONAL'],
                'eligible_courses': ['All Recognized Post-Matric Courses'],
                'institution_requirements': 'All Government and recognized private institutions.',
                'max_annual_income': Decimal('250000.00'),
                'eligible_genders': ['ALL'],
                'eligible_categories': ['SC'],
                'required_documents': ['Caste Certificate issued by Competent Authority', 'Income Certificate', 'Previous Marksheets', 'College Bonafide Certificate', 'Aadhaar Card', 'Bank Account details (Aadhaar Seeded)'],
                'benefit_amount': Decimal('35000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '100% compulsory non-refundable fees reimbursement directly to institution + Monthly academic maintenance allowance of up to ₹13,500/year via DBT.',
                'application_opening_date': today - timedelta(days=40),
                'application_closing_date': today + timedelta(days=50),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.NSP,
                'official_application_url': 'https://scholarships.gov.in',
                'official_information_url': 'https://socialjustice.gov.in/schemes/30',
                'source_name': 'National Scholarship Portal (NSP)',
                'source_organization': 'Ministry of Social Justice and Empowerment, GoI',
                'source_verification_date': today - timedelta(days=5),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': True
            },

            # 4. Post-Matric Scholarship for ST Students
            {
                'title': 'National Fellowship and Post-Matric Scholarship for ST Students',
                'opportunity_type': OpportunityType.SCHOLARSHIP,
                'short_description': 'Financial support for Scheduled Tribe (ST) students pursuing post-matriculation courses across India to enable completion of their education.',
                'detailed_description': 'Implemented by the Ministry of Tribal Affairs, this scheme provides financial assistance to Scheduled Tribe students studying at post-matriculation or post-secondary stage in recognized educational institutions across all Indian states.',
                'provider': 'Ministry of Tribal Affairs',
                'government_level': GovernmentLevel.CENTRAL,
                'applicable_state': 'All India',
                'eligible_states': ['All India'],
                'education_levels': ['CLASS_11_12', 'DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE', 'PHD_RESEARCH'],
                'eligible_courses': ['All Recognized Academic and Professional Courses'],
                'max_annual_income': Decimal('250000.00'),
                'eligible_genders': ['ALL'],
                'eligible_categories': ['ST'],
                'required_documents': ['Tribe/Caste Certificate', 'Income Certificate', 'Marksheets', 'Aadhaar Card', 'Fee Receipt'],
                'benefit_amount': Decimal('30000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': 'Full reimbursement of tuition fees and mandatory charges plus living stipend.',
                'application_opening_date': today - timedelta(days=35),
                'application_closing_date': today + timedelta(days=60),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.NSP,
                'official_application_url': 'https://scholarships.gov.in',
                'official_information_url': 'https://tribal.nic.in/ScholarshiP.aspx',
                'source_name': 'Ministry of Tribal Affairs',
                'source_organization': 'Government of India',
                'source_verification_date': today - timedelta(days=8),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': False
            },

            # 5. AICTE Saksham Scholarship Scheme for Specially Abled (PwD) Students
            {
                'title': 'AICTE Saksham Scholarship Scheme for Specially Abled Students',
                'opportunity_type': OpportunityType.DISABILITY_BENEFIT,
                'short_description': 'Dedicated assistance for specially-abled students with >= 40% disability pursuing technical degree or diploma courses.',
                'detailed_description': 'Saksham is a Scheme being implemented by AICTE aimed at providing encouragement and support to specially abled children to pursue Technical Education. Students admitted in AICTE approved institutions with disability not less than 40% are eligible.',
                'provider': 'All India Council for Technical Education (AICTE)',
                'government_level': GovernmentLevel.CENTRAL,
                'applicable_state': 'All India',
                'eligible_states': ['All India'],
                'education_levels': ['UNDERGRADUATE', 'DIPLOMA'],
                'eligible_courses': ['Degree / Diploma in Technical Courses'],
                'max_annual_income': Decimal('800000.00'),
                'eligible_genders': ['ALL'],
                'eligible_categories': ['ALL'],
                'disability_eligible_only': True,
                'min_disability_percentage': Decimal('40.00'),
                'required_documents': ['UDID Card / Disability Certificate issued by Competent Medical Board', 'Family Income Certificate', 'Admission Proof', 'Fee Receipt', 'Aadhaar Card'],
                'benefit_amount': Decimal('50000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '₹50,000 per annum towards payment of college fees, assistive devices, books, and study material.',
                'application_opening_date': today - timedelta(days=25),
                'application_closing_date': today + timedelta(days=30),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.NSP,
                'official_application_url': 'https://scholarships.gov.in',
                'official_information_url': 'https://www.aicte-india.org/schemes/students-development-schemes/Saksham',
                'source_name': 'AICTE Portal',
                'source_organization': 'AICTE',
                'source_verification_date': today - timedelta(days=7),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': False
            },

            # 6. PM-YASASVI Central Sector Scheme for OBC, EBC and DNT Students
            {
                'title': 'PM Young Achievers Scholarship Award Scheme for Vibrant India (PM-YASASVI)',
                'opportunity_type': OpportunityType.SCHOLARSHIP,
                'short_description': 'Prestigious scholarship for meritorious OBC, EBC, and DNT students studying in Top Class Schools and Colleges across India.',
                'detailed_description': 'The PM-YASASVI umbrella scheme by Ministry of Social Justice and Empowerment offers pre-matric, post-matric, and top-class education scholarships for students belonging to Other Backward Classes (OBC), Economically Backward Classes (EBC), and De-notified Nomadic Tribes (DNT).',
                'provider': 'Ministry of Social Justice and Empowerment',
                'government_level': GovernmentLevel.CENTRAL,
                'applicable_state': 'All India',
                'eligible_states': ['All India'],
                'education_levels': ['CLASS_1_10', 'CLASS_11_12', 'UNDERGRADUATE'],
                'eligible_courses': ['School Education', 'Top Class College Degree Programs'],
                'max_annual_income': Decimal('250000.00'),
                'eligible_genders': ['ALL'],
                'eligible_categories': ['OBC', 'EWS', 'DNT'],
                'required_documents': ['OBC/EBC/DNT Certificate', 'Income Certificate', 'Academic Marksheet', 'Aadhaar Card'],
                'benefit_amount': Decimal('75000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': 'Up to ₹75,000 per year for Class 9-10; up to ₹1,25,000 per year for Class 11-12; full tuition reimbursement for top-tier college institutions.',
                'application_opening_date': today - timedelta(days=15),
                'application_closing_date': today + timedelta(days=20),
                'application_status': ApplicationStatus.CLOSING_SOON,
                'application_method': ApplicationMethod.NSP,
                'official_application_url': 'https://scholarships.gov.in',
                'official_information_url': 'https://socialjustice.gov.in/schemes/pm-yasasvi',
                'source_name': 'National Scholarship Portal',
                'source_organization': 'Government of India',
                'source_verification_date': today - timedelta(days=4),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': True
            },

            # 7. Karnataka Vidyasiri - Food & Accommodation Scheme
            {
                'title': 'Karnataka Vidyasiri - Epass Food & Accommodation Scheme',
                'opportunity_type': OpportunityType.STIPEND,
                'short_description': 'Karnataka state financial assistance of ₹1,500/month for post-matric students belonging to backward classes without government hostel seats.',
                'detailed_description': 'Implemented by the Department of Backward Classes Welfare, Government of Karnataka. Provides monthly stipend for food and accommodation to eligible OBC students who are pursuing post-matric courses and did not get admission into departmental hostels.',
                'provider': 'Backward Classes Welfare Department, Government of Karnataka',
                'government_level': GovernmentLevel.STATE,
                'applicable_state': 'Karnataka',
                'eligible_states': ['Karnataka'],
                'education_levels': ['DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE', 'ITI_VOCATIONAL'],
                'eligible_courses': ['All Post-Matric Recognized Courses'],
                'min_academic_percentage': Decimal('50.00'),
                'max_annual_income': Decimal('250000.00'),
                'eligible_genders': ['ALL'],
                'eligible_categories': ['OBC', 'SC', 'ST'],
                'required_documents': ['Karnataka Domicile / Ration Card', 'RD Number Income & Caste Certificate', 'College Bonafide', 'Aadhaar Linked Bank Account'],
                'benefit_amount': Decimal('15000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '₹1,500 per month for 10 months (₹15,000 per academic year) directly credited to student bank account.',
                'application_opening_date': today - timedelta(days=28),
                'application_closing_date': today + timedelta(days=35),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.STATE_PORTAL,
                'official_application_url': 'https://ssp.postmatric.karnataka.gov.in',
                'official_information_url': 'https://bcwd.karnataka.gov.in',
                'source_name': 'Karnataka State Scholarship Portal (SSP)',
                'source_organization': 'Government of Karnataka',
                'source_verification_date': today - timedelta(days=12),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': True
            },

            # 8. Maharashtra Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Yojna (EBC)
            {
                'title': 'Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Yojna (MahaDBT)',
                'opportunity_type': OpportunityType.SUBSIDY,
                'short_description': '50% tuition fee and exam fee waiver for economically backward students admitted to higher and technical education in Maharashtra.',
                'detailed_description': 'Offered by Directorate of Higher Education / Technical Education, Government of Maharashtra. Students admitted through CAP round whose annual family income is up to ₹8,00,000 receive 50% tuition fee and exam fee concession.',
                'provider': 'Higher and Technical Education Department, Government of Maharashtra',
                'government_level': GovernmentLevel.STATE,
                'applicable_state': 'Maharashtra',
                'eligible_states': ['Maharashtra'],
                'education_levels': ['UNDERGRADUATE', 'POSTGRADUATE', 'DIPLOMA'],
                'eligible_courses': ['Engineering', 'Pharmacy', 'Architecture', 'Medical', 'MBA', 'MCA', 'General Degree'],
                'max_annual_income': Decimal('800000.00'),
                'eligible_genders': ['ALL'],
                'eligible_categories': ['GENERAL', 'EWS', 'OBC'],
                'required_documents': ['Maharashtra Domicile Certificate', 'Income Certificate issued by Tahsildar', 'CAP Allotment Letter', 'College Fee Receipt', 'Ration Card'],
                'benefit_amount': Decimal('45000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '50% reimbursement of total approved tuition fee and examination fee directly reimbursed.',
                'application_opening_date': today - timedelta(days=14),
                'application_closing_date': today + timedelta(days=40),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.STATE_PORTAL,
                'official_application_url': 'https://mahadbt.maharashtra.gov.in',
                'official_information_url': 'https://mahadbt.maharashtra.gov.in/SchemeData/SchemeData?str=E9DDFA97074EA6A0074F96A93F634E17',
                'source_name': 'MahaDBT Portal',
                'source_organization': 'Government of Maharashtra',
                'source_verification_date': today - timedelta(days=9),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': True
            },

            # 9. Uttar Pradesh Postmatric Scholarship and Fee Reimbursement Scheme
            {
                'title': 'Uttar Pradesh Dashmottar (Postmatric) Scholarship and Fee Reimbursement',
                'opportunity_type': OpportunityType.SCHOLARSHIP,
                'short_description': 'Comprehensive fee reimbursement and monthly maintenance stipend for UP domicile students enrolled in colleges and universities.',
                'detailed_description': 'Administered by Social Welfare, Backward Class Welfare, and Minority Welfare departments of Uttar Pradesh. Provides complete non-refundable fee refund and academic allowances for students enrolled in undergraduate, postgraduate, and professional diplomas.',
                'provider': 'Social Welfare Department, Government of Uttar Pradesh',
                'government_level': GovernmentLevel.STATE,
                'applicable_state': 'Uttar Pradesh',
                'eligible_states': ['Uttar Pradesh'],
                'education_levels': ['CLASS_11_12', 'UNDERGRADUATE', 'POSTGRADUATE', 'DIPLOMA'],
                'eligible_courses': ['All Degree, Diploma, Technical, Medical, and University Courses'],
                'max_annual_income': Decimal('200000.00'),
                'eligible_genders': ['ALL'],
                'eligible_categories': ['ALL'],
                'required_documents': ['UP Domicile / Niwas Praman Patra', 'Aayati Praman Patra (Income Certificate)', 'Jati Praman Patra (Caste Certificate)', 'Fee Receipt & College Identity', 'Aadhaar Card linked with Bank'],
                'benefit_amount': Decimal('32000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': 'Full approved college fee reimbursement + up to ₹1,200/month allowance for hostellers.',
                'application_opening_date': today - timedelta(days=22),
                'application_closing_date': today + timedelta(days=18),
                'application_status': ApplicationStatus.CLOSING_SOON,
                'application_method': ApplicationMethod.STATE_PORTAL,
                'official_application_url': 'https://scholarship.up.gov.in',
                'official_information_url': 'https://scholarship.up.gov.in',
                'source_name': 'UP Scholarship Portal',
                'source_organization': 'Government of Uttar Pradesh',
                'source_verification_date': today - timedelta(days=3),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': True
            },

            # 10. West Bengal Swami Vivekananda Merit-cum-Means Scholarship (SVMCM)
            {
                'title': 'West Bengal Swami Vivekananda Merit-cum-Means Scholarship (SVMCM)',
                'opportunity_type': OpportunityType.SCHOLARSHIP,
                'short_description': 'Assistance of ₹12,000 to ₹60,000 per annum for meritorious students from low-income families in West Bengal scoring >= 60%.',
                'detailed_description': 'Managed by the Higher Education Department, Government of West Bengal. Sanctioned to meritorious students who have passed with at least 60% marks in the last qualifying examination and family income does not exceed ₹2,50,000/year.',
                'provider': 'Department of Higher Education, Government of West Bengal',
                'government_level': GovernmentLevel.STATE,
                'applicable_state': 'West Bengal',
                'eligible_states': ['West Bengal'],
                'education_levels': ['CLASS_11_12', 'UNDERGRADUATE', 'POSTGRADUATE', 'PHD_RESEARCH'],
                'eligible_courses': ['Arts', 'Science', 'Commerce', 'Engineering', 'Medical', 'Polytechnic'],
                'min_academic_percentage': Decimal('60.00'),
                'max_annual_income': Decimal('250000.00'),
                'eligible_genders': ['ALL'],
                'eligible_categories': ['ALL'],
                'required_documents': ['Marksheet of Madhyamik/Higher Secondary', 'Income Certificate issued by BDO / SDO / Jt BDO', 'Admission Receipt', 'Bank Passbook showing IFSC', 'WB Domicile Proof'],
                'benefit_amount': Decimal('24000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '₹1,000 to ₹5,000 per month (up to ₹60,000/year for Medical/Engineering) transferred via DBT.',
                'application_opening_date': today - timedelta(days=32),
                'application_closing_date': today + timedelta(days=42),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.STATE_PORTAL,
                'official_application_url': 'https://svmcm.wbhed.gov.in',
                'official_information_url': 'https://svmcm.wbhed.gov.in',
                'source_name': 'West Bengal Higher Education Department',
                'source_organization': 'Government of West Bengal',
                'source_verification_date': today - timedelta(days=6),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': True
            },

            # 11. Tamil Nadu Moovalur Ramamirtham Ammaiyar Higher Education Scheme (Pudhumai Penn)
            {
                'title': 'Tamil Nadu Pudhumai Penn Scheme (Higher Education Assurance)',
                'opportunity_type': OpportunityType.STIPEND,
                'short_description': '₹1,000 per month deposited directly into bank accounts of girl students who studied Classes 6 to 12 in Tamil Nadu Government schools.',
                'detailed_description': 'Implemented by the Social Welfare and Women Empowerment Department, Government of Tamil Nadu. Aims to prevent child marriage, reduce dropouts, and encourage girls from government schools to pursue collegiate and technical degrees.',
                'provider': 'Social Welfare & Women Empowerment Department, Government of Tamil Nadu',
                'government_level': GovernmentLevel.STATE,
                'applicable_state': 'Tamil Nadu',
                'eligible_states': ['Tamil Nadu'],
                'education_levels': ['UNDERGRADUATE', 'DIPLOMA', 'ITI_VOCATIONAL'],
                'eligible_courses': ['All Undergraduate Degrees, Diplomas, Medical, Engineering, Law, and ITI Courses'],
                'eligible_genders': ['FEMALE'],
                'eligible_categories': ['ALL'],
                'required_documents': ['Government School Study Certificate (Classes 6-12 EMIS verified)', 'College Admission ID Card', 'Aadhaar Card', 'Student Bank Account Details'],
                'benefit_amount': Decimal('12000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '₹1,000 every month (₹12,000 per year) till completion of the undergraduate or diploma degree.',
                'application_opening_date': today - timedelta(days=18),
                'application_closing_date': today + timedelta(days=55),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.STATE_PORTAL,
                'official_application_url': 'https://penkalvi.tn.gov.in',
                'official_information_url': 'https://www.tn.gov.in/scheme/data_view/68688',
                'source_name': 'Tamil Nadu Higher Education Portal',
                'source_organization': 'Government of Tamil Nadu',
                'source_verification_date': today - timedelta(days=11),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': False
            },

            # 12. Pradhan Mantri Kisan Samman Nidhi (PM-KISAN) - Citizen Welfare Scheme
            {
                'title': 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
                'opportunity_type': OpportunityType.AGRICULTURE_BENEFIT,
                'short_description': 'Central income support of ₹6,000 per year in three equal installments to all landholding farmer families across India.',
                'detailed_description': 'PM-KISAN is a Central Sector Scheme with 100% funding from Government of India. The scheme provides financial assistance of ₹6,000 annually to all landholder farmer families to supplement their financial needs for agricultural inputs and domestic requirements.',
                'provider': 'Department of Agriculture & Farmers Welfare, Ministry of Agriculture',
                'government_level': GovernmentLevel.CENTRAL,
                'applicable_state': 'All India',
                'eligible_states': ['All India'],
                'education_levels': ['ALL'],
                'eligible_occupations': ['Farmer', 'Agriculture'],
                'eligible_genders': ['ALL'],
                'eligible_categories': ['ALL'],
                'required_documents': ['Land Ownership Records / RoR / Khasra-Khatauni', 'Aadhaar Card', 'Aadhaar Seeded Bank Account', 'e-KYC Verification'],
                'benefit_amount': Decimal('6000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '₹6,000 per year paid in three 4-monthly installments of ₹2,000 directly through DBT.',
                'application_opening_date': today - timedelta(days=120),
                'application_closing_date': today + timedelta(days=180),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.ONLINE_DIRECT,
                'official_application_url': 'https://pmkisan.gov.in',
                'official_information_url': 'https://pmkisan.gov.in',
                'source_name': 'PM-KISAN Portal',
                'source_organization': 'Ministry of Agriculture and Farmers Welfare, GoI',
                'source_verification_date': today - timedelta(days=2),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': True
            },

            # 13. Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)
            {
                'title': 'Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (AB-PMJAY)',
                'opportunity_type': OpportunityType.HEALTH_SCHEME,
                'short_description': 'Health cover of ₹5,00,000 per family per year for secondary and tertiary care hospitalization across public and empanelled private hospitals.',
                'detailed_description': 'AB-PMJAY is the world’s largest health insurance/assurance scheme fully financed by the government. It covers over 12 crore poor and vulnerable families (approximately 55 crore beneficiaries) providing cashless and paperless access to quality healthcare services.',
                'provider': 'National Health Authority (NHA), Ministry of Health & Family Welfare',
                'government_level': GovernmentLevel.CENTRAL,
                'applicable_state': 'All India',
                'eligible_states': ['All India'],
                'education_levels': ['ALL'],
                'eligible_genders': ['ALL'],
                'eligible_categories': ['ALL'],
                'required_documents': ['Ration Card / SECC Family ID', 'Aadhaar Card', 'Mobile Number for OTP Verification'],
                'benefit_amount': Decimal('500000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '₹5 Lakh per family per year cashless hospitalization coverage for 1,949 medical procedures including surgeries and oncology.',
                'application_opening_date': today - timedelta(days=300),
                'application_closing_date': today + timedelta(days=365),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.ONLINE_DIRECT,
                'official_application_url': 'https://beneficiary.nha.gov.in',
                'official_information_url': 'https://nha.gov.in/PM-JAY',
                'source_name': 'National Health Authority',
                'source_organization': 'Ministry of Health and Family Welfare, GoI',
                'source_verification_date': today - timedelta(days=1),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': True
            },

            # 14. Indira Gandhi National Disability Pension Scheme (IGNDPS) - NSAP
            {
                'title': 'Indira Gandhi National Disability Pension Scheme (IGNDPS)',
                'opportunity_type': OpportunityType.PENSION,
                'short_description': 'Monthly disability pension under the National Social Assistance Programme for BPL individuals with >= 80% severe disability.',
                'detailed_description': 'Component of NSAP by Ministry of Rural Development. Sanctioned to BPL persons aged 18-79 years suffering from severe or multiple disabilities (disability level 80% and above). State governments also contribute matching or enhanced monthly additions.',
                'provider': 'Ministry of Rural Development, Government of India',
                'government_level': GovernmentLevel.CENTRAL,
                'applicable_state': 'All India',
                'eligible_states': ['All India'],
                'education_levels': ['ALL'],
                'min_age': 18,
                'max_age': 79,
                'disability_eligible_only': True,
                'min_disability_percentage': Decimal('80.00'),
                'eligible_genders': ['ALL'],
                'eligible_categories': ['ALL'],
                'required_documents': ['Disability Certificate (80% and above)', 'BPL Card / Income Proof', 'Aadhaar Card', 'Bank Account Details'],
                'benefit_amount': Decimal('12000.00'),
                'benefit_frequency': BenefitFrequency.ANNUALLY,
                'benefit_description': '₹1,000 to ₹3,000 monthly pension (depending on combined Central & State contributions) directly deposited via DBT.',
                'application_opening_date': today - timedelta(days=60),
                'application_closing_date': today + timedelta(days=300),
                'application_status': ApplicationStatus.OPEN,
                'application_method': ApplicationMethod.ONLINE_DIRECT,
                'official_application_url': 'https://nsap.nic.in',
                'official_information_url': 'https://nsap.nic.in',
                'source_name': 'NSAP Portal',
                'source_organization': 'Ministry of Rural Development, GoI',
                'source_verification_date': today - timedelta(days=15),
                'verification_status': VerificationStatus.OFFICIAL_VERIFIED,
                'reliability_status': ReliabilityStatus.HIGH,
                'is_featured': False
            }
        ]

        count = 0
        for data in opportunities_data:
            doc_reqs = data.pop('required_documents', [])
            opp, created = Opportunity.objects.update_or_create(
                title=data['title'],
                defaults=data
            )
            count += 1
            # Add document requirements
            for d in doc_reqs:
                OpportunityDocumentRequirement.objects.get_or_create(
                    opportunity=opp,
                    document_name=d,
                    defaults={'is_mandatory': True, 'description': f"Official verified copy of {d}"}
                )

        self.stdout.write(f"Successfully seeded {count} official opportunities across India.")

        # Seed Workflow Templates
        self.stdout.write("Seeding React Flow Workflow Templates...")
        template_nodes = [
            {
                "id": "node-input-1",
                "type": "inputNode",
                "position": {"x": 50, "y": 80},
                "data": {
                    "label": "Current Education Level",
                    "category": "INPUT",
                    "fieldKey": "education_level",
                    "defaultValue": "UNDERGRADUATE"
                }
            },
            {
                "id": "node-input-2",
                "type": "inputNode",
                "position": {"x": 50, "y": 200},
                "data": {
                    "label": "Annual Family Income",
                    "category": "INPUT",
                    "fieldKey": "annual_family_income",
                    "defaultValue": 250000
                }
            },
            {
                "id": "node-input-3",
                "type": "inputNode",
                "position": {"x": 50, "y": 320},
                "data": {
                    "label": "Academic Percentage",
                    "category": "INPUT",
                    "fieldKey": "academic_percentage",
                    "defaultValue": 75
                }
            },
            {
                "id": "node-input-4",
                "type": "inputNode",
                "position": {"x": 50, "y": 440},
                "data": {
                    "label": "State of Residence",
                    "category": "INPUT",
                    "fieldKey": "state_or_ut",
                    "defaultValue": "Karnataka"
                }
            },
            {
                "id": "node-logic-1",
                "type": "logicNode",
                "position": {"x": 350, "y": 140},
                "data": {
                    "label": "Income Ceiling <= ₹4.5 Lakh",
                    "category": "CONDITION",
                    "field": "annual_family_income",
                    "operator": "LESS_THAN_OR_EQUAL",
                    "targetValue": 450000
                }
            },
            {
                "id": "node-logic-2",
                "type": "logicNode",
                "position": {"x": 350, "y": 280},
                "data": {
                    "label": "Academic Score >= 60%",
                    "category": "CONDITION",
                    "field": "academic_percentage",
                    "operator": "GREATER_THAN",
                    "targetValue": 60
                }
            },
            {
                "id": "node-output-1",
                "type": "outputNode",
                "position": {"x": 680, "y": 200},
                "data": {
                    "label": "Eligible for Higher Education Scholarships",
                    "category": "OUTPUT",
                    "action": "SHOW_MATCHES"
                }
            }
        ]

        template_edges = [
            {"id": "e1", "source": "node-input-1", "target": "node-logic-1"},
            {"id": "e2", "source": "node-input-2", "target": "node-logic-1"},
            {"id": "e3", "source": "node-input-3", "target": "node-logic-2"},
            {"id": "e4", "source": "node-logic-1", "target": "node-output-1"},
            {"id": "e5", "source": "node-logic-2", "target": "node-output-1"}
        ]

        EligibilityWorkflow.objects.update_or_create(
            title="Undergraduate Merit & Income Eligibility Pipeline",
            is_template=True,
            defaults={
                'description': 'Standard multi-condition workflow checking education level, family income cap, and academic marks threshold.',
                'nodes': template_nodes,
                'edges': template_edges,
                'is_active': True
            }
        )

        # -------------------------------------------------------------
        # Initialize Single Authorized Administrator (admin@gamil.com)
        # -------------------------------------------------------------
        self.stdout.write("Initializing single authorized administrator account...")
        from django.core.management import call_command
        call_command('bootstrap_admin')

        self.stdout.write(self.style.SUCCESS("All seed data, workflow templates, and administrator account successfully initialized!"))
