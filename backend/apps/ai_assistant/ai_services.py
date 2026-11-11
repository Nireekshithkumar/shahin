import re
from datetime import date
from decimal import Decimal
from apps.opportunities.models import Opportunity
from apps.profiles.models import UserProfile
from apps.ai_assistant.rag import RAGAssistantEngine

class VoiceAssistantEngine:
    """
    Multilingual Voice Assistant supporting Kannada (kn), Hindi (hi), and English (en).
    Parses intent, searches verified schemes, and generates spoken and written responses.
    """

    KANNADA_RESPONSES = {
        'greeting': "ನಮಸ್ಕಾರ! ಸ್ಕಾಲರ್‌ಸೇತು ಎಐ ಗೆ ಸುಸ್ವಾಗತ. ನೀವು ಯಾವ ವಿದ್ಯಾರ್ಥಿವೇತನ ಅಥವಾ ಸರ್ಕಾರಿ ಯೋಜನೆಯ ಬಗ್ಗೆ ಮಾಹಿತಿ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?",
        'eligibility': "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪ್ರಕಾರ, ನೀವು ಅರ್ಜಿ ಸಲ್ಲಿಸಬಹುದಾದ ಪ್ರಮುಖ ವಿದ್ಯಾರ್ಥಿವೇತನಗಳು ಇಲ್ಲಿವೆ.",
        'income': "ಆದಾಯ ಪ್ರಮಾಣಪತ್ರವು ನಿಮ್ಮ ತಹಶೀಲ್ದಾರ್ ಕಚೇರಿಯಿಂದ ನೀಡಲ್ಪಟ್ಟಿರಬೇಕು ಮತ್ತು ಪ್ರಸ್ತುತ ಆರ್ಥಿಕ ವರ್ಷಕ್ಕೆ ಮಾನ್ಯವಾಗಿರಬೇಕು.",
        'fallback': "ಕ್ಷಮಿಸಿ, ಈ ಪ್ರಶ್ನೆಗೆ ಅಧಿಕೃತ ಮಾರ್ಗಸೂಚಿಗಳಲ್ಲಿ ನಿಖರವಾದ ವಿವರ ದೊರೆತಿಲ್ಲ. ದಯವಿಟ್ಟು scholarship.gov.in ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ."
    }

    HINDI_RESPONSES = {
        'greeting': "नमस्ते! स्कॉलरसेतु एआई में आपका स्वागत है। आप किस छात्रवृत्ति या सरकारी योजना के बारे में जानकारी प्राप्त करना चाहते हैं?",
        'eligibility': "आपकी प्रोफ़ाइल के अनुसार, यहां आपके लिए पात्र छात्रवृत्तियां दी गई हैं।",
        'income': "आय प्रमाण पत्र तहसीलदार या सक्षम प्राधिकारी द्वारा जारी होना चाहिए और वर्तमान वित्तीय वर्ष के लिए वैध होना चाहिए।",
        'fallback': "माफ़ कीजिए, इस प्रश्न के लिए आधिकारिक सर्कुलर में स्पष्ट नियम उपलब्ध नहीं हैं। कृपया scholarships.gov.in पोर्टल पर जाएं।"
    }

    @classmethod
    def process_voice_query(cls, query, language='en', user=None):
        lang = language.lower()
        q_lower = query.lower()

        matched_opps = []
        spoken_text = ""
        written_markdown = ""

        # Language-specific intent extraction & response generation
        if lang == 'kn':
            if any(k in q_lower for k in ['namaskara', 'hegiddira', 'hello', 'hi', 'ನಮಸ್ಕಾರ']):
                spoken_text = cls.KANNADA_RESPONSES['greeting']
                written_markdown = f"### ನಮಸ್ಕಾರ!\n\n{cls.KANNADA_RESPONSES['greeting']}\n\nಉದಾಹರಣೆಗೆ ಕೇಳಿ:\n- *\"ನನಗೆ ಯಾವ ಸ್ಕಾಲರ್‌ಶಿಪ್ ಸಿಗಬಹುದು?\"*\n- *\"ಇಂಜಿನಿಯರಿಂಗ್ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಯಾವುದು ಇದೆ?\"*\n- *\"ಆದಾಯ ಪ್ರಮಾಣಪತ್ರದ ನಿಯಮಗಳೇನು?\"*"
            elif any(k in q_lower for k in ['nanage', 'sigabahudu', 'arji', 'eligibility', 'ಯಾವ', 'ಸ್ಕಾಲರ್']):
                # Find schemes
                opps = list(Opportunity.objects.filter(is_draft=False).exclude(verification_status='REJECTED')[:3])
                titles = ", ".join([o.title for o in opps[:2]])
                spoken_text = f"ನಿಮಗಾಗಿ {len(opps)} ಪ್ರಮುಖ ವಿದ್ಯಾರ್ಥಿವೇತನಗಳು ಲಭ್ಯವಿವೆ: {titles}."
                written_markdown = f"### ನಿಮಗಾಗಿ ಲಭ್ಯವಿರುವ ಪ್ರಮುಖ ವಿದ್ಯಾರ್ಥಿವೇತನಗಳು:\n\n"
                for o in opps:
                    written_markdown += f"- **[{o.title}]({o.official_application_url})**\n  - ಅನುದಾನ: ₹{o.benefit_amount or 50000} ({o.get_benefit_frequency_display()})\n  - ಕೊನೆಯ ದಿನಾಂಕ: {o.application_closing_date or 'ಮುಕ್ತವಾಗಿದೆ'}\n\n"
                matched_opps = opps
            elif any(k in q_lower for k in ['income', 'adaye', 'tahasildar', 'ಆದಾಯ']):
                spoken_text = cls.KANNADA_RESPONSES['income']
                written_markdown = f"### ಆದಾಯ ಪ್ರಮಾಣಪತ್ರದ ನಿಯಮಗಳು:\n\n- {cls.KANNADA_RESPONSES['income']}\n- ಕೇಂದ್ರ ವಲಯದ ಯೋಜನೆಗೆ ಕುಟುಂಬದ ವಾರ್ಷಿಕ ಆದಾಯ ಗರಿಷ್ಠ ₹4.5 ಲಕ್ಷ.\n- AICTE ಪ್ರಗತಿ ಯೋಜನೆಗೆ ಗರಿಷ್ಠ ₹8 ಲಕ್ಷ."
            else:
                rag_res = RAGAssistantEngine.answer_query(query, user=user)
                written_markdown = rag_res.get('answer', '')
                spoken_text = "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರವನ್ನು ಪರದೆಯ ಮೇಲೆ ಪ್ರದರ್ಶಿಸಲಾಗಿದೆ."
                matched_opps = rag_res.get('matching_opportunities', [])

        elif lang == 'hi':
            if any(k in q_lower for k in ['namaste', 'pranam', 'hello', 'hi', 'नमस्ते']):
                spoken_text = cls.HINDI_RESPONSES['greeting']
                written_markdown = f"### नमस्ते!\n\n{cls.HINDI_RESPONSES['greeting']}\n\nउदाहरण प्रश्न:\n- *\"मुझे कौन सी छात्रवृत्ति मिल सकती है?\"*\n- *\"इंजीनियरिंग के लिए क्या नियम हैं?\"*\n- *\"आय प्रमाण पत्र की सीमा क्या है?\"*"
            elif any(k in q_lower for k in ['kaunsi', 'chhatravritti', 'scholarship', 'patra', 'छात्रवृत्ति', 'योजना']):
                opps = list(Opportunity.objects.filter(is_draft=False).exclude(verification_status='REJECTED')[:3])
                titles = ", ".join([o.title for o in opps[:2]])
                spoken_text = f"आपके लिए {len(opps)} महत्वपूर्ण योजनाएं उपलब्ध हैं: {titles}."
                written_markdown = f"### आपके लिए अनुशंसित छात्रवृत्तियां:\n\n"
                for o in opps:
                    written_markdown += f"- **[{o.title}]({o.official_application_url})**\n  - लाभ राशि: ₹{o.benefit_amount or 50000} ({o.get_benefit_frequency_display()})\n  - आवेदन अंतिम तिथि: {o.application_closing_date or 'सक्रिय है'}\n\n"
                matched_opps = opps
            elif any(k in q_lower for k in ['aay', 'income', 'tahsildar', 'आय']):
                spoken_text = cls.HINDI_RESPONSES['income']
                written_markdown = f"### आय सीमा एवं प्रमाण पत्र दिशानिर्देश:\n\n- {cls.HINDI_RESPONSES['income']}\n- अधिकांश केंद्रीय योजनाओं में ₹2.5 लाख से ₹4.5 लाख की सीमा होती है।"
            else:
                rag_res = RAGAssistantEngine.answer_query(query, user=user)
                written_markdown = rag_res.get('answer', '')
                spoken_text = "आपके प्रश्न का उत्तर स्क्रीन पर प्रदर्शित किया गया है।"
                matched_opps = rag_res.get('matching_opportunities', [])

        else:
            # English Default
            rag_res = RAGAssistantEngine.answer_query(query, user=user)
            written_markdown = rag_res.get('answer', '')
            matched_opps = rag_res.get('matching_opportunities', [])
            # Generate concise spoken summary
            first_sentence = written_markdown.split('\n')[0].replace('#', '').strip()
            spoken_text = first_sentence if len(first_sentence) < 160 else "Here are the official scheme guidelines matching your query."

        return {
            'query': query,
            'language': lang,
            'spoken_answer': spoken_text,
            'text_response': written_markdown,
            'matching_opportunities': [
                {
                    'id': o.id if hasattr(o, 'id') else o.get('id'),
                    'title': o.title if hasattr(o, 'title') else o.get('title'),
                    'provider': o.provider if hasattr(o, 'provider') else o.get('provider'),
                    'official_url': o.official_application_url if hasattr(o, 'official_application_url') else o.get('official_url', 'https://scholarships.gov.in')
                }
                for o in matched_opps
            ]
        }


