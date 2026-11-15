from rest_framework import views, permissions, status, generics
from rest_framework.response import Response
from django.db.models import Q
from datetime import datetime
from apps.profiles.models import (
    UserProfile, UserDocument, FamilyMemberProfile,
    ProfileUpdateProposal, ProfileUpdateAuditLog, CertificateValidityRule,
    ValidityStatusChoices
)
from apps.profiles.serializers import (
    UserProfileSerializer, UserDocumentSerializer, FamilyMemberProfileSerializer,
    ProfileUpdateProposalSerializer, ProfileUpdateAuditLogSerializer,
    CertificateValidityRuleSerializer
)
from apps.profiles.document_service import DocumentAnalysisService
from apps.profiles.validity_engine import CertificateValidityEngine
from apps.profiles.profile_sync_service import ProfileSyncService
from apps.profiles.renewal_service import CertificateRenewalService
from apps.opportunities.models import Opportunity, VerificationStatus
from apps.opportunities.serializers import OpportunityListSerializer

class ProfileDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==============================================================================
# Feature: AI Certificate Validity, Monitoring & Document Management Views
# ==============================================================================
class UserDocumentListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        docs = UserDocument.objects.filter(user=request.user)

        # Filters
        validity_filter = request.query_params.get('validity_status')
        if validity_filter and validity_filter != 'ALL':
            docs = docs.filter(validity_status=validity_filter)

        doc_type_filter = request.query_params.get('document_type')
        if doc_type_filter:
            docs = docs.filter(document_type=doc_type_filter)

        search = request.query_params.get('search')
        if search:
            docs = docs.filter(
                Q(original_filename__icontains=search) |
                Q(holder_name__icontains=search) |
                Q(certificate_number__icontains=search) |
                Q(issuing_authority__icontains=search)
            )

        docs = docs.order_by('-uploaded_at')
        serializer = UserDocumentSerializer(docs, many=True)

        # Summary statistics
        all_user_docs = UserDocument.objects.filter(user=request.user)
        summary = {
            'total': all_user_docs.count(),
            'valid': all_user_docs.filter(validity_status=ValidityStatusChoices.VALID).count(),
            'expiring_soon': all_user_docs.filter(validity_status=ValidityStatusChoices.EXPIRING_SOON).count(),
            'expired': all_user_docs.filter(validity_status=ValidityStatusChoices.EXPIRED).count(),
            'verification_required': all_user_docs.filter(validity_status=ValidityStatusChoices.VERIFICATION_REQUIRED).count(),
            'no_expiry_applicable': all_user_docs.filter(validity_status=ValidityStatusChoices.NO_EXPIRY_APPLICABLE).count(),
            'pending_proposals_total': ProfileUpdateProposal.objects.filter(user=request.user, status='PENDING').count(),
        }

        return Response({
            'summary': summary,
            'results': serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        file_objs = request.FILES.getlist('document_file') or request.FILES.getlist('file') or request.FILES.getlist('files')
        if not file_objs:
            single = request.FILES.get('document_file') or request.FILES.get('file')
            if single:
                file_objs = [single]

        if not file_objs:
            return Response({'error': 'No document file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # File validation: PDF, JPG, JPEG, PNG, max 15MB each
        allowed_exts = {'pdf', 'jpg', 'jpeg', 'png'}
        for f in file_objs:
            ext = f.name.lower().split('.')[-1]
            if ext not in allowed_exts:
                return Response({'error': f"Unsupported file format '{ext}' in {f.name}. Please upload PDF, JPG, JPEG, or PNG."}, status=status.HTTP_400_BAD_REQUEST)
            if f.size > 15 * 1024 * 1024:
                return Response({'error': f"File '{f.name}' exceeds the 15MB limit."}, status=status.HTTP_400_BAD_REQUEST)

        doc_type_override = request.data.get('document_type')
        try:
            target_input = file_objs if len(file_objs) > 1 else file_objs[0]
            user_doc = DocumentAnalysisService.process_and_save_document(
                user=request.user,
                file_obj=target_input,
                document_type_override=doc_type_override
            )

            # Retrieve generated proposals
            proposals = ProfileUpdateProposal.objects.filter(document=user_doc, status='PENDING')
            proposal_serializer = ProfileUpdateProposalSerializer(proposals, many=True)

            doc_serializer = UserDocumentSerializer(user_doc)
            return Response({
                'document': doc_serializer.data,
                'proposals': proposal_serializer.data,
                'proposals_count': len(proposals),
                'message': 'Document uploaded and analyzed successfully.'
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f'Failed to process document: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserDocumentDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = UserDocument.objects.get(id=pk, user=request.user)
            serializer = UserDocumentSerializer(doc)
            proposals = ProfileUpdateProposal.objects.filter(document=doc)
            proposal_serializer = ProfileUpdateProposalSerializer(proposals, many=True)
            return Response({
                'document': serializer.data,
                'proposals': proposal_serializer.data
            }, status=status.HTTP_200_OK)
        except UserDocument.DoesNotExist:
            return Response({'error': 'Document not found or access unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        """Allows manual editing/correction of extracted certificate fields."""
        try:
            doc = UserDocument.objects.get(id=pk, user=request.user)
        except UserDocument.DoesNotExist:
            return Response({'error': 'Document not found or access unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

        editable_fields = [
            'holder_name', 'certificate_number', 'issue_date', 'expiry_date',
            'issuing_authority', 'state', 'district', 'annual_income',
            'warning_period_days', 'family_member'
        ]
        data = request.data
        for f in editable_fields:
            if f in data:
                val = data[f]
                if f in ['issue_date', 'expiry_date'] and val:
                    try:
                        val = datetime.strptime(str(val), '%Y-%m-%d').date()
                    except Exception:
                        pass
                setattr(doc, f, val)

        doc.save()
        # Recalculate validity with corrected fields
        CertificateValidityEngine.apply_validity_evaluation(doc, save=True)

        serializer = UserDocumentSerializer(doc)
        return Response({
            'document': serializer.data,
            'message': 'Certificate details updated and validity re-evaluated successfully.'
        }, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            doc = UserDocument.objects.get(id=pk, user=request.user)
            doc.document_file.delete(save=False)
            doc.delete()
            return Response({'message': 'Document and associated monitoring schedules deleted successfully.'}, status=status.HTTP_200_OK)
        except UserDocument.DoesNotExist:
            return Response({'error': 'Document not found or access unauthorized.'}, status=status.HTTP_404_NOT_FOUND)


class UserDocumentReplaceView(views.APIView):
    """Replaces an existing certificate document with a newly captured or uploaded version."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            doc = UserDocument.objects.get(id=pk, user=request.user)
        except UserDocument.DoesNotExist:
            return Response({'error': 'Document not found or access unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

        file_objs = request.FILES.getlist('document_file') or request.FILES.getlist('file')
        if not file_objs:
            return Response({'error': 'Replacement file not provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Delete old file
        doc.document_file.delete(save=False)
        target_file = file_objs[0]
        doc.document_file = target_file
        doc.original_filename = target_file.name
        doc.file_size_bytes = target_file.size
        doc.mime_type = getattr(target_file, 'content_type', 'application/pdf')

        # Re-run OCR and extraction
        raw_text = DocumentAnalysisService.extract_text_from_file(target_file, target_file.name, doc.mime_type)
        masked_text = DocumentAnalysisService.mask_sensitive_identifiers(raw_text)
        extracted = DocumentAnalysisService.extract_structured_certificate_data(masked_text, target_file.name, doc.document_type)

        doc.extracted_text = masked_text[:5000]
        doc.extracted_metadata = extracted
        if extracted.get('holder_name'): doc.holder_name = extracted['holder_name']
        if extracted.get('certificate_number'): doc.certificate_number = extracted['certificate_number']
        if extracted.get('issue_date'): doc.issue_date = extracted['issue_date']
        if extracted.get('expiry_date'): doc.expiry_date = extracted['expiry_date']
        if extracted.get('issuing_authority'): doc.issuing_authority = extracted['issuing_authority']
        if extracted.get('state'): doc.state = extracted['state']
        if extracted.get('district'): doc.district = extracted['district']
        if extracted.get('annual_income'): doc.annual_income = extracted['annual_income']

        doc.save()

        # Recalculate validity
        CertificateValidityEngine.apply_validity_evaluation(doc, save=True)

        # Reset notification milestones so new expiry date is actively monitored
        doc.milestones.all().delete()

        # Re-generate pending proposals
        proposals = ProfileSyncService.generate_proposals_for_document(request.user, doc, extracted)
        serializer = UserDocumentSerializer(doc)

        return Response({
            'document': serializer.data,
            'proposals': ProfileUpdateProposalSerializer(proposals, many=True).data,
            'message': 'Certificate replaced successfully. OCR extracted and validity re-calculated.'
        }, status=status.HTTP_200_OK)


class DocumentProposalsView(views.APIView):
    """Handles reviewing and deciding on pending profile update proposals for a document."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = UserDocument.objects.get(id=pk, user=request.user)
        except UserDocument.DoesNotExist:
            return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        proposals = ProfileUpdateProposal.objects.filter(document=doc)
        serializer = ProfileUpdateProposalSerializer(proposals, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk):
        """Applies individual or batch decisions."""
        try:
            doc = UserDocument.objects.get(id=pk, user=request.user)
        except UserDocument.DoesNotExist:
            return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        proposal_id = request.data.get('proposal_id')
        decision = request.data.get('decision')

        if proposal_id and decision:
            # Single proposal decision
            try:
                res = ProfileSyncService.decide_proposal(request.user, proposal_id, decision)
                return Response(res, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        elif action in ['ACCEPT_ALL', 'REJECT_ALL', 'APPLY_SELECTED']:
            # Batch decision
            selected_ids = request.data.get('selected_ids', [])
            res = ProfileSyncService.decide_batch_proposals(request.user, doc.id, action, selected_ids)
            return Response(res, status=status.HTTP_200_OK)

        return Response({'error': 'Specify proposal_id & decision or a batch action.'}, status=status.HTTP_400_BAD_REQUEST)


class AllPendingProposalsView(views.APIView):
    """Lists all pending proposals across all documents for the logged in user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        proposals = ProfileUpdateProposal.objects.filter(user=request.user, status='PENDING')
        serializer = ProfileUpdateProposalSerializer(proposals, many=True)
        return Response({
            'count': proposals.count(),
            'proposals': serializer.data
        }, status=status.HTTP_200_OK)


class DocumentRenewalGuidanceView(views.APIView):
    """Provides structured renewal guidance, official portal link, and checklist."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = UserDocument.objects.get(id=pk, user=request.user)
        except UserDocument.DoesNotExist:
            return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        guidance = CertificateRenewalService.get_guidance_for_document(doc)
        return Response(guidance, status=status.HTTP_200_OK)


class CertificateValidityRulesView(views.APIView):
    """Lists verified government certificate validity rules."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rules = CertificateValidityRule.objects.filter(is_active=True).order_by('state', 'certificate_type')
        serializer = CertificateValidityRuleSerializer(rules, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentAuditLogsView(views.APIView):
    """Returns audit history of accepted and rejected profile updates."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        logs = ProfileUpdateAuditLog.objects.filter(user=request.user).order_by('-timestamp')[:50]
        serializer = ProfileUpdateAuditLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentReadinessCheckView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        opp_id = request.query_params.get('opportunity_id')
        if not opp_id:
            return Response({'error': 'opportunity_id query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            opportunity = Opportunity.objects.get(id=opp_id)
        except Opportunity.DoesNotExist:
            return Response({'error': 'Opportunity not found.'}, status=status.HTTP_404_NOT_FOUND)

        report = DocumentAnalysisService.evaluate_readiness_for_opportunity(request.user, opportunity)
        return Response(report, status=status.HTTP_200_OK)


# ==============================================================================
# Feature 7: Family-Based Scheme Discovery Views
# ==============================================================================
class FamilyMemberListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        members = FamilyMemberProfile.objects.filter(user=request.user)
        serializer = FamilyMemberProfileSerializer(members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = FamilyMemberProfileSerializer(data=request.data)
        if serializer.is_valid():
            member = serializer.save(user=request.user)
            return Response(FamilyMemberProfileSerializer(member).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FamilyMemberDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            member = FamilyMemberProfile.objects.get(id=pk, user=request.user)
            return Response(FamilyMemberProfileSerializer(member).data, status=status.HTTP_200_OK)
        except FamilyMemberProfile.DoesNotExist:
            return Response({'error': 'Family member profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        try:
            member = FamilyMemberProfile.objects.get(id=pk, user=request.user)
            serializer = FamilyMemberProfileSerializer(member, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except FamilyMemberProfile.DoesNotExist:
            return Response({'error': 'Family member profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            member = FamilyMemberProfile.objects.get(id=pk, user=request.user)
            member.delete()
            return Response({'message': 'Family member removed successfully.'}, status=status.HTTP_200_OK)
        except FamilyMemberProfile.DoesNotExist:
            return Response({'error': 'Family member profile not found.'}, status=status.HTTP_404_NOT_FOUND)


class FamilySchemeDiscoveryView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            member = FamilyMemberProfile.objects.get(id=pk, user=request.user)
        except FamilyMemberProfile.DoesNotExist:
            return Response({'error': 'Family member not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Match opportunities against family member attributes
        opps = Opportunity.objects.filter(is_draft=False, verification_status=VerificationStatus.VERIFIED)

        # State filter
        if member.state_or_ut and member.state_or_ut != 'All India':
            opps = opps.filter(Q(applicable_state=member.state_or_ut) | Q(applicable_state='All India'))

        matched = []
        for opp in opps:
            # Check maximum age if defined
            if getattr(opp, 'max_age', None) and member.age > opp.max_age:
                continue
            # Check minimum age
            if getattr(opp, 'min_age', None) and member.age < opp.min_age:
                continue
            # Check gender
            if getattr(opp, 'eligible_genders', None) and member.gender not in opp.eligible_genders and 'ALL' not in opp.eligible_genders:
                continue
            # Check income cap
            if getattr(opp, 'max_annual_income', None) and member.annual_income and member.annual_income > opp.max_annual_income:
                continue

            matched.append(opp)

        serializer = OpportunityListSerializer(matched[:20], many=True)
        recommended = []
        for item in serializer.data:
            c = dict(item)
            c['family_member_name'] = member.name
            c['relationship'] = member.get_relationship_display()
            recommended.append(c)

        return Response({
            'family_member': FamilyMemberProfileSerializer(member).data,
            'total_matches': len(matched),
            'matched_count': len(matched),
            'recommended_schemes': recommended,
            'opportunities': serializer.data
        }, status=status.HTTP_200_OK)
