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
        """Classifies document type based on keywords in extracted text and filename."""
        corpus = (text + " " + filename).lower()

        if any(k in corpus for k in ['rejection', 'rejected', 'ineligible', 'disqualified', 'reason for rejection', 'grounds']):
            return DocumentTypeChoices.REJECTION_LETTER
        if any(k in corpus for k in ['economically weaker', 'ews certificate', 'ews category', 'income and asset certificate for ews']):
            return DocumentTypeChoices.EWS_CERTIFICATE
        if any(k in corpus for k in ['income', 'tahasildar', 'tehsildar', 'annual family income', 'revenue department', 'pension income', 'gross annual income']):
            return DocumentTypeChoices.INCOME_CERTIFICATE
        if any(k in corpus for k in ['caste', 'community', 'scheduled caste', 'scheduled tribe', 'obc', 'tribal', 'jaati', 'category 1', 'category 2a', 'category 3a']):
            return DocumentTypeChoices.CASTE_CERTIFICATE
        if any(k in corpus for k in ['nativity', 'native of', 'nativity certificate']):
            return DocumentTypeChoices.NATIVITY_CERTIFICATE
        if any(k in corpus for k in ['residence certificate', 'resident of', 'residential certificate', 'residing at']):
            return DocumentTypeChoices.RESIDENCE_CERTIFICATE
        if any(k in corpus for k in ['domicile', 'bonafide resident', 'pramana patra', 'domicile certificate']):
            return DocumentTypeChoices.DOMICILE_CERTIFICATE
        if any(k in corpus for k in ['disability', 'udid', 'handicapped', 'pwd', 'locomotor', 'visual impairment', 'hearing', 'swavlamban']):
            return DocumentTypeChoices.DISABILITY_CERTIFICATE
        if any(k in corpus for k in ['marks', 'grade sheet', 'marksheet', 'transcript', 'examination', 'cgpa', 'semester', 'class 10', 'class 12', 'statement of marks']):
            return DocumentTypeChoices.MARKS_CARD
        if any(k in corpus for k in ['bonafide', 'study certificate', 'bonafide certificate', 'student bonafide']):
            return DocumentTypeChoices.BONAFIDE_CERTIFICATE
        if any(k in corpus for k in ['aadhaar', 'uidai', 'unique identification', 'mera aadhaar']):
            return DocumentTypeChoices.AADHAAR_CARD
        if any(k in corpus for k in ['passbook', 'ifsc', 'account number', 'bank of', 'savings bank', 'cheque']):
            return DocumentTypeChoices.BANK_PASSBOOK
        if any(k in corpus for k in ['ration card', 'bpl', 'antodaya', 'aay', 'food civil supplies']):
            return DocumentTypeChoices.RATION_CARD
        if any(k in corpus for k in ['admission', 'fee receipt', 'tuition receipt', 'college fee']):
            return DocumentTypeChoices.ADMISSION_RECEIPT

        return DocumentTypeChoices.OTHER

    @classmethod
    def extract_structured_certificate_data(cls, text, filename, doc_type=None):
        """
        AI & Heuristic Information Extraction from OCR output.
        Extracts structured certificate fields:
          - holder_name
          - certificate_number
          - issue_date
          - expiry_date
          - date_of_birth
          - issuing_authority
          - state
          - district
          - address
          - annual_income
          - category
          - disability_percentage
          - confidences per field
        NEVER invents missing information; returns null/None if unavailable.
        """
        clean_text = text.replace('\n', ' ')
        confidences = {}
        data = {
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
                # Clean extraneous words
                cand = re.sub(r'\b(son|daughter|wife|resident|of|s\/o|d\/o|w\/o)\b.*', '', cand, flags=re.IGNORECASE).strip()
                if len(cand) >= 3 and not cand.lower().startswith(('certificate', 'revenue', 'tahasildar', 'karnataka', 'government')):
                    data['holder_name'] = cand
                    confidences['holder_name'] = 0.92
                    break

        # 2. Certificate Number Extraction
        cert_num_patterns = [
            r'\b(RD[0-9]{10,12})\b',  # Karnataka Nadakacheri standard
            r'\b(KA[0-9]{10,14})\b',
            r'\b(MH[0-9]{10,14})\b',
            r'\b(IN[0-9]{10,14})\b',
            r'\b(UDID[0-9]{12,18})\b',
            r'(?:certificate\s+no\.?|cert\s+no\.?|application\s+no\.?|sl\.?\s*no\.?|ref\s+no\.?|number)\s*[:\-]?\s*([A-Za-z0-9\/\-\.]{5,28})'
        ]
        for pat in cert_num_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                cand = m.group(1).strip()
                if len(cand) >= 5 and not cand.lower() in ['number', 'certificate', 'issued', 'dated']:
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

        # 4. Expiry Date Extraction (Priority 1)
        exp_date, _ = cls.detect_expiry_and_validity(text)
        if exp_date:
            data['expiry_date'] = exp_date
            confidences['expiry_date'] = 0.95

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

        # 6. Issuing Authority Extraction
        authorities = [
            ('Tahsildar / Revenue Department', ['tahasildar', 'tehsildar', 'tahsildar']),
            ('Sub-Divisional Magistrate (SDM)', ['sub-divisional magistrate', 'sdm']),
            ('District Magistrate / Deputy Commissioner', ['district magistrate', 'deputy commissioner', 'collector']),
            ('Competent Medical Board / Civil Surgeon', ['medical board', 'civil surgeon', 'chief medical officer', 'cmo']),
            ('Head of Institution / Principal', ['principal', 'headmaster', 'registrar', 'controller of examination']),
            ('Food and Civil Supplies Department', ['food and civil supplies', 'rationing officer']),
            ('Unique Identification Authority of India', ['uidai', 'unique identification authority'])
        ]
        lower_text = text.lower()
        for label, keywords in authorities:
            if any(k in lower_text for k in keywords):
                data['issuing_authority'] = label
                confidences['issuing_authority'] = 0.90
                break

        # 7. State & District Extraction
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

        # 9. Category Extraction
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

        # 10. Disability Percentage Extraction
        dis_match = re.search(r'(?:disability|impairment|handicap|pwd)[^\d]*?([0-9]{1,3})\s*%', text, re.IGNORECASE)
        if dis_match:
            try:
                dp = Decimal(dis_match.group(1))
                if 1 <= dp <= 100:
                    data['disability_percentage'] = dp
                    confidences['disability_percentage'] = 0.92
            except Exception:
                pass

        # Overall average confidence
        if confidences:
            data['confidence'] = round(sum(confidences.values()) / len(confidences), 2)

        return data

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