class FormAssistantEngine:
    """
    Helps citizens understand difficult government application form fields,
    suggests answers from their saved profile, warns about inconsistencies,
    and generates application checklists.
    """

    FIELD_EXPLANATIONS = {
        'annual_family_income': {
            'title': 'Annual Family Income (वार्षिक पारिवारिक आय / ವಾರ್ಷಿಕ ಆದಾಯ)',
            'explanation': 'This means the combined gross yearly income of all earning members of your family from all sources (salary, agriculture, business, pension). Check your official Tehsildar/Revenue Department Income Certificate for the relevant financial year.',
            'profile_key': 'annual_family_income',
            'required_doc': 'Income Certificate issued by Tehsildar / Sub-Divisional Magistrate (SDM)'
        },
        'domicile_certificate_number': {
            'title': 'Domicile / Residence Certificate Number (ಮೂಲನಿವಾಸಿ ಪ್ರಮಾಣಪತ್ರ)',
            'explanation': 'The unique registration or certificate number stamped on your permanent resident/domicile certificate issued by the State Revenue Authority. Proves you are a permanent resident of your state.',
            'profile_key': 'domicile_state',
            'required_doc': 'Domicile / Permanent Residence Certificate (PRC)'
        },
        'category': {
            'title': 'Social Reservation Category (वर्ग / ಜಾತಿ ವರ್ಗ)',
            'explanation': 'Your constitutional category: General, OBC, SC, ST, or EWS. For OBC, verify whether you fall in Non-Creamy Layer (NCL). Must match your government Caste Certificate exactly.',
            'profile_key': 'category',
            'required_doc': 'Caste / Community Certificate'
        },
        'day_scholar_vs_hosteller': {
            'title': 'Hosteller vs Day Scholar (छात्रावासी अथवा गैर-छात्रावासी)',
            'explanation': 'Select "Hosteller" only if you reside in an institution-recognized or government hostel away from your permanent home. Hostellers typically receive higher monthly maintenance allowances.',
            'profile_key': None,
            'required_doc': 'Hostel Admission Certificate / Warden Fee Receipt'
        },
        'tuition_fee': {
            'title': 'Tuition Fee Claimed (शिक्षण शुल्क)',
            'explanation': 'Enter strictly the non-refundable tuition fee charged by your university/college. Do not include mess charges, refundable caution deposits, or transport fees.',
            'profile_key': None,
            'required_doc': 'Official College Fee Structure / Original Payment Receipt'
        },
        'aishe_code': {
            'title': 'AISHE / Institution Code (संस्थान कोड)',
            'explanation': 'All-India Survey on Higher Education (AISHE) code assigned to your college/university. Available from your college administrative office or the national portal directory.',
            'profile_key': 'institution_name',
            'required_doc': 'College Bonafide / Study Certificate with AISHE Code'
        },
        'aadhaar_bank_seeding': {
            'title': 'Aadhaar Seeded Bank Account (आधार सीडेड बैंक खाता)',
            'explanation': 'Government DBT (Direct Benefit Transfer) scholarships are credited ONLY into an NPCI-mapped bank account linked with your Aadhaar number. Check status at uidai.gov.in or your bank branch.',
            'profile_key': None,
            'required_doc': 'Bank Passbook showing Aadhaar seeding & active IFSC'
        }
    }

    @classmethod
    def explain_form_field(cls, field_name, user=None, opportunity_id=None):
        key = field_name.lower().replace(' ', '_').replace('-', '_')
        field_info = cls.FIELD_EXPLANATIONS.get(key)

        if not field_info:
            for k, info in cls.FIELD_EXPLANATIONS.items():
                if k in key or key in k:
                    field_info = info
                    break

        if not field_info:
            field_info = {
                'title': field_name.title(),
                'explanation': f"Official government application field '{field_name}'. Verify the spelling and details against your original government certificates before entering.",
                'profile_key': None,
                'required_doc': 'Supporting identity or institutional certificate'
            }

        suggested_value = None
        inconsistency_warning = None
        profile = None

        if user and user.is_authenticated:
            try:
                profile = UserProfile.objects.get(user=user)
                p_key = field_info.get('profile_key')
                if p_key and hasattr(profile, p_key):
                    val = getattr(profile, p_key)
                    if val is not None and str(val).strip():
                        suggested_value = str(val)
            except UserProfile.DoesNotExist:
                pass

        # Check opportunity inconsistency
        if opportunity_id:
            try:
                opp = Opportunity.objects.get(id=opportunity_id)
                if key == 'annual_family_income' and profile and profile.annual_family_income and opp.max_annual_income:
                    if profile.annual_family_income > opp.max_annual_income:
                        inconsistency_warning = f"Alert: Your saved profile income (₹{profile.annual_family_income:,.2f}) exceeds the maximum limit for this scheme (₹{opp.max_annual_income:,.2f}). You may be disqualified on income criteria."
            except Opportunity.DoesNotExist:
                pass

        checklist = [
            "Verify spelling against Aadhaar / 10th marks card.",
            f"Ensure {field_info.get('required_doc')} is kept handy.",
            "Confirm submitted numbers match the official revenue authority records.",
            "Final submission must be completed on the official portal link provided."
        ]

        return {
            'field_name': field_name,
            'title': field_info['title'],
            'explanation': field_info['explanation'],
            'suggested_value': suggested_value,
            'suggested_source': 'Auto-suggested from your saved profile (requires your confirmation)' if suggested_value else None,
            'inconsistency_warning': inconsistency_warning,
            'required_document': field_info.get('required_doc'),
            'application_checklist': checklist,
            'official_portal_note': "ScholarSetu AI does not submit applications automatically. Please confirm answers and submit on the official portal."
        }


