from datetime import date
from apps.profiles.models import (
    UserDocument, CertificateValidityRule, DocumentTypeChoices,
    ValidityStatusChoices, AuthenticityStatusChoices
)
from apps.ai_assistant.document_intelligence import RAGDocumentIntelligenceEngine

class CertificateValidityEngine:
    """
    RAG-Powered Intelligent Certificate Validity Engine for Government Scheme Assist AI.
    Replaces static manual filters by retrieving official government guidelines, circulars,
    and gazettes through RAG (Retrieval-Augmented Generation).
    Strictly separates Date Validity from Government Authenticity.
    """

    DEFAULT_WARNING_DAYS = 30

    @classmethod
    def evaluate_document_validity(cls, doc: UserDocument) -> dict:
        """
        Evaluates a UserDocument using RAG-grounded intelligence.
        Returns complete validity assessment with citations, confidence, and grounded explanations.
        """
        warning_days = doc.warning_period_days or cls.DEFAULT_WARNING_DAYS
        target_expiry = doc.expiry_date or doc.detected_expiry_date

        rag_result = RAGDocumentIntelligenceEngine.analyze_certificate_with_rag(
            doc_type=doc.document_type,
            issue_date=doc.issue_date,
            explicit_expiry=target_expiry,
            state=doc.state,
            issuing_authority=doc.issuing_authority,
            extracted_text=doc.extracted_text or "",
            warning_days=warning_days
        )

        return {
            'validity_status': rag_result['validity_status'],
            'expiry_date': rag_result['expiry_date'],
            'remaining_days': rag_result['remaining_days'],
            'validity_source': rag_result['validity_period'],
            'authenticity_status': doc.authenticity_status or AuthenticityStatusChoices.AUTHENTICITY_NOT_VERIFIED,
            'notes': rag_result['explanation'],
            'rag_explanation': rag_result['explanation'],
            'rag_citations': rag_result['citations'],
            'rag_validity_period': rag_result['validity_period'],
            'rag_renewal_guidance': rag_result['renewal_guidance'],
            'retrieval_confidence': rag_result['confidence']
        }

    @classmethod
    def apply_validity_evaluation(cls, doc: UserDocument, save: bool = True) -> UserDocument:
        """Evaluates and updates the document model fields."""
        res = cls.evaluate_document_validity(doc)
        doc.validity_status = res['validity_status']
        if res['expiry_date']:
            doc.expiry_date = res['expiry_date']
            doc.detected_expiry_date = res['expiry_date']
        doc.is_expired = (res['validity_status'] == ValidityStatusChoices.EXPIRED)
        doc.rag_explanation = res.get('rag_explanation', '')
        doc.rag_citations = res.get('rag_citations', [])
        doc.rag_validity_period = res.get('rag_validity_period', '')
        doc.rag_renewal_guidance = res.get('rag_renewal_guidance', '')
        doc.retrieval_confidence = res.get('retrieval_confidence', 0.0)
        doc.analysis_notes = res.get('notes', doc.analysis_notes)

        if save:
            doc.save(update_fields=[
                'validity_status', 'expiry_date', 'detected_expiry_date', 'is_expired',
                'rag_explanation', 'rag_citations', 'rag_validity_period',
                'rag_renewal_guidance', 'retrieval_confidence', 'analysis_notes'
            ])
        return doc

    @classmethod
    def seed_default_rules(cls):
        """Seeds standard verified government certificate validity rules across India and indexes into RAG."""
        # Index guidelines into RAG vector and chunks
        RAGDocumentIntelligenceEngine.index_certificate_guidelines()

        rules_data = [
            # Central & All India Rules
            {
                'certificate_type': DocumentTypeChoices.EWS_CERTIFICATE,
                'state': 'All India',
                'validity_duration_months': 12,
                'has_no_general_expiry': False,
                'official_source_url': 'https://dopt.gov.in',
                'notes': 'Central EWS certificate is valid for 1 Financial Year (April 1 to March 31).'
            },
            {
                'certificate_type': DocumentTypeChoices.CASTE_CERTIFICATE,
                'state': 'All India',
                'validity_duration_months': None,
                'has_no_general_expiry': True,
                'official_source_url': 'https://socialjustice.gov.in',
                'notes': 'SC/ST certificates issued under central format carry lifetime validity.'
            },
            {
                'certificate_type': DocumentTypeChoices.DISABILITY_CERTIFICATE,
                'state': 'All India',
                'validity_duration_months': None,
                'has_no_general_expiry': True,
                'official_source_url': 'https://www.swavlambancard.gov.in',
                'notes': 'Permanent Disability UDID cards have lifetime validity. Temporary certificates valid for 5 years.'
            },
            {
                'certificate_type': DocumentTypeChoices.MARKS_CARD,
                'state': 'All India',
                'validity_duration_months': None,
                'has_no_general_expiry': True,
                'official_source_url': 'https://cbse.gov.in',
                'notes': 'Official marks sheets and grade transcripts have permanent validity.'
            },
            {
                'certificate_type': DocumentTypeChoices.AADHAAR_CARD,
                'state': 'All India',
                'validity_duration_months': None,
                'has_no_general_expiry': True,
                'official_source_url': 'https://uidai.gov.in',
                'notes': 'Aadhaar identity proof does not expire. Biometrics may require periodic update.'
            },
            {
                'certificate_type': DocumentTypeChoices.BONAFIDE_CERTIFICATE,
                'state': 'All India',
                'validity_duration_months': 12,
                'has_no_general_expiry': False,
                'official_source_url': 'https://education.gov.in',
                'notes': 'Bonafide / Study certificate is valid for the registered academic session (1 year).'
            },

            # Karnataka State Rules
            {
                'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
                'state': 'Karnataka',
                'validity_duration_months': 12,
                'has_no_general_expiry': False,
                'official_source_url': 'https://nadakacheri.karnataka.gov.in',
                'notes': 'Karnataka Revenue Department (Nadakacheri) Income Certificates have a 1-year validity from issue date.'
            },
            {
                'certificate_type': DocumentTypeChoices.CASTE_CERTIFICATE,
                'state': 'Karnataka',
                'validity_duration_months': None,
                'has_no_general_expiry': True,
                'official_source_url': 'https://nadakacheri.karnataka.gov.in',
                'notes': 'Karnataka Category-1, SC and ST caste certificates have lifetime validity.'
            },
            {
                'certificate_type': DocumentTypeChoices.DOMICILE_CERTIFICATE,
                'state': 'Karnataka',
                'validity_duration_months': 60,
                'has_no_general_expiry': False,
                'official_source_url': 'https://sevasindhu.karnataka.gov.in',
                'notes': 'Karnataka Residence / Domicile certificate is valid for 5 years.'
            },

            # Maharashtra State Rules
            {
                'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
                'state': 'Maharashtra',
                'validity_duration_months': 36,
                'has_no_general_expiry': False,
                'official_source_url': 'https://aaplesarkar.mahaonline.gov.in',
                'notes': 'Maharashtra Aaple Sarkar 3-year income certificate option is valid for 3 Financial Years.'
            },

            # Tamil Nadu State Rules
            {
                'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
                'state': 'Tamil Nadu',
                'validity_duration_months': 12,
                'has_no_general_expiry': False,
                'official_source_url': 'https://tnesevai.tn.gov.in',
                'notes': 'Tamil Nadu e-Sevai Income Certificate valid for 6 months to 1 year.'
            },

            # Uttar Pradesh State Rules
            {
                'certificate_type': DocumentTypeChoices.INCOME_CERTIFICATE,
                'state': 'Uttar Pradesh',
                'validity_duration_months': 36,
                'has_no_general_expiry': False,
                'official_source_url': 'https://edistrict.up.gov.in',
                'notes': 'UP eDistrict Income Certificate is valid for 3 years from the date of issuance.'
            },
        ]

        created_count = 0
        for r in rules_data:
            obj, created = CertificateValidityRule.objects.get_or_create(
                certificate_type=r['certificate_type'],
                state=r['state'],
                defaults={
                    'validity_duration_months': r.get('validity_duration_months'),
                    'has_no_general_expiry': r.get('has_no_general_expiry', False),
                    'official_source_url': r.get('official_source_url', ''),
                    'notes': r.get('notes', ''),
                    'is_active': True
                }
            )
            if created:
                created_count += 1
        return created_count
