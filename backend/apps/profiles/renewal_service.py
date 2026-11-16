"""
RAG-Powered Certificate Renewal Guidance Service for ScholarSetu AI / Government Scheme Assist AI.
Retrieves official state-specific renewal procedures, portal links, required document checklists,
and instructions for expiring or expired certificates dynamically via RAG.
"""
from apps.profiles.models import UserDocument
from apps.ai_assistant.document_intelligence import RAGDocumentIntelligenceEngine


class CertificateRenewalService:
    """
    RAG-driven Certificate Renewal Guidance Service.
    Retrieves official government portal URLs, issuing authority details, and document checklists
    directly through RAG knowledge retrieval rather than static dictionaries.
    """

    @classmethod
    def get_guidance_for_document(cls, doc: UserDocument) -> dict:
        """
        Returns structured renewal guidance, checklist, and instructions for a document via RAG.
        """
        return RAGDocumentIntelligenceEngine.get_renewal_guidance_with_rag(doc)
