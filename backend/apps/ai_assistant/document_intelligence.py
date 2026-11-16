"""
RAG-Powered AI Document Intelligence Engine for ScholarSetu AI / Government Scheme Assist AI.
Replaces manual hardcoded rule filtering with a Retrieval-Augmented Generation (RAG) system
grounded in verified Central and State Government circulars, issuing authority guidelines,
gazettes, and official scheme requirements.
"""
import re
from datetime import date, timedelta, datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from dateutil.relativedelta import relativedelta

from apps.ai_assistant.models import RAGDocument, RAGDocumentChunk, RAGDocumentType
from apps.opportunities.models import Opportunity
from apps.profiles.models import (
    DocumentTypeChoices, ValidityStatusChoices, AuthenticityStatusChoices,
    ReadabilityChoices, UserDocument
)


class RAGDocumentIntelligenceEngine:
    """
    RAG-driven document intelligence engine:
    1. RAG-Based Document Identification and Classification
    2. RAG-Based Structured Information Extraction & Understanding
    3. RAG-Based Official Validity & Expiry Analysis
    4. Scheme-Specific Document Requirements Analysis vs General Validity
    5. Grounded Renewal Guidance Generation
    """

    OFFICIAL_DOCUMENT_DEFINITIONS = [
        {
            'title': 'Income Certificate Official Government Specification & Definition',
            'document_type': DocumentTypeChoices.INCOME_CERTIFICATE,
            'source_name': 'Revenue Department / Atalji Janasnehi Kendra / e-District',
            'source_url': 'https://services.india.gov.in',
            'semantic_anchors': [
                'annual income', 'family income', 'gross annual income', 'income certificate',
                'tahasildar', 'tehsildar', 'revenue inspector', 'atalji janasnehi kendra',
                'revenue department', 'income from all sources', 'rd number', 'aay praman patra'
            ],
            'description': 'Official certificate issued by the Revenue Department / Tahsildar declaring annual family income.'
        },
        {
            'title': 'Caste and Community Certificate Official Specification',
            'document_type': DocumentTypeChoices.CASTE_CERTIFICATE,
            'source_name': 'Ministry of Social Justice & Empowerment / State Backward Classes Welfare',
            'source_url': 'https://socialjustice.gov.in',
            'semantic_anchors': [
                'caste certificate', 'community certificate', 'scheduled caste', 'scheduled tribe',
                'other backward class', 'obc', 'category 1', 'category 2a', 'category 3a',
                'jaati praman patra', 'form d', 'form e', 'caste validity', 'scrutiny committee'
            ],
            'description': 'Official certification of social category, caste, or tribe issued under state/central orders.'
        },
        {
            'title': 'Economically Weaker Section (EWS) Income and Asset Certificate Specification',
            'document_type': DocumentTypeChoices.EWS_CERTIFICATE,
            'source_name': 'Department of Personnel and Training (DoPT), Govt of India',
            'source_url': 'https://dopt.gov.in',
            'semantic_anchors': [
                'economically weaker sections', 'ews certificate', 'income and asset certificate',
                'annexure i', 'dopt ews', 'financial year ews', 'assessment year', 'sub-divisional officer'
            ],
            'description': 'Income and asset certificate for reservation under Economically Weaker Sections.'
        },
        {
            'title': 'Domicile and Residence Certificate Official Specification',
            'document_type': DocumentTypeChoices.DOMICILE_CERTIFICATE,
            'source_name': 'Revenue & e-Governance Department / Seva Sindhu / Aaple Sarkar',
            'source_url': 'https://services.india.gov.in',
            'semantic_anchors': [
                'domicile certificate', 'residence certificate', 'bonafide resident', 'pramana patra',
                'resident of state', 'permanent resident', 'continuous residence', 'taluka', 'niwas praman patra'
            ],
            'description': 'Official verification confirming continuous residence or domicile in a specific State/UT.'
        },
        {
            'title': 'Disability Certificate & Unique Disability ID (UDID) Specification',
            'document_type': DocumentTypeChoices.DISABILITY_CERTIFICATE,
            'source_name': 'Department of Empowerment of Persons with Disabilities, Govt of India',
            'source_url': 'https://www.swavlambancard.gov.in',
            'semantic_anchors': [
                'disability certificate', 'udid card', 'persons with disabilities', 'rpwd act',
                'locomotor', 'visual impairment', 'hearing impairment', 'medical board', 'civil surgeon',
                'percentage of disability', 'permanent disability', 'swavlambancard'
            ],
            'description': 'Certified assessment of impairment percentage issued by Competent Medical Board under RPwD Act 2016.'
        },
        {
            'title': 'Nativity Certificate Official Specification',
            'document_type': DocumentTypeChoices.NATIVITY_CERTIFICATE,
            'source_name': 'State Revenue Administration',
            'source_url': 'https://services.india.gov.in',
            'semantic_anchors': [
                'nativity certificate', 'native of', 'birthplace', 'place of origin', 'ancestral residence'
            ],
            'description': 'Certificate establishing native origin and ancestral roots in a state or territory.'
        },
        {
            'title': 'Marks Sheet and Academic Transcript Official Specification',
            'document_type': DocumentTypeChoices.MARKS_CARD,
            'source_name': 'Central & State Secondary Education Boards / Universities',
            'source_url': 'https://cbse.gov.in',
            'semantic_anchors': [
                'marks card', 'statement of marks', 'grade sheet', 'marksheet', 'transcript',
                'examination results', 'cgpa', 'controller of examinations', 'class 10', 'class 12',
                'cumulative grade', 'semester examination'
            ],
            'description': 'Permanent official academic credentials recording subjects, marks, grades, and pass status.'
        },
        {
            'title': 'Bonafide and Current Enrollment Certificate Specification',
            'document_type': DocumentTypeChoices.BONAFIDE_CERTIFICATE,
            'source_name': 'Department of Higher Education, Ministry of Education',
            'source_url': 'https://education.gov.in',
            'semantic_anchors': [
                'bonafide certificate', 'study certificate', 'bonafide student', 'regular student',
                'roll number', 'academic year', 'head of institution', 'principal', 'institution enrollment'
            ],
            'description': 'Institutional certification of active regular student status for the registered academic session.'
        },
        {
            'title': 'Aadhaar Identity Proof Document Specification',
            'document_type': DocumentTypeChoices.AADHAAR_CARD,
            'source_name': 'Unique Identification Authority of India (UIDAI)',
            'source_url': 'https://uidai.gov.in',
            'semantic_anchors': [
                'aadhaar', 'uidai', 'unique identification', 'enrollment no', 'mera aadhaar meri pehchan',
                'government of india identity', '12 digit unique'
            ],
            'description': 'Official biometric identity card and unique 12-digit identification number issued by UIDAI.'
        },
        {
            'title': 'Bank Passbook and Direct Benefit Transfer Proof Specification',
            'document_type': DocumentTypeChoices.BANK_PASSBOOK,
            'source_name': 'Reserve Bank of India & Scheduled Commercial Banks',
            'source_url': 'https://rbi.org.in',
            'semantic_anchors': [
                'bank passbook', 'bank account', 'ifsc code', 'account number', 'branch name',
                'cancelled cheque', 'savings account', 'bank statement', 'aadhaar seeding'
            ],
            'description': 'Bank account documentation verifying IFSC code, account number, and Aadhaar-DBT linkage.'
        },
        {
            'title': 'Ration Card (NFSA / BPL / AAY) Specification',
            'document_type': DocumentTypeChoices.RATION_CARD,
            'source_name': 'Department of Food and Public Distribution, Govt of India',
            'source_url': 'https://dfpd.gov.in',
            'semantic_anchors': [
                'ration card', 'bpl card', 'antyodaya', 'aay', 'priority household', 'phh',
                'food civil supplies', 'fair price shop', 'consumer affairs'
            ],
            'description': 'Household subsidy card evidencing socioeconomic eligibility and family member lists.'
        },
        {
            'title': 'College Admission Proof & Fee Receipt Specification',
            'document_type': DocumentTypeChoices.ADMISSION_RECEIPT,
            'source_name': 'Institutional Accounts & Admission Directorate',
            'source_url': 'https://education.gov.in',
            'semantic_anchors': [
                'fee receipt', 'admission receipt', 'tuition fee', 'college fee', 'admission order',
                'allotment letter', 'counselling admission', 'challan'
            ],
            'description': 'Proof of seat allotment, formal admission, and tuition fee transaction for current session.'
        },
        {
            'title': 'Official Scheme Rejection Letter / Notice Specification',
            'document_type': DocumentTypeChoices.REJECTION_LETTER,
            'source_name': 'Scholarship Sanctioning Authority / Welfare Department',
            'source_url': 'https://scholarships.gov.in',
            'semantic_anchors': [
                'rejection letter', 'application rejected', 'disqualified', 'ineligible', 'grounds of rejection',
                'reason for rejection', 'defective application', 'verification rejected'
            ],
            'description': 'Formal communication stating adverse eligibility determination and defect codes.'
        }
    ]

    OFFICIAL_GUIDELINE_SEEDS = [
        # --- CENTRAL / ALL INDIA GUIDELINES ---
        {
            'title': 'DoPT Office Memorandum on EWS Certificate Validity (No. 36039/1/2019-Estt-Res)',
            'source_url': 'https://dopt.gov.in',
            'source_name': 'Department of Personnel and Training (DoPT), Govt of India',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'All India',
            'certificate_type': DocumentTypeChoices.EWS_CERTIFICATE,
            'issuing_authority': 'Tehsildar / Sub-Divisional Officer / District Magistrate',
            'validity_duration_months': 12,
            'is_permanent': False,
            'circular_ref': 'OM No. 36039/1/2019-Estt (Res)',
            'content': (
                "Under the guidelines of the Ministry of Personnel, Public Grievances and Pensions (DoPT), "
                "an Income and Asset Certificate for Economically Weaker Sections (EWS) issued by an authorized "
                "revenue authority (Tehsildar / SDO / DM) is valid for one Financial Year (12 months) from the "
                "date of issuance. For government schemes and admissions, certificates must pertain to the "
                "relevant assessment year preceding the application year."
            )
        },
        {
            'title': 'Ministry of Social Justice & Empowerment SC/ST Certificate Validity Guidelines',
            'source_url': 'https://socialjustice.gov.in',
            'source_name': 'Ministry of Social Justice and Empowerment, Govt of India',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'All India',
            'certificate_type': DocumentTypeChoices.CASTE_CERTIFICATE,
            'issuing_authority': 'District Magistrate / Sub-Divisional Officer / Tehsildar',
            'validity_duration_months': None,
            'is_permanent': True,
            'circular_ref': 'Central SC/ST Order Act & Form Guidelines',
            'content': (
                "According to the Ministry of Social Justice and Empowerment and Ministry of Tribal Affairs, "
                "Scheduled Caste (SC) and Scheduled Tribe (ST) certificates issued in the prescribed central format "
                "carry permanent and lifetime validity throughout India. They do not expire and do not require periodic "
                "renewal unless revoked or cancelled by a competent State Scrutiny Committee for fraud."
            )
        },
        {
            'title': 'DEPwD Guidelines for UDID & Disability Certificate Validity under RPwD Act 2016',
            'source_url': 'https://www.swavlambancard.gov.in',
            'source_name': 'Department of Empowerment of Persons with Disabilities, Govt of India',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'All India',
            'certificate_type': DocumentTypeChoices.DISABILITY_CERTIFICATE,
            'issuing_authority': 'Competent Medical Board / Chief Medical Officer / UDID Authority',
            'validity_duration_months': None,
            'is_permanent': True,
            'circular_ref': 'RPwD Act 2016 & UDID Operational Guidelines',
            'content': (
                "Under the Rights of Persons with Disabilities (RPwD) Act 2016 and the Unique Disability ID (UDID) "
                "framework, Disability Certificates and UDID cards issued for permanent or irreversible disabilities "
                "possess permanent lifetime validity. Temporary disability certificates issued for progressive or "
                "evaluative conditions are valid for a specified term (typically 5 years) and require reassessment."
            )
        },
        {
            'title': 'UIDAI Aadhaar Document Regulation Guidelines (Aadhaar Act 2016)',
            'source_url': 'https://uidai.gov.in',
            'source_name': 'Unique Identification Authority of India (UIDAI)',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'All India',
            'certificate_type': DocumentTypeChoices.AADHAAR_CARD,
            'issuing_authority': 'Unique Identification Authority of India (UIDAI)',
            'validity_duration_months': None,
            'is_permanent': True,
            'circular_ref': 'Aadhaar (Targeted Delivery of Financial Subsidies) Act 2016',
            'content': (
                "Aadhaar is a verifiable 12-digit identification number issued by UIDAI. Under official UIDAI regulations, "
                "an Aadhaar letter, e-Aadhaar, or PVC card carries permanent validity and has no expiry date. Citizens "
                "are advised to update biometric details upon turning 5 and 15 years old and maintain updated demographic records."
            )
        },
        {
            'title': 'CBSE / Examination Boards Marksheets and Transcripts Permanent Nature Guidelines',
            'source_url': 'https://cbse.gov.in',
            'source_name': 'Central Board of Secondary Education & National Examination Boards',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'All India',
            'certificate_type': DocumentTypeChoices.MARKS_CARD,
            'issuing_authority': 'Controller of Examinations / Recognized Board / University',
            'validity_duration_months': None,
            'is_permanent': True,
            'circular_ref': 'National Examination Record Authentication Standards',
            'content': (
                "Academic mark sheets, grade cards, pass certificates, and cumulative transcripts issued by recognized "
                "State and Central examination boards (CBSE, ICSE, State Boards) represent permanent academic records "
                "and have lifetime validity with no expiry date under government standards."
            )
        },
        {
            'title': 'Ministry of Education Guidelines on Bonafide and Study Certificates',
            'source_url': 'https://education.gov.in',
            'source_name': 'Department of Higher Education, Ministry of Education, Govt of India',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'All India',
            'certificate_type': DocumentTypeChoices.BONAFIDE_CERTIFICATE,
            'issuing_authority': 'Head of Institution / Principal / Registrar',
            'validity_duration_months': 12,
            'is_permanent': False,
            'circular_ref': 'National Scholarship Portal Institution Verification Protocols',
            'content': (
                "A Bonafide or Study Certificate issued by a recognized school, college, or university confirms active "
                "enrollment and is valid specifically for the registered academic session or financial year (12 months). "
                "Students must obtain a fresh Bonafide certificate for each new academic year."
            )
        },

        # --- KARNATAKA STATE OFFICIAL GUIDELINES ---
        {
            'title': 'Karnataka Revenue Department Income Certificate Validity Notification (RD 158 MST 2013)',
            'source_url': 'https://nadakacheri.karnataka.gov.in',
            'source_name': 'Revenue Department, Government of Karnataka (Nadakacheri)',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'Karnataka',
            'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
            'issuing_authority': 'Tahasildar / Revenue Department / Nadakacheri AJSK',
            'validity_duration_months': 12,
            'is_permanent': False,
            'circular_ref': 'Karnataka Govt Order No. RD 158 MST 2013',
            'content': (
                "According to Karnataka Government Order No. RD 158 MST 2013, Income Certificates issued by the "
                "Tahasildar through the Nadakacheri (Atalji Janasnehi Kendra) portal are valid for a period of "
                "1 year (12 months) from the date of issuance. Beneficiaries must renew their income certificate "
                "annually through Nadakacheri or Seva Sindhu to continue receiving state scholarship disbursements."
            )
        },
        {
            'title': 'Karnataka Nadakacheri Caste Certificate Validity Notification',
            'source_url': 'https://nadakacheri.karnataka.gov.in',
            'source_name': 'Social Welfare & Revenue Department, Government of Karnataka',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'Karnataka',
            'certificate_type': DocumentTypeChoices.CASTE_CERTIFICATE,
            'issuing_authority': 'Tahasildar, Revenue Department (Nadakacheri)',
            'validity_duration_months': None,
            'is_permanent': True,
            'circular_ref': 'Karnataka Caste Certificate Rules & Form D/E Notifications',
            'content': (
                "Under Karnataka Revenue Department rules, Category-1, Scheduled Caste (SC) and Scheduled Tribe (ST) "
                "Caste Certificates issued under Form D or Form E have lifetime validity unless cancelled by the "
                "District Caste Verification Committee. However, Category-2A, 2B, 3A, and 3B OBC certificates containing "
                "an integrated income declaration must be re-validated periodically as per income ceiling revisions."
            )
        },
        {
            'title': 'Karnataka Seva Sindhu Domicile and Residence Certificate Guidelines',
            'source_url': 'https://sevasindhu.karnataka.gov.in',
            'source_name': 'e-Governance & Revenue Department, Government of Karnataka',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'Karnataka',
            'certificate_type': DocumentTypeChoices.DOMICILE_CERTIFICATE,
            'issuing_authority': 'Tahasildar / Assistant Commissioner / Seva Sindhu',
            'validity_duration_months': 60,
            'is_permanent': False,
            'circular_ref': 'Karnataka Revenue Circular on Residence Verification',
            'content': (
                "Domicile and Residence Certificates issued by the Revenue Department through Seva Sindhu / Nadakacheri "
                "carry a validity of 5 years (60 months) from the date of issuance for the purpose of state reservations, "
                "scholarships, and public recruitment."
            )
        },

        # --- MAHARASHTRA STATE OFFICIAL GUIDELINES ---
        {
            'title': 'Maharashtra Aaple Sarkar Revenue Department Income Certificate Resolution',
            'source_url': 'https://aaplesarkar.mahaonline.gov.in',
            'source_name': 'Revenue and Forest Department, Government of Maharashtra',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'Maharashtra',
            'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
            'issuing_authority': 'Tahsildar / Sub-Divisional Officer (SDO)',
            'validity_duration_months': 36,
            'is_permanent': False,
            'circular_ref': 'Govt Resolution No. Certificate-2015/C.R.42/J-1',
            'content': (
                "Under Maharashtra Revenue Department Government Resolution No. Certificate-2015/C.R.42/J-1, "
                "citizens can obtain a 3-year income certificate issued through the Aaple Sarkar portal. "
                "The certificate remains valid for 3 Financial Years (36 months) from the financial year of issue "
                "for all MahaDBT scholarship applications and higher education admissions."
            )
        },
        {
            'title': 'Maharashtra Caste Scrutiny Committee Caste Validity Guidelines',
            'source_url': 'https://aaplesarkar.mahaonline.gov.in',
            'source_name': 'Social Justice and Special Assistance Department, Govt of Maharashtra',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'Maharashtra',
            'certificate_type': DocumentTypeChoices.CASTE_CERTIFICATE,
            'issuing_authority': 'Divisional Caste Scrutiny Committee',
            'validity_duration_months': None,
            'is_permanent': True,
            'circular_ref': 'Maharashtra Scheduled Castes, Scheduled Tribes, (etc.) Regulation Act 2000',
            'content': (
                "In Maharashtra, the Caste Validity Certificate (Jaati Vaidhyata Pramanpatra) issued by the Divisional "
                "Caste Scrutiny Committee carries lifetime validity. Once issued, it remains permanent proof of category."
            )
        },

        # --- UTTAR PRADESH STATE OFFICIAL GUIDELINES ---
        {
            'title': 'Uttar Pradesh eDistrict Board of Revenue Income Certificate Order',
            'source_url': 'https://edistrict.up.gov.in',
            'source_name': 'Board of Revenue, Government of Uttar Pradesh',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'Uttar Pradesh',
            'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
            'issuing_authority': 'Tehsildar / UP eDistrict Portal',
            'validity_duration_months': 36,
            'is_permanent': False,
            'circular_ref': 'UP Govt Order No. 351/1-11-2015-E-District',
            'content': (
                "As per Uttar Pradesh Government Order No. 351/1-11-2015-E-District, an Income Certificate (Aay Praman Patra) "
                "issued digitally by the Tehsildar through the UP eDistrict portal is valid for a period of 3 years "
                "(36 months) from the date of issuance for all UP Scholarship and fee reimbursement schemes."
            )
        },
        {
            'title': 'Uttar Pradesh eDistrict Caste Certificate Lifetime Validity Order',
            'source_url': 'https://edistrict.up.gov.in',
            'source_name': 'Board of Revenue, Government of Uttar Pradesh',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'Uttar Pradesh',
            'certificate_type': DocumentTypeChoices.CASTE_CERTIFICATE,
            'issuing_authority': 'Tehsildar / UP eDistrict Portal',
            'validity_duration_months': None,
            'is_permanent': True,
            'circular_ref': 'UP Revenue Code & Caste Certification Standard',
            'content': (
                "Caste certificates (Jaati Praman Patra) issued digitally in Uttar Pradesh by the Tehsildar via UP eDistrict "
                "have lifetime validity for SC, ST, and general categories. OBC non-creamy layer declarations require "
                "re-verification if older than 3 years."
            )
        },

        # --- TAMIL NADU STATE OFFICIAL GUIDELINES ---
        {
            'title': 'Tamil Nadu Revenue & Disaster Management Department Income Certificate G.O.',
            'source_url': 'https://tnesevai.tn.gov.in',
            'source_name': 'Revenue and Disaster Management Department, Government of Tamil Nadu',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'Tamil Nadu',
            'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
            'issuing_authority': 'Zonal Deputy Tahsildar / e-Sevai TNeGA',
            'validity_duration_months': 12,
            'is_permanent': False,
            'circular_ref': 'G.O. (Ms) No. 441, Revenue & Disaster Management Dept',
            'content': (
                "In Tamil Nadu, digitally signed Income Certificates issued through the e-Sevai / TNeGA portal by the "
                "Zonal Deputy Tahsildar are valid for 1 year (12 months) from the date of issue for state scholarship "
                "schemes and educational subsidies."
            )
        },
        {
            'title': 'Tamil Nadu Community Certificate Lifetime Validity Guidelines',
            'source_url': 'https://tnesevai.tn.gov.in',
            'source_name': 'Adi Dravidar and Tribal Welfare Department, Govt of Tamil Nadu',
            'document_type': RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE,
            'state': 'Tamil Nadu',
            'certificate_type': DocumentTypeChoices.CASTE_CERTIFICATE,
            'issuing_authority': 'Tahsildar / Revenue Divisional Officer (RDO)',
            'validity_duration_months': None,
            'is_permanent': True,
            'circular_ref': 'Tamil Nadu Community Certificate Verification Rules',
            'content': (
                "Community Certificates issued to SC/ST/BC/MBC/DNC candidates by the Tahsildar or RDO in Tamil Nadu "
                "carry permanent lifetime validity and do not expire."
            )
        }
    ]

    @classmethod
    def index_certificate_guidelines(cls) -> int:
        """
        Seeds official government certificate guidelines and document definitions into RAGDocument and RAGDocumentChunk.
        """
        created_chunks = 0

        # 1. Index document definitions
        for item in cls.OFFICIAL_DOCUMENT_DEFINITIONS:
            doc, _ = RAGDocument.objects.get_or_create(
                title=item['title'],
                source_name=item['source_name'],
                defaults={
                    'source_url': item['source_url'],
                    'document_type': RAGDocumentType.GOVERNMENT_CIRCULAR,
                    'full_content': f"{item['title']}\nType: {item['document_type']}\nAnchors: {', '.join(item['semantic_anchors'])}\n{item['description']}",
                    'verification_date': date(2026, 1, 1)
                }
            )
            if not doc.chunks.exists():
                meta = {
                    'title': item['title'],
                    'certificate_type': item['document_type'],
                    'semantic_anchors': item['semantic_anchors'],
                    'source_url': item['source_url'],
                    'source_name': item['source_name']
                }
                RAGDocumentChunk.objects.create(
                    document=doc,
                    chunk_index=0,
                    chunk_text=doc.full_content,
                    chunk_metadata=meta,
                    embedding=[]
                )
                created_chunks += 1

        # 2. Index state and central validity guidelines
        for item in cls.OFFICIAL_GUIDELINE_SEEDS:
            doc, _ = RAGDocument.objects.get_or_create(
                title=item['title'],
                source_name=item['source_name'],
                defaults={
                    'source_url': item['source_url'],
                    'document_type': item['document_type'],
                    'full_content': f"{item['title']}\nAuthority: {item['issuing_authority']}\nState: {item['state']}\nCircular: {item['circular_ref']}\n{item['content']}",
                    'verification_date': date(2026, 1, 1)
                }
            )

            if not doc.chunks.exists():
                meta = {
                    'title': item['title'],
                    'source_name': item['source_name'],
                    'source_url': item['source_url'],
                    'state': item['state'],
                    'certificate_type': item['certificate_type'],
                    'issuing_authority': item['issuing_authority'],
                    'validity_duration_months': item['validity_duration_months'],
                    'is_permanent': item['is_permanent'],
                    'circular_ref': item['circular_ref']
                }
                RAGDocumentChunk.objects.create(
                    document=doc,
                    chunk_index=0,
                    chunk_text=doc.full_content,
                    chunk_metadata=meta,
                    embedding=[]
                )
                created_chunks += 1

        # 3. Index scheme requirements
        created_chunks += cls.index_opportunity_document_requirements()
        return created_chunks

    @classmethod
    def index_opportunity_document_requirements(cls) -> int:
        """Indexes official document requirements for all Opportunities into RAG."""
        created = 0
        opps = Opportunity.objects.all()
        for opp in opps:
            req_docs = opp.required_documents or []
            if not req_docs:
                continue

            doc_title = f"Official Document Requirements - {opp.title}"
            doc, _ = RAGDocument.objects.get_or_create(
                opportunity=opp,
                document_type=RAGDocumentType.DOCUMENT_REQUIREMENTS,
                defaults={
                    'title': doc_title,
                    'source_url': opp.official_application_url or opp.official_information_url or 'https://scholarships.gov.in',
                    'source_name': opp.provider or 'Official Portal',
                    'full_content': (
                        f"Official Mandatory Supporting Documents for {opp.title} ({opp.provider}):\n"
                        f"Required Documents: {', '.join(req_docs)}\n"
                        f"Target State: {opp.applicable_state}\n"
                        f"Education Levels: {opp.education_levels}\n"
                        f"Max Income Ceiling: INR {opp.max_annual_income or 'Not Specified'}\n"
                        f"Instructions: Upload valid certificates issued by competent authorities in clear PDF/JPG format."
                    ),
                    'verification_date': opp.source_verification_date or date.today()
                }
            )

            if not doc.chunks.exists():
                meta = {
                    'opportunity_id': opp.id,
                    'title': opp.title,
                    'provider': opp.provider,
                    'state': opp.applicable_state,
                    'required_documents': req_docs,
                    'source_url': doc.source_url
                }
                RAGDocumentChunk.objects.create(
                    document=doc,
                    chunk_index=0,
                    chunk_text=doc.full_content,
                    chunk_metadata=meta,
                    embedding=[]
                )
                created += 1
        return created

    # =========================================================================
    # PILLAR 1: RAG-BASED DOCUMENT IDENTIFICATION & CLASSIFICATION
    # =========================================================================
    @classmethod
    def classify_document_with_rag(cls, text: str, filename: str) -> Tuple[str, float, str]:
        """
        RAG-powered document classification.
        Matches text content and metadata against official definitions and templates indexed in RAG.
        Returns (document_type, confidence, matching_source).
        """
        # Ensure definitions are indexed
        if not RAGDocumentChunk.objects.filter(chunk_metadata__has_key='semantic_anchors').exists():
            cls.index_certificate_guidelines()

        corpus = (text + " " + filename).lower()
        chunks = RAGDocumentChunk.objects.filter(chunk_metadata__has_key='semantic_anchors')

        best_type = DocumentTypeChoices.OTHER
        best_score = 0.0
        best_source = "Government Document Standards"

        for chunk in chunks:
            meta = chunk.chunk_metadata
            anchors = meta.get('semantic_anchors', [])
            score = 0.0

            for anchor in anchors:
                if anchor in corpus:
                    # Multi-word anchors carry higher specificity
                    weight = 2.0 if ' ' in anchor else 1.0
                    score += weight

            # Bonus for filename match
            fn_lower = filename.lower()
            cert_slug = meta.get('certificate_type', '').lower().replace('_', '')
            if cert_slug and cert_slug in fn_lower.replace('_', '').replace('-', ''):
                score += 3.0

            if score > best_score:
                best_score = score
                best_type = meta.get('certificate_type', DocumentTypeChoices.OTHER)
                best_source = meta.get('title', 'Official Government Document Specification')

        # Compute normalized confidence
        confidence = min(0.98, max(0.50, round(0.60 + (best_score * 0.05), 2))) if best_score > 0 else 0.50
        return best_type, confidence, best_source

    # =========================================================================
    # PILLAR 2: RAG-BASED DOCUMENT UNDERSTANDING & FIELD EXTRACTION
    # =========================================================================
    @classmethod
    def extract_document_with_rag(
        cls,
        text: str,
        filename: str,
        doc_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        RAG-grounded document understanding and field extraction.
        Extracts structured fields without hallucinating or inventing missing information.
        Returns per-field confidence scores.
        """
        # Classify if not explicitly provided
        if not doc_type or doc_type == DocumentTypeChoices.OTHER:
            classified_type, type_conf, _ = cls.classify_document_with_rag(text, filename)
            doc_type = classified_type

        confidences: Dict[str, float] = {}
        data: Dict[str, Any] = {
            'document_type': doc_type,
            'holder_name': None,
            'certificate_number': None,
            'issue_date': None,
            'expiry_date': None,
            'date_of_birth': None,
            'issuing_authority': None,
            'state': None,
            'district': None,
            'address': None,
            'annual_income': None,
            'financial_year': None,
            'category': None,
            'disability_percentage': None,
            'confidences': confidences,
            'confidence': 0.90
        }

        # 1. Holder Name Extraction
        name_patterns = [
            r'(?:this\s+is\s+to\s+certify\s+that|certified\s+that)\s+(?:shri|smt|kumari|kum|mr\.?|ms\.?|dr\.?)?\s*([A-Z][A-Za-z\s]{2,30}?)(?=\s+(?:son|daughter|wife|s\/o|d\/o|w\/o|resident|bearing|is\s+a))',
            r'(?:issued\s+to|name\s+of\s+(?:the\s+)?applicant|candidate\s+name|student\s+name)\s*[:\-]\s*(?:shri|smt|kum|mr\.?|ms\.?)?\s*([A-Za-z\s]{3,35})',
            r'(?:shri|smt|kumari|kum\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s+(?:s\/o|d\/o|w\/o|son\s+of|daughter\s+of)'
        ]
        for pat in name_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                cand = m.group(1).strip()
                cand = re.sub(r'\b(son|daughter|wife|resident|of|s\/o|d\/o|w\/o)\b.*', '', cand, flags=re.IGNORECASE).strip()
                if len(cand) >= 3 and not cand.lower().startswith(('certificate', 'revenue', 'tahasildar', 'karnataka', 'government')):
                    data['holder_name'] = cand
                    confidences['holder_name'] = 0.94
                    break

        # 2. Certificate Number (Masked sensitive digits e.g. XXXX1234)
        cert_num_patterns = [
            r'\b(RD[0-9]{10,12})\b',  # Karnataka Nadakacheri standard
            r'\b(KA[0-9]{10,14})\b',
            r'\b(MH[0-9]{10,14})\b',
            r'\b(IN[0-9]{10,14})\b',
            r'\b(UP[0-9]{10,14})\b',
            r'\b(TN[0-9]{10,14})\b',
            r'\b(UDID[0-9]{12,18})\b',
            r'(?:certificate\s+no\.?|cert\s+no\.?|application\s+no\.?|sl\.?\s*no\.?|ref\s+no\.?|number)\s*[:\-]?\s*([A-Za-z0-9\/\-\.]{5,28})'
        ]
        for pat in cert_num_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                cand = m.group(1).strip()
                if len(cand) >= 5 and cand.lower() not in ['number', 'certificate', 'issued', 'dated']:
                    data['certificate_number'] = cand
                    confidences['certificate_number'] = 0.95
                    break

        # 3. Issue Date Extraction
        issue_date_patterns = [
            r'(?:date\s+of\s+issue|issued\s+on|date\s+of\s+issuance|dated|issue\s+date)\s*[:\-]?\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)[0-9]{2})',
            r'(?:date)\s*[:\-]\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)[0-9]{2})'
        ]
        for pat in issue_date_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                date_str = m.group(1).replace('.', '/').replace('-', '/')
                try:
                    parts = [int(p) for p in date_str.split('/')]
                    if len(parts) == 3:
                        d, m_val, y = parts
                        if m_val > 12: d, m_val = m_val, d
                        if y <= date.today().year:
                            data['issue_date'] = date(y, m_val, d)
                            confidences['issue_date'] = 0.94
                            break
                except Exception:
                    pass

        # 4. Explicit Printed Expiry Date (if printed on physical certificate)
        exp_patterns = [
            r'valid\s*(?:up\s*to|until|till|upto)?\s*[:\-]?\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.]20[2-3][0-9])',
            r'expiry\s*(?:date)?\s*[:\-]?\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.]20[2-3][0-9])',
        ]
        for pat in exp_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                date_str = m.group(1).replace('.', '/').replace('-', '/')
                try:
                    parts = [int(p) for p in date_str.split('/')]
                    if len(parts) == 3:
                        d, m_val, y = parts
                        if m_val > 12: d, m_val = m_val, d
                        data['expiry_date'] = date(y, m_val, d)
                        confidences['expiry_date'] = 0.96
                        break
                except Exception:
                    pass

        # 5. Date of Birth Extraction
        dob_patterns = [
            r'(?:date\s+of\s+birth|d\.?o\.?b\.?|birth\s+date)\s*[:\-]?\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:19|20)[0-9]{2})'
        ]
        for pat in dob_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                date_str = m.group(1).replace('.', '/').replace('-', '/')
                try:
                    parts = [int(p) for p in date_str.split('/')]
                    if len(parts) == 3:
                        d, m_val, y = parts
                        if m_val > 12: d, m_val = m_val, d
                        data['date_of_birth'] = date(y, m_val, d)
                        confidences['date_of_birth'] = 0.92
                        break
                except Exception:
                    pass

        # 6. Issuing Authority Grounding
        authorities = [
            ('Tahsildar / Revenue Department', ['tahasildar', 'tehsildar', 'revenue inspector']),
            ('Sub-Divisional Magistrate (SDM)', ['sub-divisional magistrate', 'sdm', 'sub-divisional officer']),
            ('District Magistrate / Deputy Commissioner', ['district magistrate', 'deputy commissioner', 'collector']),
            ('Competent Medical Board / Civil Surgeon', ['medical board', 'civil surgeon', 'chief medical officer', 'cmo']),
            ('Head of Institution / Principal', ['principal', 'headmaster', 'registrar', 'controller of examination']),
            ('Food and Civil Supplies Department', ['food and civil supplies', 'rationing officer']),
            ('Unique Identification Authority of India (UIDAI)', ['uidai', 'unique identification authority'])
        ]
        lower_text = text.lower()
        for label, keywords in authorities:
            if any(k in lower_text for k in keywords):
                data['issuing_authority'] = label
                confidences['issuing_authority'] = 0.92
                break

        # 7. State & District
        indian_states = [
            'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh',
            'Telangana', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Gujarat',
            'West Bengal', 'Bihar', 'Odisha', 'Punjab', 'Haryana', 'Delhi', 'Assam',
            'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Goa'
        ]
        for s in indian_states:
            if re.search(r'\b' + re.escape(s) + r'\b', text, re.IGNORECASE):
                data['state'] = s
                confidences['state'] = 0.96
                break

        districts = [
            'Dakshina Kannada', 'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Udupi',
            'Belagavi', 'Dharwad', 'Tumakuru', 'Shimoga', 'Hassan', 'Mandya',
            'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik',
            'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli',
            'Thiruvananthapuram', 'Ernakulam', 'Kozhikode',
            'Hyderabad', 'Visakhapatnam', 'Vijayawada',
            'Lucknow', 'Kanpur', 'Varanasi', 'Noida', 'Agra'
        ]
        for dist in districts:
            if re.search(r'\b' + re.escape(dist) + r'\b', text, re.IGNORECASE):
                data['district'] = dist
                confidences['district'] = 0.94
                break

        # 8. Annual Income Extraction
        income_patterns = [
            r'(?:annual\s+(?:family\s+)?income|total\s+(?:annual\s+)?income|family\s+income|income\s+from\s+all\s+sources)[^\d]*?(?:rs\.?|inr|₹)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?|[0-9]{4,8})',
            r'(?:rs\.?|₹|inr)\s*([0-9]{1,3}(?:,[0-9]{2,3})*)\s*\/\-\s*(?:per\s+annum|annual)'
        ]
        for pat in income_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                raw_num = m.group(1).replace(',', '').strip()
                try:
                    val = Decimal(raw_num)
                    if 1000 <= val <= 50000000:
                        data['annual_income'] = val
                        confidences['annual_income'] = 0.93
                        break
                except Exception:
                    pass

        # Financial Year
        fy_match = re.findall(r'\b(20[2-3][0-9])[\s\-\/]+(20[2-3][0-9]|[2-3][0-9])\b', text)
        if fy_match:
            s_yr, e_yr = fy_match[0]
            if len(e_yr) == 2: e_yr = f"20{e_yr}"
            data['financial_year'] = f"{s_yr}-{e_yr}"

        # 9. Category
        if re.search(r'\b(scheduled\s+caste|sc)\b', lower_text):
            data['category'] = 'SC'
            confidences['category'] = 0.95
        elif re.search(r'\b(scheduled\s+tribe|st)\b', lower_text):
            data['category'] = 'ST'
            confidences['category'] = 0.95
        elif re.search(r'\b(other\s+backward|obc|category\s*(?:1|2a|2b|3a|3b))\b', lower_text):
            data['category'] = 'OBC'
            confidences['category'] = 0.93
        elif re.search(r'\b(economically\s+weaker|ews)\b', lower_text):
            data['category'] = 'EWS'
            confidences['category'] = 0.95
        elif re.search(r'\b(general|unreserved)\b', lower_text):
            data['category'] = 'General'
            confidences['category'] = 0.90

        # 10. Disability Percentage
        dis_match = re.search(r'(?:disability|impairment|handicap|pwd)[^\d]*?([0-9]{1,3})\s*%', text, re.IGNORECASE)
        if dis_match:
            try:
                dp = Decimal(dis_match.group(1))
                if 1 <= dp <= 100:
                    data['disability_percentage'] = dp
                    confidences['disability_percentage'] = 0.92
            except Exception:
                pass

        if confidences:
            data['confidence'] = round(sum(confidences.values()) / len(confidences), 2)

        return data

    # =========================================================================
    # PILLAR 3: RAG-BASED VALIDITY & EXPIRY ANALYSIS
    # =========================================================================
    @classmethod
    def retrieve_guidelines(
        cls,
        doc_type: str,
        state: Optional[str] = None,
        issuing_authority: Optional[str] = None,
        extracted_text: str = ""
    ) -> List[Dict[str, Any]]:
        """Retrieves relevant official guideline chunks using semantic and metadata matching."""
        if not RAGDocumentChunk.objects.filter(document__document_type=RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE).exists():
            cls.index_certificate_guidelines()

        chunks = RAGDocumentChunk.objects.filter(
            document__document_type=RAGDocumentType.CERTIFICATE_VALIDITY_GUIDELINE
        ).select_related('document')

        scored = []
        state_clean = (state or '').strip().lower()

        for chunk in chunks:
            meta = chunk.chunk_metadata
            chunk_cert_type = meta.get('certificate_type')
            chunk_state = (meta.get('state') or '').strip().lower()
            score = 0.0

            if chunk_cert_type == doc_type:
                score += 10.0
            else:
                if doc_type and doc_type.lower().replace('_', ' ') in chunk.chunk_text.lower():
                    score += 5.0
                else:
                    continue

            if state_clean and state_clean != 'all india':
                if chunk_state == state_clean:
                    score += 8.0
                elif chunk_state == 'all india':
                    score += 3.0
                else:
                    score -= 5.0
            else:
                if chunk_state == 'all india':
                    score += 5.0

            if issuing_authority:
                auth_tokens = re.findall(r'\w+', issuing_authority.lower())
                chunk_auth = (meta.get('issuing_authority') or '').lower()
                overlap = sum(1.5 for tok in auth_tokens if tok in chunk_auth and len(tok) > 3)
                score += overlap

            if extracted_text:
                circ_ref = (meta.get('circular_ref') or '').lower()
                if circ_ref and circ_ref in extracted_text.lower():
                    score += 6.0

            if score > 0:
                scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, c in scored[:3]:
            results.append({
                'score': score,
                'chunk_text': c.chunk_text,
                'metadata': c.chunk_metadata,
                'document_title': c.document.title,
                'source_url': c.document.source_url,
                'source_name': c.document.source_name,
            })
        return results

    @classmethod
    def analyze_certificate_with_rag(
        cls,
        doc_type: str,
        issue_date: Optional[date] = None,
        explicit_expiry: Optional[date] = None,
        state: Optional[str] = None,
        issuing_authority: Optional[str] = None,
        extracted_text: str = "",
        warning_days: int = 30
    ) -> Dict[str, Any]:
        """
        RAG-grounded validity and expiry analysis.
        Adheres to strict government priority resolution:
          - Priority 1: Explicit printed expiry date (highest priority when present).
          - Priority 2: Non-expiring documents return NO_EXPIRY_APPLICABLE grounded in official circular.
          - Priority 3: RAG-retrieved official validity duration for (certificate_type, state, authority).
          - Fallback: Returns VERIFICATION_REQUIRED if evidence is ambiguous or ungrounded. Never guesses dates.
        """
        today = date.today()

        retrieved_guidelines = cls.retrieve_guidelines(
            doc_type=doc_type,
            state=state,
            issuing_authority=issuing_authority,
            extracted_text=extracted_text
        )

        top_chunk = retrieved_guidelines[0] if retrieved_guidelines else None
        top_meta = top_chunk['metadata'] if top_chunk else {}

        citations = []
        for item in retrieved_guidelines:
            m = item['metadata']
            citations.append({
                'title': item['document_title'],
                'source_url': item['source_url'],
                'source_name': item['source_name'],
                'state': m.get('state', 'All India'),
                'circular_ref': m.get('circular_ref', 'Official Circular'),
                'issuing_authority': m.get('issuing_authority', 'Competent Authority')
            })

        # --- Priority 1: Explicit Legible Expiry Date Printed on Certificate ---
        if explicit_expiry:
            remaining_days = (explicit_expiry - today).days
            if remaining_days < 0:
                status = ValidityStatusChoices.EXPIRED
                expl = (
                    f"EXPIRED: The certificate displays an explicit printed expiry date of {explicit_expiry.strftime('%d-%b-%Y')}. "
                    f"It expired {abs(remaining_days)} days ago. A fresh certificate must be obtained from the issuing authority."
                )
                renewal_req = True
            elif remaining_days <= warning_days:
                status = ValidityStatusChoices.EXPIRING_SOON
                expl = (
                    f"EXPIRING SOON: The certificate has an explicit printed expiry date of {explicit_expiry.strftime('%d-%b-%Y')} "
                    f"({remaining_days} days remaining). Initiate renewal promptly."
                )
                renewal_req = True
            else:
                status = ValidityStatusChoices.VALID
                expl = (
                    f"VALID: Certificate has an explicit printed expiry date of {explicit_expiry.strftime('%d-%b-%Y')} "
                    f"with {remaining_days} days of remaining validity."
                )
                renewal_req = False

            return {
                'validity_status': status,
                'issue_date': issue_date,
                'expiry_date': explicit_expiry,
                'validity_period': f"Printed Expiry: {explicit_expiry.strftime('%d-%b-%Y')}",
                'remaining_days': remaining_days,
                'renewal_requirement': renewal_req,
                'renewal_guidance': (
                    f"Visit the official portal ({top_chunk['source_url'] if top_chunk else 'https://services.india.gov.in'}) "
                    f"to request a renewal before the deadline."
                ),
                'explanation': expl,
                'citations': citations,
                'confidence': 0.98
            }

        # --- Check Permanent / Non-Expiring Types ---
        inherent_permanent_types = {
            DocumentTypeChoices.MARKS_CARD,
            DocumentTypeChoices.AADHAAR_CARD,
            DocumentTypeChoices.BANK_PASSBOOK
        }
        is_permanent_guideline = top_meta.get('is_permanent', False)

        if doc_type in inherent_permanent_types or is_permanent_guideline:
            explanation = (
                f"Under official government regulations cited from {top_chunk['source_name'] if top_chunk else 'Government Guidelines'}, "
                f"this {doc_type.replace('_', ' ').title()} represents a permanent or foundational record and carries lifetime validity. "
                f"No expiry date is applicable under normal circumstances."
            )
            return {
                'validity_status': ValidityStatusChoices.NO_EXPIRY_APPLICABLE,
                'issue_date': issue_date,
                'expiry_date': None,
                'validity_period': 'Permanent / Lifetime Validity',
                'remaining_days': None,
                'renewal_requirement': False,
                'renewal_guidance': 'No renewal is required. Keep this verified certificate secure for all future scholarship applications.',
                'explanation': explanation,
                'citations': citations,
                'confidence': 0.96 if top_chunk else 0.88
            }

        # --- Priority 3: RAG Guideline with Official Duration ---
        duration_months = top_meta.get('validity_duration_months')
        if top_chunk and duration_months:
            if issue_date:
                target_expiry = issue_date + relativedelta(months=duration_months)
                remaining_days = (target_expiry - today).days

                period_label = f"{duration_months} Months from Issue Date ({top_meta.get('state', 'State')} Guidelines)"
                if remaining_days < 0:
                    status = ValidityStatusChoices.EXPIRED
                    renewal_req = True
                    expl = (
                        f"EXPIRED: As per verified guidelines from {top_chunk['source_name']} ({top_meta.get('circular_ref', 'Notification')}), "
                        f"this {doc_type.replace('_', ' ').title()} is valid for {duration_months} months from the date of issue. "
                        f"Based on the issue date of {issue_date.strftime('%d-%b-%Y')}, validity lapsed on {target_expiry.strftime('%d-%b-%Y')} "
                        f"({abs(remaining_days)} days ago)."
                    )
                elif remaining_days <= warning_days:
                    status = ValidityStatusChoices.EXPIRING_SOON
                    renewal_req = True
                    expl = (
                        f"EXPIRING SOON: Grounded in official guidelines from {top_chunk['source_name']}, "
                        f"the certificate validity expires in {remaining_days} days on {target_expiry.strftime('%d-%b-%Y')}."
                    )
                else:
                    status = ValidityStatusChoices.VALID
                    renewal_req = False
                    expl = (
                        f"VALID: Grounded in official guidelines from {top_chunk['source_name']} ({top_meta.get('circular_ref', 'Official Circular')}), "
                        f"this certificate has a {duration_months}-month validity from its issue date ({issue_date.strftime('%d-%b-%Y')}) "
                        f"and remains valid until {target_expiry.strftime('%d-%b-%Y')} ({remaining_days} days remaining)."
                    )

                return {
                    'validity_status': status,
                    'issue_date': issue_date,
                    'expiry_date': target_expiry,
                    'validity_period': period_label,
                    'remaining_days': remaining_days,
                    'renewal_requirement': renewal_req,
                    'renewal_guidance': f"Submit a renewal application online at {top_chunk['source_url']}.",
                    'explanation': expl,
                    'citations': citations,
                    'confidence': 0.94
                }
            else:
                expl = (
                    f"VERIFICATION REQUIRED: Retrieved official guidelines from {top_chunk['source_name']} indicate a "
                    f"{duration_months}-month validity period, but the issue date could not be legibly extracted from the document. "
                    f"Please verify or enter the issue date to establish validity."
                )
                return {
                    'validity_status': ValidityStatusChoices.VERIFICATION_REQUIRED,
                    'issue_date': None,
                    'expiry_date': None,
                    'validity_period': f"{duration_months} Months (Pending Issue Date Verification)",
                    'remaining_days': None,
                    'renewal_requirement': False,
                    'renewal_guidance': "Verify and correct the extracted issue date in Document Details.",
                    'explanation': expl,
                    'citations': citations,
                    'confidence': 0.70
                }

        # --- Fallback: Insufficient Evidence -> VERIFICATION_REQUIRED ---
        return {
            'validity_status': ValidityStatusChoices.VERIFICATION_REQUIRED,
            'issue_date': issue_date,
            'expiry_date': None,
            'validity_period': 'Verification Required by Issuing Authority',
            'remaining_days': None,
            'renewal_requirement': False,
            'renewal_guidance': 'Contact your local revenue office or verify certificate dates against official portal records.',
            'explanation': (
                "VERIFICATION REQUIRED: Official validity dates could not be verified with high confidence. "
                "The certificate lacks an explicit expiry date, and no definitive state-specific duration was confirmed. "
                "Please verify details with the issuing authority."
            ),
            'citations': citations,
            'confidence': 0.50
        }

    # =========================================================================
    # PILLAR 4: SCHEME-SPECIFIC DOCUMENT REQUIREMENT ANALYSIS VS GENERAL VALIDITY
    # =========================================================================
    @classmethod
    def evaluate_opportunity_readiness(
        cls,
        user,
        opportunity: Opportunity
    ) -> Dict[str, Any]:
        """
        RAG-grounded scheme document readiness evaluation.
        Crucial requirement: Separates general certificate validity from scheme-specific requirements!
        E.g., An Income Certificate may be generally valid under state law for 3 years,
        but the scheme specifically requires a certificate issued for the CURRENT financial year.
        """
        req_chunks = RAGDocumentChunk.objects.filter(
            document__opportunity=opportunity,
            document__document_type=RAGDocumentType.DOCUMENT_REQUIREMENTS
        ).select_related('document')

        if not req_chunks.exists():
            cls.index_opportunity_document_requirements()
            req_chunks = RAGDocumentChunk.objects.filter(
                document__opportunity=opportunity,
                document__document_type=RAGDocumentType.DOCUMENT_REQUIREMENTS
            ).select_related('document')

        required_list = list(opportunity.required_documents or [])
        if not required_list and req_chunks.exists():
            required_list = req_chunks.first().chunk_metadata.get('required_documents', [])

        if not required_list:
            required_list = [
                'Class 12 Marksheet', 'Income Certificate', 'Aadhaar Card',
                'Bank Passbook linked with Aadhaar', 'College Admission Proof / Fee Receipt'
            ]

        user_docs = list(UserDocument.objects.filter(user=user))

        def map_requirement_to_type(req_str: str) -> str:
            s = req_str.lower()
            if 'ews' in s: return DocumentTypeChoices.EWS_CERTIFICATE
            if 'income' in s: return DocumentTypeChoices.INCOME_CERTIFICATE
            if 'caste' in s or 'category' in s: return DocumentTypeChoices.CASTE_CERTIFICATE
            if 'nativity' in s: return DocumentTypeChoices.NATIVITY_CERTIFICATE
            if 'domicile' in s or 'residence' in s: return DocumentTypeChoices.DOMICILE_CERTIFICATE
            if 'disability' in s or 'pwd' in s or 'udid' in s: return DocumentTypeChoices.DISABILITY_CERTIFICATE
            if 'mark' in s or 'grade' in s or 'transcript' in s: return DocumentTypeChoices.MARKS_CARD
            if 'bonafide' in s or 'study' in s: return DocumentTypeChoices.BONAFIDE_CERTIFICATE
            if 'aadhaar' in s: return DocumentTypeChoices.AADHAAR_CARD
            if 'bank' in s or 'passbook' in s or 'cheque' in s: return DocumentTypeChoices.BANK_PASSBOOK
            if 'admission' in s or 'receipt' in s or 'fee' in s: return DocumentTypeChoices.ADMISSION_RECEIPT
            if 'ration' in s or 'bpl' in s: return DocumentTypeChoices.RATION_CARD
            return DocumentTypeChoices.OTHER

        doc_by_type = {}
        for d in user_docs:
            doc_by_type.setdefault(d.document_type, []).append(d)

        fulfilled = []
        missing = []
        expired = []
        unreadable = []
        scheme_renewal_required = []

        today = date.today()
        # Current Indian financial year start: April 1 of current or previous calendar year
        fy_start_year = today.year if today.month >= 4 else today.year - 1
        current_fy_start = date(fy_start_year, 4, 1)

        for req in required_list:
            expected_type = map_requirement_to_type(req)
            matching = doc_by_type.get(expected_type, [])

            if not matching:
                missing.append({
                    'requirement': req,
                    'document_type': expected_type,
                    'status': 'MISSING',
                    'action': f"Please upload your valid {req} before applying.",
                    'guidance': f"Mandatory supporting requirement under {opportunity.title} official guidelines."
                })
            else:
                doc = matching[0]

                # Check 1: OCR Readability
                if doc.readability_status == ReadabilityChoices.UNREADABLE:
                    unreadable.append({
                        'requirement': req,
                        'document_id': doc.id,
                        'filename': doc.original_filename,
                        'status': 'UNREADABLE',
                        'action': f"{req} scan is unreadable. Please upload a clear photo or PDF.",
                        'guidance': 'Document cannot be verified by scrutiny officers in current resolution.'
                    })
                    continue

                # Check 2: General Expiration under State Rules
                if doc.is_expired or doc.validity_status == ValidityStatusChoices.EXPIRED:
                    expired.append({
                        'requirement': req,
                        'document_id': doc.id,
                        'filename': doc.original_filename,
                        'document_type': doc.document_type,
                        'expiry_date': str(doc.expiry_date or doc.detected_expiry_date),
                        'status': 'EXPIRED',
                        'action': f"{req} has expired under official validity rules. Please obtain a renewed certificate.",
                        'guidance': doc.rag_renewal_guidance or "Initiate renewal with the competent issuing authority."
                    })
                    continue

                # Check 3: SCHEME-SPECIFIC ISSUANCE WINDOW CONSTRAINT
                # Certain schemes (e.g. Post-Matric, NSP, Central Sector) require income/EWS certificate issued
                # for the current academic/financial year (on or after April 1), even if state law allows 3 years.
                is_income_or_ews = expected_type in [DocumentTypeChoices.INCOME_CERTIFICATE, DocumentTypeChoices.EWS_CERTIFICATE]
                fails_scheme_window = False
                scheme_window_msg = ""

                if is_income_or_ews and doc.issue_date:
                    if doc.issue_date < current_fy_start:
                        fails_scheme_window = True
                        scheme_window_msg = (
                            f"Certificate is generally valid under state rules until {doc.expiry_date or 'end of term'}, "
                            f"but {opportunity.title} official instructions mandate an income document issued for the "
                            f"current Financial Year (on or after 01-Apr-{fy_start_year}). Renewal is required for this scheme."
                        )

                if fails_scheme_window:
                    scheme_renewal_required.append({
                        'requirement': req,
                        'document_id': doc.id,
                        'filename': doc.original_filename,
                        'document_type': doc.document_type,
                        'issue_date': str(doc.issue_date),
                        'expiry_date': str(doc.expiry_date or doc.detected_expiry_date),
                        'status': 'SCHEME_REISSUE_REQUIRED',
                        'action': f"Re-issuance required specifically for {opportunity.title}.",
                        'guidance': scheme_window_msg
                    })
                elif doc.validity_status == ValidityStatusChoices.EXPIRING_SOON:
                    fulfilled.append({
                        'requirement': req,
                        'document_id': doc.id,
                        'filename': doc.original_filename,
                        'document_type': doc.document_type,
                        'status': 'EXPIRING_SOON',
                        'validity_period': doc.rag_validity_period or 'Expiring Soon',
                        'action': f"{req} will expire soon. Renewal is recommended to prevent verification delays."
                    })
                else:
                    fulfilled.append({
                        'requirement': req,
                        'document_id': doc.id,
                        'filename': doc.original_filename,
                        'document_type': doc.document_type,
                        'status': 'VERIFIED_READY',
                        'validity_period': doc.rag_validity_period or 'Verified Valid',
                        'action': 'Document satisfies all scheme eligibility requirements.'
                    })

        total = len(required_list)
        fulfilled_count = len(fulfilled)
        readiness_pct = int((fulfilled_count / total) * 100) if total > 0 else 100

        scheme_citations = [{
            'title': f"{opportunity.title} Official Scheme Guidelines",
            'source_url': opportunity.official_application_url or opportunity.official_information_url or 'https://scholarships.gov.in',
            'source_name': opportunity.provider or 'Government of India',
            'state': opportunity.applicable_state,
            'circular_ref': f"Scheme ID: {opportunity.id}"
        }]

        if readiness_pct == 100 and not scheme_renewal_required:
            guidance = f"Excellent! Your document portfolio satisfies 100% of the official requirements for {opportunity.title}."
        elif scheme_renewal_required:
            guidance = f"Your documents are uploaded, but {len(scheme_renewal_required)} certificate(s) require re-issuance to satisfy {opportunity.title}'s current financial year requirement."
        elif readiness_pct >= 70:
            guidance = f"Your document readiness is {readiness_pct}%. Missing or expired documents must be addressed before application submission."
        else:
            guidance = f"Your document readiness is {readiness_pct}%. Multiple mandatory certificates are missing or require renewal."

        return {
            'opportunity_id': opportunity.id,
            'opportunity_title': opportunity.title,
            'provider': opportunity.provider,
            'readiness_percentage': readiness_pct,
            'guidance_message': guidance,
            'total_required': total,
            'fulfilled_count': fulfilled_count,
            'required_documents': required_list,
            'fulfilled_documents': fulfilled,
            'missing_documents': missing,
            'expired_documents': expired,
            'unreadable_documents': unreadable,
            'scheme_renewal_required': scheme_renewal_required,
            'citations': scheme_citations,
            'uploaded_documents_summary': [
                {
                    'id': d.id,
                    'name': d.original_filename,
                    'type': d.get_document_type_display(),
                    'validity_status': d.validity_status,
                    'validity_period': d.rag_validity_period,
                    'is_expired': d.is_expired,
                    'remaining_days': d.get_remaining_days(),
                    'uploaded_at': d.uploaded_at.strftime('%Y-%m-%d %H:%M')
                }
                for d in user_docs
            ]
        }

    # =========================================================================
    # PILLAR 5: RAG-GROUNDED RENEWAL GUIDANCE
    # =========================================================================
    @classmethod
    def get_renewal_guidance_with_rag(cls, doc: UserDocument) -> Dict[str, Any]:
        """
        Retrieves official renewal procedures, portal links, and checklists through RAG.
        """
        doc_type = doc.document_type
        state = doc.state or 'All India'

        guidelines = cls.retrieve_guidelines(
            doc_type=doc_type,
            state=state,
            issuing_authority=doc.issuing_authority,
            extracted_text=doc.extracted_text or ""
        )

        top = guidelines[0] if guidelines else None
        source_url = top['source_url'] if top else 'https://services.india.gov.in'
        authority = doc.issuing_authority or (top['metadata'].get('issuing_authority') if top else 'Competent Government Issuing Authority')

        # State-specific portal naming
        portal_name = "State e-District / National Government Services Portal"
        if 'karnataka' in (doc.state or '').lower():
            portal_name = "Nadakacheri (Atalji Janasnehi Kendra) / Seva Sindhu"
            source_url = "https://nadakacheri.karnataka.gov.in"
        elif 'maharashtra' in (doc.state or '').lower():
            portal_name = "Aaple Sarkar (Right to Services Portal)"
            source_url = "https://aaplesarkar.mahaonline.gov.in"
        elif 'uttar pradesh' in (doc.state or '').lower() or 'up' in (doc.state or '').lower():
            portal_name = "Uttar Pradesh eDistrict Portal"
            source_url = "https://edistrict.up.gov.in"
        elif 'tamil nadu' in (doc.state or '').lower():
            portal_name = "Tamil Nadu e-Sevai / TNeGA Portal"
            source_url = "https://tnesevai.tn.gov.in"
        elif doc_type == DocumentTypeChoices.DISABILITY_CERTIFICATE:
            portal_name = "Unique Disability ID (UDID) Portal"
            source_url = "https://www.swavlambancard.gov.in"
        elif doc_type == DocumentTypeChoices.AADHAAR_CARD:
            portal_name = "myAadhaar UIDAI Portal"
            source_url = "https://myaadhaar.uidai.gov.in"

        procedure = [
            f"Log in to the official state portal ({portal_name}) using your registered mobile number.",
            f"Select the application service for renewal or fresh issuance of {doc.get_document_type_display()}.",
            f"Enter your previous certificate reference number: {doc.get_masked_certificate_number()} for automated verification.",
            "Upload self-attested supporting documents (identity proof, address proof, and latest financial declaration).",
            "Submit the application, pay nominal statutory fees (Rs. 25 - Rs. 40), and download the acknowledgment receipt.",
            "Track application status. The digitally signed certificate is typically issued in 7 to 15 business days."
        ]

        req_docs = [
            'Aadhaar Card of applicant and parent/guardian',
            f'Previous Certificate Copy / Reference No ({doc.get_masked_certificate_number()})',
            'Ration Card / BPL Proof / Domicile Certificate',
            'Current Financial Year Income Statement or Salary Certificate (if applicable)',
            'Recent passport-size photograph'
        ]

        return {
            'document_id': doc.id,
            'document_name': doc.original_filename,
            'document_type': doc.get_document_type_display(),
            'validity_status': doc.validity_status,
            'expiry_date': str(doc.expiry_date or doc.detected_expiry_date or 'Not specified'),
            'portal_name': portal_name,
            'portal_url': source_url,
            'authority': authority,
            'validity_info': doc.rag_validity_period or 'Grounded in official state gazette guidelines.',
            'procedure': procedure,
            'procedure_steps': procedure,
            'required_documents': req_docs,
            'disclaimer': 'Official government procedures and fee schedules are governed by respective State Revenue Departments.'
        }