class RejectionAnalyzerEngine:
    """
    Parses scholarship and government scheme rejection letters/notices,
    extracts the exact rejection grounds, explains them simply, and provides
    step-by-step appeal procedures and a correction checklist.
    """

    REJECTION_PATTERNS = [
        {
            'pattern': r'income.*(?:exceed|mismatch|invalid|expired|financial\s*year)',
            'cause': 'Income Certificate Discrepancy or Expiry',
            'explanation': 'Your application was rejected because the income declared did not match the certificate, the certificate was from the wrong financial year, or the family income exceeded the published ceiling limit.',
            'actions': [
                'Obtain a fresh Income Certificate from your local Tehsildar / Nadakacheri / Revenue authority for the current financial year.',
                'Ensure the income amount entered on the application matches the exact rupee figure on the revenue certificate.',
                'Verify whether the certificate carries an authorized digital signature or bar code.'
            ],
            'appeal_path': 'Submit grievance on the National Scholarship Portal (NSP Grievance Redressal) or State Portal Helpdesk along with the renewed certificate within 15 to 30 days of notice.'
        },
        {
            'pattern': r'(?:mark|percentage|cgpa|score|merit).*(?:below|cutoff|insufficient|minimum)',
            'cause': 'Academic Percentage Below Scheme Cutoff',
            'explanation': 'Your qualifying examination score did not meet the minimum percentage or merit cutoff determined by the department for this academic session.',
            'actions': [
                'Double-check your marks card and recalculate your overall percentage excluding non-credit or optional subjects.',
                'If marks were entered incorrectly by the portal operator, request an official grade verification letter from your college registrar.',
                'Explore alternative merit-cum-means or state-level schemes that have a lower cutoff percentage.'
            ],
            'appeal_path': 'If an administrative marks transcription error occurred, file an appeal with your College Nodal Officer and upload an attested marks sheet before the portal grievance window closes.'
        },
        {
            'pattern': r'(?:caste|category|sub\-caste|community).*(?:mismatch|invalid|not\s*verified)',
            'cause': 'Caste / Category Certificate Verification Failure',
            'explanation': 'The state database was unable to automatically verify your RD (Revenue Department) caste certificate number, or the category claimed did not match the central list.',
            'actions': [
                'Check if your caste certificate RD number is valid on the State Revenue Portal (e.g., Seva Sindhu / Mahadbt / e-District).',
                'Ensure your name on the caste certificate matches your Aadhaar card letter-by-letter.',
                'For OBC candidates, confirm whether the central OBC list includes your specific caste/community.'
            ],
            'appeal_path': 'File an appeal through the District Social Welfare / Backward Classes Welfare Officer with an attested certificate copy.'
        },
        {
            'pattern': r'(?:bank|aadhaar|npci|dbt|seeding|account).*(?:not\s*linked|failed|inactive|mismatch)',
            'cause': 'Aadhaar-Bank NPCI Mapping or DBT Inactive',
            'explanation': 'The Direct Benefit Transfer (DBT) credit failed because your bank account is not mapped with your Aadhaar number in the NPCI (National Payments Corporation of India) mapper.',
            'actions': [
                'Visit your bank branch with your original Aadhaar card and submit an "Aadhaar Seeding / Mandate Form for DBT".',
                'Verify your bank account status at uidai.gov.in under "Check Aadhaar & Bank Account Linking Status".',
                'Ensure your bank account is active and has no minimum balance or transaction freezes.'
            ],
            'appeal_path': 'Once your bank confirms NPCI linkage, submit the updated bank confirmation receipt to the scholarship portal grievance cell.'
        },
        {
            'pattern': r'(?:institution|college|university|aishe).*(?:not\s*verified|not\s*approved|defective)',
            'cause': 'Institution / College Verification Pending or Defective',
            'explanation': 'The College Nodal Officer (INO) did not verify your application before the institutional deadline, or the college AISHE accreditation details were missing.',
            'actions': [
                'Contact your College Scholarship Nodal Officer (INO / Principal Office) immediately.',
                'Request the college to verify your application under the "Defective Application" re-submission window.',
                'Confirm that your college is registered on the National Scholarship Portal under the active AISHE list.'
            ],
            'appeal_path': 'Institutions are usually granted a 7 to 14 day extension to re-verify defective applications. Meet your college nodal officer promptly.'
        }
    ]

    @classmethod
    def analyze_rejection(cls, rejection_text, opportunity=None):
        clean_text = rejection_text.lower()

        detected = None
        for p in cls.REJECTION_PATTERNS:
            if re.search(p['pattern'], clean_text):
                detected = p
                break

        if not detected:
            detected = {
                'cause': 'Application Discrepancy / Documentation Issue',
                'explanation': 'The rejection notice indicates that certain supporting documents or eligibility parameters did not satisfy the official verification criteria.',
                'actions': [
                    'Review your uploaded certificates to confirm that all documents are clear, valid, and within expiry dates.',
                    'Check your registered mobile number and email for specific defect codes sent by the department.',
                    'Contact the department toll-free helpline with your application reference number.'
                ],
                'appeal_path': 'Submit a written appeal or online grievance to the National Scholarship Portal (scholarships.gov.in) or State Welfare Department within 30 days.'
            }

        checklist = [
            f"1. Address Root Cause: {detected['cause']}",
            "2. Obtain updated, attested documents from competent authorities.",
            "3. Verify your Aadhaar-Bank NPCI mapping at your bank branch.",
            "4. File a formal appeal or correction request through the official portal grievance mechanism.",
            "5. Note: Government appeal windows typically close within 15 to 30 days of notice publication."
        ]

        return {
            'rejection_cause': detected['cause'],
            'explanation': detected['explanation'],
            'suggested_corrective_actions': detected['actions'],
            'official_appeal_guidance': detected['appeal_path'],
            'correction_checklist': checklist,
            'official_disclaimer': 'This analysis is generated by AI based on extracted text and official scheme guidelines. It does not constitute legal advice or guarantee appeal acceptance.'
        }

