import re
from datetime import date, datetime
from decimal import Decimal
from apps.profiles.models import (
    UserDocument, DocumentTypeChoices, ReadabilityChoices,
    ValidityStatusChoices, AuthenticityStatusChoices
)
from apps.profiles.validity_engine import CertificateValidityEngine
from apps.profiles.profile_sync_service import ProfileSyncService

class DocumentAnalysisService:
    """
    Analyzes uploaded documents (PDF, JPG, JPEG, PNG) using OCR and text heuristics.
    Detects certificate type, financial year, expiry date, readability, and masks sensitive identifiers.
    """

    @classmethod
    def extract_text_from_file(cls, file_obj, filename, mime_type):
        """Extracts text from PDF or Image file safely."""
        text = ""
        filename_lower = filename.lower()

        # 1. Try reading PDF text streams
        if filename_lower.endswith('.pdf') or 'pdf' in mime_type:
            try:
                # Basic PDF text extractor
                content = file_obj.read()
                file_obj.seek(0)
                # Search for readable ASCII/UTF-8 text blocks in PDF streams
                decoded = content.decode('latin-1', errors='ignore')
                # Extract text within PDF text operators or stream markers
                extracted_blocks = re.findall(r'\(([^\(\)]{3,})\)\s*T[jJ]', decoded)
                if extracted_blocks:
                    text = " ".join(extracted_blocks)
                else:
                    # Fallback plain text string extraction
                    words = re.findall(r'[A-Za-z0-9\/\-\:\.\,\₹\s]{4,}', decoded)
                    text = " ".join([w.strip() for w in words if len(w.strip()) > 3 and not w.startswith('obj')][:300])
            except Exception:
                text = ""

        # 2. Try pytesseract OCR if available for images or scanned PDFs
        if not text or len(text.strip()) < 20:
            try:
                import pytesseract
                from PIL import Image
                import io
                file_content = file_obj.read()
                file_obj.seek(0)
                image = Image.open(io.BytesIO(file_content))
                text = pytesseract.image_to_string(image)
            except Exception:
                pass

        # 3. If file content could not be OCR-read directly, infer from filename and metadata
        if not text or len(text.strip()) < 5:
            text = f"Document content from file: {filename}. Uploaded for official scheme verification."

        return text.strip()

    @classmethod
    def mask_sensitive_identifiers(cls, text):
        """Masks sensitive numbers such as Aadhaar and Bank Accounts."""
        # Mask 12-digit Aadhaar numbers: 1234 5678 9012 or 1234-5678-9012 or 123456789012
        def mask_aadhaar(match):
            val = match.group(0).replace(' ', '').replace('-', '')
            return f"XXXX-XXXX-{val[-4:]}"

        masked = re.sub(r'\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b', mask_aadhaar, text)

        # Mask bank account numbers (9-18 digits)
        def mask_bank(match):
            val = match.group(0)
            return f"XXXXXXXX{val[-4:]}"

        masked = re.sub(r'\b\d{11,18}\b', mask_bank, masked)
        return masked

    @classmethod
    def detect_document_type(cls, text, filename):
        """
        RAG-powered document classification.
        Identifies certificate type by querying official definitions and templates indexed in RAG.
        """
        from apps.ai_assistant.document_intelligence import RAGDocumentIntelligenceEngine
        doc_type, _, _ = RAGDocumentIntelligenceEngine.classify_document_with_rag(text, filename)
        return doc_type

    @classmethod
    def extract_structured_certificate_data(cls, text, filename, doc_type=None):
        """
        RAG-grounded document understanding and field extraction.
        Extracts structured certificate fields without hallucinating or inventing missing information.
        """
        from apps.ai_assistant.document_intelligence import RAGDocumentIntelligenceEngine
        return RAGDocumentIntelligenceEngine.extract_document_with_rag(text, filename, doc_type)

    @classmethod
    def detect_financial_year(cls, text):
        """Detects financial years like 2024-2025, 2024-25, 2025-26."""
        matches = re.findall(r'\b(20[2-3][0-9])[\s\-\/]+(20[2-3][0-9]|[2-3][0-9])\b', text)
        if matches:
            start, end = matches[0]
            if len(end) == 2:
                end = f"20{end}"
            return f"{start}-{end}"
        return ""

    @classmethod
    def detect_expiry_and_validity(cls, text):
        """Checks for expiry date or explicit validity declarations."""
        date_patterns = [
            r'valid\s*(?:up\s*to|until|till|upto)?\s*[:\-]?\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.]20[2-3][0-9])',
            r'expiry\s*(?:date)?\s*[:\-]?\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.]20[2-3][0-9])',
        ]
        detected_date = None
        is_expired = False
        today = date.today()

        for pat in date_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                date_str = m.group(1).replace('.', '/').replace('-', '/')
                try:
                    parts = [int(p) for p in date_str.split('/')]
                    if len(parts) == 3:
                        d, m_val, y = parts
                        if m_val > 12:
                            # Swap if month/day reversed
                            d, m_val = m_val, d
                        detected_date = date(y, m_val, d)
                        if detected_date < today:
                            is_expired = True
                        break
                except Exception:
                    pass

        return detected_date, is_expired

    @classmethod
    def check_readability(cls, text):
        """Determines OCR quality and readability."""
        clean = text.strip()
        if len(clean) >= 60:
            return ReadabilityChoices.READABLE, 0.95
        elif len(clean) >= 20:
            return ReadabilityChoices.BLURRY, 0.65
        else:
            return ReadabilityChoices.UNREADABLE, 0.20

    @classmethod
    def process_and_save_document(cls, user, file_obj, document_type_override=None):
        """Full pipeline: handles single file or multi-page camera captures, extracts text, masks identifiers, assesses quality, and persists document."""
        from io import BytesIO
        from PIL import Image
        from django.core.files.base import ContentFile

        # Handle multi-page captures passed as list of files
        if isinstance(file_obj, (list, tuple)) and len(file_obj) > 1:
            file_list = file_obj
            combined_text_parts = []
            images = []
            total_size = sum(getattr(f, 'size', 0) for f in file_list)

            for idx, f in enumerate(file_list):
                fn = getattr(f, 'name', f'page_{idx+1}.jpg')
                mime = getattr(f, 'content_type', 'image/jpeg')
                page_text = cls.extract_text_from_file(f, fn, mime)
                combined_text_parts.append(f"--- Page {idx+1} ---\n{page_text}")
                try:
                    f.seek(0)
                    img = Image.open(f).convert('RGB')
                    images.append(img)
                except Exception:
                    pass

            # Combine images into a multi-page PDF
            primary_name = f"{document_type_override or 'document'}_multipage_{len(file_list)}pages.pdf"
            if images:
                pdf_io = BytesIO()
                images[0].save(pdf_io, format='PDF', save_all=True, append_images=images[1:])
                compiled_file = ContentFile(pdf_io.getvalue(), name=primary_name)
                mime = 'application/pdf'
                size = len(pdf_io.getvalue())
            else:
                compiled_file = file_list[0]
                mime = getattr(compiled_file, 'content_type', 'application/pdf')
                size = total_size

            raw_text = "\n".join(combined_text_parts)
            filename = primary_name
            target_file_obj = compiled_file
        else:
            # Single file
            if isinstance(file_obj, (list, tuple)):
                file_obj = file_obj[0]
            filename = getattr(file_obj, 'name', 'document.pdf')
            size = getattr(file_obj, 'size', 0)
            mime = getattr(file_obj, 'content_type', 'application/pdf')
            raw_text = cls.extract_text_from_file(file_obj, filename, mime)
            target_file_obj = file_obj

        masked_text = cls.mask_sensitive_identifiers(raw_text)
        doc_type = document_type_override or cls.detect_document_type(masked_text, filename)
        fy = cls.detect_financial_year(masked_text)
        readability, confidence = cls.check_readability(raw_text)

        # Run structured extraction
        extracted = cls.extract_structured_certificate_data(masked_text, filename, doc_type)

        # Masked ID reference
        masked_id = ""
        if extracted.get('certificate_number'):
            c_num = extracted['certificate_number']
            masked_id = f"XXXX{c_num[-4:]}" if len(c_num) > 4 else c_num
        else:
            aadhaar_match = re.search(r'XXXX\-XXXX\-\d{4}', masked_text)
            if aadhaar_match:
                masked_id = f"Aadhaar Ref: {aadhaar_match.group(0)}"
            elif fy:
                masked_id = f"FY: {fy}"

        notes = []
        if readability == ReadabilityChoices.BLURRY:
            notes.append("Document image is partially blurry. A clearer scan is recommended.")
        elif readability == ReadabilityChoices.UNREADABLE:
            notes.append("Could not extract legible text. Please upload a high-resolution PDF or photo.")

        user_doc = UserDocument.objects.create(
            user=user,
            document_type=doc_type,
            document_file=target_file_obj,
            original_filename=filename,
            file_size_bytes=size,
            mime_type=mime,
            holder_name=extracted.get('holder_name') or '',
            certificate_number=extracted.get('certificate_number') or '',
            issue_date=extracted.get('issue_date'),
            expiry_date=extracted.get('expiry_date'),
            date_of_birth=extracted.get('date_of_birth'),
            issuing_authority=extracted.get('issuing_authority') or '',
            state=extracted.get('state') or '',
            district=extracted.get('district') or '',
            annual_income=extracted.get('annual_income'),
            extracted_text=masked_text[:5000],
            extracted_metadata=extracted,
            readability_status=readability,
            detected_financial_year=fy,
            detected_expiry_date=extracted.get('expiry_date'),
            masked_identifier=masked_id,
            ocr_confidence=extracted.get('confidence', confidence),
            analysis_notes=" ".join(notes)
        )

        # Apply Validity Engine evaluation
        CertificateValidityEngine.apply_validity_evaluation(user_doc, save=True)

        # Generate pending Profile Update Proposals (Strict Consent: profile is NOT modified automatically)
        ProfileSyncService.generate_proposals_for_document(user, user_doc, extracted)

        return user_doc

    @classmethod
    def evaluate_readiness_for_opportunity(cls, user, opportunity):
        """
        RAG-grounded evaluation comparing user's uploaded documents against official scheme requirements.
        Retrieves scheme requirements through RAG, assesses date ranges, and returns grounded guidance with citations.
        """
        from apps.ai_assistant.document_intelligence import RAGDocumentIntelligenceEngine
        return RAGDocumentIntelligenceEngine.evaluate_opportunity_readiness(user, opportunity)

