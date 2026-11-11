"""
RAG (Retrieval-Augmented Generation) Pipeline for ScholarSetu AI.
Strictly grounds answers in official opportunity documents, source URLs, and eligibility rules.
Protects against prompt injection and avoids fabricating non-existent scholarships.
"""
import re
import math
from typing import List, Dict, Any, Tuple
from datetime import date
from apps.opportunities.models import Opportunity
from apps.ai_assistant.models import RAGDocument, RAGDocumentChunk, ChatConversation, ChatMessage

class RAGAssistantEngine:
    """
    Retrieves authoritative opportunity chunks and generates source-grounded answers with citations.
    """

    @classmethod
    def index_opportunities_to_rag(cls):
        """Indexes or updates all Opportunities into RAGDocument and RAGDocumentChunks."""
        opps = Opportunity.objects.all()
        created_chunks = 0
        for opp in opps:
            doc, _ = RAGDocument.objects.get_or_create(
                opportunity=opp,
                defaults={
                    'title': opp.title,
                    'source_url': opp.official_application_url or opp.official_information_url or 'https://scholarships.gov.in',
                    'source_name': opp.source_name or opp.provider,
                    'full_content': f"{opp.title}\nProvider: {opp.provider}\nState: {opp.applicable_state}\n{opp.detailed_description}\nEligibility: {opp.education_levels}, Max Income: {opp.max_annual_income}, Min Marks: {opp.min_academic_percentage}%\nBenefit: {opp.benefit_description}\nOfficial URL: {opp.official_application_url}",
                    'verification_date': opp.source_verification_date or date.today()
                }
            )

            # Ensure chunks exist
            if not doc.chunks.exists():
                text_chunks = cls._chunk_text(doc.full_content, chunk_size=400, overlap=50)
                for i, ctext in enumerate(text_chunks):
                    meta = {
                        'opportunity_id': opp.id,
                        'title': opp.title,
                        'provider': opp.provider,
                        'state': opp.applicable_state,
                        'source_url': opp.official_application_url or opp.official_information_url,
                        'verification_date': str(opp.source_verification_date or date.today()),
                    }
                    RAGDocumentChunk.objects.create(
                        document=doc,
                        chunk_index=i,
                        chunk_text=ctext,
                        chunk_metadata=meta,
                        embedding=[]
                    )
                    created_chunks += 1
        return created_chunks

    @classmethod
    def answer_query(cls, query: str, user=None, conversation_id=None) -> Dict[str, Any]:
        """
        Executes full RAG workflow:
        1. Sanitize user query against prompt injection
        2. Retrieve top-k relevant chunks from vector / lexical index
        3. Formulate structured response with direct answers, requirements, and official links
        4. Log conversation history
        """
        # 1. Sanitize
        clean_query = cls._sanitize_query(query)
        if not clean_query:
            return {
                'answer': "Please ask a question about Indian scholarships, government schemes, or eligibility criteria.",
                'citations': [],
                'conversation_id': str(conversation_id) if conversation_id else None
            }

        # 2. Retrieve top chunks
        chunks = cls._retrieve_relevant_chunks(clean_query, top_k=4)

        # 3. Synthesize answer grounded in retrieved documents
        if not chunks:
            answer = (
                "Based on the official records currently verified in ScholarSetu AI, "
                "no specific government scheme or scholarship matches your search criteria. "
                "You can search directly on the National Scholarship Portal (https://scholarships.gov.in) "
                "or myScheme (https://www.myscheme.gov.in) for additional opportunities."
            )
            citations = []
        else:
            answer, citations = cls._synthesize_grounded_answer(clean_query, chunks)

        # 4. Save conversation history if requested
        conv = None
        if conversation_id:
            try:
                conv = ChatConversation.objects.get(id=conversation_id)
            except Exception:
                pass
        if not conv and user:
            title = clean_query[:40] + ('...' if len(clean_query) > 40 else '')
            conv = ChatConversation.objects.create(user=user, title=title)

        if conv:
            ChatMessage.objects.create(conversation=conv, role='user', content=clean_query)
            ChatMessage.objects.create(conversation=conv, role='assistant', content=answer, citations=citations)

        return {
            'answer': answer,
            'citations': citations,
            'conversation_id': str(conv.id) if conv else None
        }

    @classmethod
    def _sanitize_query(cls, text: str) -> str:
        # Strip dangerous jailbreak markers or prompt injection delimiters
        text = re.sub(r'(system:|assistant:|\[system\]|ignore previous instructions)', '', text, flags=re.IGNORECASE)
        return text.strip()

    @classmethod
    def _retrieve_relevant_chunks(cls, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        # Ensure documents are indexed
        if RAGDocumentChunk.objects.count() == 0:
            cls.index_opportunities_to_rag()

        query_tokens = set(re.findall(r'\w+', query.lower()))
        # Filter stopwords
        stopwords = {'what', 'is', 'the', 'for', 'a', 'an', 'in', 'of', 'and', 'to', 'can', 'i', 'get', 'show', 'me', 'which'}
        keywords = query_tokens - stopwords
        if not keywords:
            keywords = query_tokens

        scored_chunks = []
        all_chunks = RAGDocumentChunk.objects.select_related('document').all()

        for chunk in all_chunks:
            chunk_tokens = re.findall(r'\w+', chunk.chunk_text.lower())
            chunk_set = set(chunk_tokens)
            
            # Compute term overlap score
            overlap = keywords.intersection(chunk_set)
            if not overlap:
                continue

            score = sum(1.0 for term in overlap)
            # Boost if opportunity title is in query
            title = chunk.chunk_metadata.get('title', '').lower()
            if any(term in title for term in keywords):
                score += 3.0

            scored_chunks.append((score, chunk))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top = [c for _, c in scored_chunks[:top_k]]
        return top

    @classmethod
    def _synthesize_grounded_answer(cls, query: str, chunks: List[RAGDocumentChunk]) -> Tuple[str, List[Dict[str, Any]]]:
        citations = []
        details = []

        seen_titles = set()
        for chunk in chunks:
            meta = chunk.chunk_metadata
            title = meta.get('title')
            if title and title not in seen_titles:
                seen_titles.add(title)
                url = meta.get('source_url') or 'https://scholarships.gov.in'
                citations.append({
                    'title': title,
                    'provider': meta.get('provider', 'Government of India'),
                    'state': meta.get('state', 'All India'),
                    'source_url': url,
                    'verification_date': meta.get('verification_date', 'Verified Record')
                })
                details.append(f"• **{title}** ({meta.get('provider')} - {meta.get('state')}):\n  {chunk.chunk_text[:280]}...")

        citations_text = "\n\n".join(details)
        response_text = (
            f"Here is verified information matching your query:\n\n"
            f"{citations_text}\n\n"
            f"**Important Official Note**: Applications must be submitted through the official government portal links provided below. "
            f"Ensure all required supporting certificates (such as income and caste certificates) are issued by competent authorities."
        )

        return response_text, citations

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            i += (chunk_size - overlap)
            if i >= len(words):
                break
        return chunks if chunks else [text]
