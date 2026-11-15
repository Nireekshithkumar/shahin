from apps.profiles.models import UserDocument, DocumentTypeChoices

class CertificateRenewalService:
    """
    Provides official state-specific renewal procedures, portal links, required document checklists,
    and downloadable instructions for expiring or expired certificates.
    """

    RENEWAL_KNOWLEDGE_BASE = {
        DocumentTypeChoices.INCOME_CERTIFICATE: {
            'Karnataka': {
                'portal_name': 'Nadakacheri (Atalji Janasnehi Kendra)',
                'portal_url': 'https://nadakacheri.karnataka.gov.in',
                'authority': 'Tahsildar / Revenue Department, Government of Karnataka',
                'validity_info': 'Valid for 1 year from the date of issue. Must be renewed annually for scholarship disbursements.',
                'procedure': [
                    'Visit Nadakacheri portal and select "Apply Online" -> "Income Certificate".',
                    'Enter your 10-digit mobile number and verify via OTP.',
                    'Enter applicant Aadhaar details, Ration Card number, and previous certificate number if renewing.',
                    'Declare family members and current annual earnings from all sources (agriculture, business, salary).',
                    'Pay the nominal application fee (Rs. 40) online via UPI/Net Banking.',
                    'The Village Accountant / Revenue Inspector will conduct verification and the Tahsildar will digitally sign the new certificate within 7-15 working days.'
                ],
                'required_documents': [
                    'Aadhaar Card of applicant and parent/guardian',
                    'Previous Expired Income Certificate or RD Number',
                    'Ration Card (BPL / Antyodaya / APL)',
                    'Salary Slip / Form 16 / Bank Statement (if employed)',
                    'Self-declaration of annual income affidavit'
                ]
            },
            'Maharashtra': {
                'portal_name': 'Aaple Sarkar (Right to Services Portal)',
                'portal_url': 'https://aaplesarkar.mahaonline.gov.in',
                'authority': 'Tahsil Office / Revenue Department, Government of Maharashtra',
                'validity_info': 'Available in 1-year or 3-year validity options.',
                'procedure': [
                    'Log in to Aaple Sarkar portal using Citizen Login.',
                    'Navigate to Revenue Department -> Income Certificate.',
                    'Fill in applicant details, Taluka, Village, and income details of all family members.',
                    'Upload scanned copies of proof of identity, address, and income proof.',
                    'Pay service charges online and download acknowledgment receipt.'
                ],
                'required_documents': [
                    'Identity Proof (Aadhaar Card / Voter ID)',
                    'Address Proof (Ration Card / Electricity Bill)',
                    'Income Proof (Talathi Report / Form 16 / Salary Certificate)',
                    'Self-declaration of applicant'
                ]
            },
            'Default': {
                'portal_name': 'National Government Services Portal / State e-District',
                'portal_url': 'https://services.india.gov.in',
                'authority': 'District Magistrate / Tahsildar / Revenue Authority',
                'validity_info': 'Most state income certificates require annual renewal for academic and welfare benefits.',
                'procedure': [
                    'Access your state e-District or Citizen Services portal.',
                    'Register or log in and navigate to Revenue Department -> Income Certificate.',
                    'Provide updated financial year income details, family members, and previous certificate reference.',
                    'Upload self-attested identity proof, address proof, and income declaration.',
                    'Track application using the acknowledgment application number.'
                ],
                'required_documents': [
                    'Aadhaar Card / Government Photo ID',
                    'Ration Card / Family Proof',
                    'Bank Statement / Salary Certificate / Income Affidavit',
                    'Recent passport-size photograph'
                ]
            }
        },
        DocumentTypeChoices.EWS_CERTIFICATE: {
            'Default': {
                'portal_name': 'State e-District Portal / Tahsil Office',
                'portal_url': 'https://services.india.gov.in',
                'authority': 'Sub-Divisional Magistrate (SDM) / Tahsildar',
                'validity_info': 'EWS certificates are valid for 1 Financial Year (April 1st to March 31st).',
                'procedure': [
                    'Apply at the local Tahsil / Revenue office or through state e-District portal after April 1st of the new financial year.',
                    'Submit gross annual family income statement for the preceding financial year.',
                    'Verify that agricultural land is below 5 acres and residential flat is below 1,000 sq ft.',
                    'Obtain verification report from the revenue inspector.',
                    'Collect the digitally signed Income and Asset Certificate for EWS.'
                ],
                'required_documents': [
                    'Aadhaar Card and PAN Card of family members',
                    'ITR / Form 16 / Income declaration for previous financial year',
                    'Land records (RTC / Pahani / Khata / Property tax receipts)',
                    'Ration Card / Domicile Certificate'
                ]
            }
        },
        DocumentTypeChoices.DISABILITY_CERTIFICATE: {
            'Default': {
                'portal_name': 'Unique Disability ID (UDID) Portal',
                'portal_url': 'https://www.swavlambancard.gov.in',
                'authority': 'Department of Empowerment of Persons with Disabilities, Govt of India',
                'validity_info': 'Permanent UDID cards do not require renewal. Temporary disability certificates must be re-evaluated before expiry.',
                'procedure': [
                    'Log in to UDID portal (swavlambancard.gov.in) with your Enrollment or UDID number.',
                    'Select "Apply for Disability Certificate & UDID Card Renewal".',
                    'Update personal and medical details if any clinical condition has changed.',
                    'Select hospital / Medical Board for re-assessment.',
                    'Attend the designated District Medical Board assessment date for updated percentage certification.',
                    'Download the digitally re-issued UDID card upon approval.'
                ],
                'required_documents': [
                    'Existing UDID Card / Disability Certificate',
                    'Aadhaar Card',
                    'Recent Medical Treatment Records / Diagnostic Reports',
                    'Passport photograph showing disability if visible'
                ]
            }
        }
    }

    @classmethod
    def get_guidance_for_document(cls, doc: UserDocument) -> dict:
        """Returns structured renewal guidance, checklist, and instructions for a document."""
        doc_type = doc.document_type
        state = doc.state or 'Default'

        type_guidance = cls.RENEWAL_KNOWLEDGE_BASE.get(doc_type, {})
        specific = type_guidance.get(state) or type_guidance.get('Default')

        if not specific:
            return {
                'document_id': doc.id,
                'document_name': doc.original_filename,
                'document_type': doc.get_document_type_display(),
                'validity_status': doc.validity_status,
                'expiry_date': str(doc.expiry_date or doc.detected_expiry_date or 'Not specified'),
                'portal_name': 'Official State Portal / Competent Issuing Authority',
                'portal_url': 'https://services.india.gov.in',
                'authority': doc.issuing_authority or 'Competent Government Issuing Authority',
                'validity_info': 'Renewal information requires verification. Please contact the issuing authority.',
                'procedure': [
                    'Visit the official issuing department website or local citizen service centre (CSC).',
                    'Carry your original expiring certificate along with valid identity and address proof.',
                    'Submit an application for renewal or fresh issuance for the current session.'
                ],
                'required_documents': [
                    'Existing Certificate Copy',
                    'Aadhaar Card / Identity Proof',
                    'Current Address Proof'
                ],
                'disclaimer': 'Renewal information requires verification. Please contact the issuing authority directly.'
            }

        return {
            'document_id': doc.id,
            'document_name': doc.original_filename,
            'document_type': doc.get_document_type_display(),
            'validity_status': doc.validity_status,
            'expiry_date': str(doc.expiry_date or doc.detected_expiry_date or 'Not specified'),
            'portal_name': specific['portal_name'],
            'portal_url': specific['portal_url'],
            'authority': doc.issuing_authority or specific['authority'],
            'validity_info': specific['validity_info'],
            'procedure': specific['procedure'],
            'required_documents': specific['required_documents'],
            'disclaimer': 'Official government procedures and fee schedules may vary by district. Verify with the issuing portal.'
        }
