from datetime import date, datetime
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from apps.profiles.models import (
    UserProfile, UserDocument, ProfileUpdateProposal,
    ProfileProposalStatus, ProfileUpdateAuditLog, CategoryChoices
)

class ProfileSyncService:
    """
    Manages proposed profile field updates extracted from OCR.
    Enforces STRICT USER CONSENT: Never silently modifies user profile data.
    Maintains complete audit trails.
    """

    @classmethod
    def generate_proposals_for_document(cls, user, document: UserDocument, extracted: dict) -> list:
        """
        Compares extracted document attributes against the user's current UserProfile.
        Generates pending ProfileUpdateProposal items for user review.
        """
        profile, _ = UserProfile.objects.get_or_create(user=user)
        proposals = []

        # Check if holder name differs from profile name
        holder_name = extracted.get('holder_name') or ''
        user_name = profile.full_name or ''
        holder_mismatch = False

        if holder_name and user_name:
            h_clean = holder_name.lower().replace('mr.', '').replace('ms.', '').replace('shri', '').replace('smt', '').strip()
            u_clean = user_name.lower().strip()
            # If names don't overlap significantly
            if h_clean not in u_clean and u_clean not in h_clean:
                holder_mismatch = True

        field_mappings = [
            {
                'key': 'annual_income',
                'field_name': 'annual_family_income',
                'label': 'Annual Family Income',
                'is_sensitive': True,
                'formatter': lambda v: f"Rs. {int(v):,}" if v is not None else None,
                'profile_val': lambda p: str(p.annual_family_income) if p.annual_family_income is not None else ""
            },
            {
                'key': 'state',
                'field_name': 'state_or_ut',
                'label': 'State / UT of Residence',
                'is_sensitive': False,
                'formatter': lambda v: str(v) if v else None,
                'profile_val': lambda p: p.state_or_ut or ""
            },
            {
                'key': 'district',
                'field_name': 'district',
                'label': 'District',
                'is_sensitive': False,
                'formatter': lambda v: str(v) if v else None,
                'profile_val': lambda p: p.district or ""
            },
            {
                'key': 'holder_name',
                'field_name': 'full_name',
                'label': 'Full Name',
                'is_sensitive': False,
                'formatter': lambda v: str(v) if v else None,
                'profile_val': lambda p: p.full_name or ""
            },
            {
                'key': 'category',
                'field_name': 'category',
                'label': 'Social Category',
                'is_sensitive': True,
                'formatter': lambda v: str(v) if v else None,
                'profile_val': lambda p: p.get_category_display() if p.category else ""
            },
            {
                'key': 'disability_percentage',
                'field_name': 'disability_percentage',
                'label': 'Disability Percentage',
                'is_sensitive': True,
                'formatter': lambda v: f"{v}%" if v is not None else None,
                'profile_val': lambda p: f"{p.disability_percentage}%" if p.disability_percentage is not None else ""
            },
            {
                'key': 'date_of_birth',
                'field_name': 'date_of_birth',
                'label': 'Date of Birth',
                'is_sensitive': False,
                'formatter': lambda v: str(v) if v else None,
                'profile_val': lambda p: str(p.date_of_birth) if p.date_of_birth else ""
            },
        ]

        # Delete any previous PENDING proposals for this document to avoid duplicates on re-scan
        ProfileUpdateProposal.objects.filter(document=document, status=ProfileProposalStatus.PENDING).delete()

        confidences = extracted.get('confidences', {})

        for m in field_mappings:
            raw_val = extracted.get(m['key'])
            if raw_val is None or str(raw_val).strip() == '':
                continue

            curr_val = m['profile_val'](profile)
            new_val_str = str(raw_val).strip()
            conf = float(confidences.get(m['key'], extracted.get('confidence', 0.90)))

            # If the extracted value is identical to current value, skip proposing
            if curr_val and curr_val.lower().strip() == new_val_str.lower().strip():
                continue

            # If current profile has value and extracted is different, or current profile is empty
            proposal = ProfileUpdateProposal.objects.create(
                user=user,
                document=document,
                field_name=m['field_name'],
                field_label=m['label'],
                current_value=curr_val or "Not provided",
                extracted_value=new_val_str,
                ocr_confidence=conf,
                status=ProfileProposalStatus.PENDING,
                is_sensitive=m['is_sensitive'],
                holder_mismatch_warning=holder_mismatch
            )
            proposals.append(proposal)

        return proposals

    @classmethod
    def decide_proposal(cls, user, proposal_id: int, decision: str) -> dict:
        """
        Applies a user decision (ACCEPTED / REJECTED) to a specific proposal.
        Modifies profile only when decision == 'ACCEPTED' within an atomic transaction.
        """
        try:
            proposal = ProfileUpdateProposal.objects.get(id=proposal_id, user=user)
        except ProfileUpdateProposal.DoesNotExist:
            raise ValueError("Proposal not found or unauthorized.")

        if decision not in ['ACCEPTED', 'REJECTED']:
            raise ValueError(f"Invalid decision '{decision}'. Must be 'ACCEPTED' or 'REJECTED'.")

        with transaction.atomic():
            profile, _ = UserProfile.objects.get_or_create(user=user)
            prev_val = getattr(profile, proposal.field_name, None)

            if decision == 'ACCEPTED':
                # Parse and cast value based on field type
                new_val = proposal.extracted_value
                if proposal.field_name == 'annual_family_income':
                    clean_num = ''.join(c for c in new_val if c.isdigit() or c == '.')
                    setattr(profile, proposal.field_name, Decimal(clean_num) if clean_num else None)
                    profile.income_certificate_available = True
                elif proposal.field_name == 'disability_percentage':
                    clean_num = ''.join(c for c in new_val if c.isdigit() or c == '.')
                    setattr(profile, proposal.field_name, Decimal(clean_num) if clean_num else None)
                    profile.is_disabled = True
                    profile.disability_certificate_available = True
                elif proposal.field_name == 'category':
                    cat_map = {
                        'general': CategoryChoices.GENERAL,
                        'obc': CategoryChoices.OBC,
                        'sc': CategoryChoices.SC,
                        'st': CategoryChoices.ST,
                        'ews': CategoryChoices.EWS
                    }
                    target_cat = cat_map.get(new_val.lower(), CategoryChoices.GENERAL)
                    profile.category = target_cat
                    profile.caste_certificate_available = True
                elif proposal.field_name == 'date_of_birth':
                    try:
                        profile.date_of_birth = datetime.strptime(new_val, '%Y-%m-%d').date()
                        # Auto-compute age
                        today = date.today()
                        profile.age = today.year - profile.date_of_birth.year - ((today.month, today.day) < (profile.date_of_birth.month, profile.date_of_birth.day))
                    except Exception:
                        setattr(profile, proposal.field_name, new_val)
                else:
                    setattr(profile, proposal.field_name, new_val)

                profile.save()
                proposal.status = ProfileProposalStatus.ACCEPTED
            else:
                proposal.status = ProfileProposalStatus.REJECTED

            proposal.decided_at = timezone.now()
            proposal.save()

            # Record in audit log
            audit = ProfileUpdateAuditLog.objects.create(
                user=user,
                document=proposal.document,
                field_name=proposal.field_name,
                previous_value=str(prev_val or ""),
                new_value=str(proposal.extracted_value) if decision == 'ACCEPTED' else "",
                decision=decision
            )

        return {
            'proposal_id': proposal.id,
            'field_name': proposal.field_name,
            'status': proposal.status,
            'applied': (decision == 'ACCEPTED'),
            'profile_completion_percentage': profile.profile_completion_percentage
        }

    @classmethod
    def decide_batch_proposals(cls, user, document_id: int, action: str, selected_ids: list = None) -> dict:
        """
        Batch accepts or rejects proposals for a document.
        action: 'ACCEPT_ALL', 'REJECT_ALL', or 'APPLY_SELECTED'
        """
        query = ProfileUpdateProposal.objects.filter(
            user=user,
            document_id=document_id,
            status=ProfileProposalStatus.PENDING
        )
        if selected_ids and action == 'APPLY_SELECTED':
            query = query.filter(id__in=selected_ids)

        proposals = list(query)
        accepted_count = 0
        rejected_count = 0

        for p in proposals:
            if action in ['ACCEPT_ALL', 'APPLY_SELECTED']:
                cls.decide_proposal(user, p.id, 'ACCEPTED')
                accepted_count += 1
            elif action == 'REJECT_ALL':
                cls.decide_proposal(user, p.id, 'REJECTED')
                rejected_count += 1

        profile = user.profile
        return {
            'document_id': document_id,
            'accepted_count': accepted_count,
            'rejected_count': rejected_count,
            'remaining_pending': ProfileUpdateProposal.objects.filter(user=user, document_id=document_id, status=ProfileProposalStatus.PENDING).count(),
            'profile_completion_percentage': profile.profile_completion_percentage
        }
