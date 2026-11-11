from rest_framework import views, permissions, status, generics
from rest_framework.response import Response
from django.db.models import Q
from apps.profiles.models import UserProfile, UserDocument, FamilyMemberProfile
from apps.profiles.serializers import (
    UserProfileSerializer, UserDocumentSerializer, FamilyMemberProfileSerializer
)
from apps.profiles.document_service import DocumentAnalysisService
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
# Feature 1: AI Document Readiness Checker Views
# ==============================================================================
class UserDocumentListCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        docs = UserDocument.objects.filter(user=request.user).order_by('-uploaded_at')
        serializer = UserDocumentSerializer(docs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        file_obj = request.FILES.get('document_file') or request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No document file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # File validation: PDF, JPG, JPEG, PNG, max 15MB
        ext = file_obj.name.lower().split('.')[-1]
        if ext not in ['pdf', 'jpg', 'jpeg', 'png']:
            return Response({'error': 'Unsupported file format. Please upload PDF, JPG, JPEG, or PNG.'}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj.size > 15 * 1024 * 1024:
            return Response({'error': 'File size exceeds 15MB limit.'}, status=status.HTTP_400_BAD_REQUEST)

        doc_type_override = request.data.get('document_type')
        try:
            user_doc = DocumentAnalysisService.process_and_save_document(
                user=request.user,
                file_obj=file_obj,
                document_type_override=doc_type_override
            )
            serializer = UserDocumentSerializer(user_doc)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f'Failed to process document: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserDocumentDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            doc = UserDocument.objects.get(id=pk, user=request.user)
            serializer = UserDocumentSerializer(doc)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserDocument.DoesNotExist:
            return Response({'error': 'Document not found or access unauthorized.'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            doc = UserDocument.objects.get(id=pk, user=request.user)
            # Delete file from storage and database
            doc.document_file.delete(save=False)
            doc.delete()
            return Response({'message': 'Document deleted successfully.'}, status=status.HTTP_200_OK)
        except UserDocument.DoesNotExist:
            return Response({'error': 'Document not found or access unauthorized.'}, status=status.HTTP_404_NOT_FOUND)


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

    def get_object(self, pk, user):
        try:
            return FamilyMemberProfile.objects.get(id=pk, user=user)
        except FamilyMemberProfile.DoesNotExist:
            return None

    def get(self, request, pk):
        member = self.get_object(pk, request.user)
        if not member:
            return Response({'error': 'Family member not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(FamilyMemberProfileSerializer(member).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        member = self.get_object(pk, request.user)
        if not member:
            return Response({'error': 'Family member not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = FamilyMemberProfileSerializer(member, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        member = self.get_object(pk, request.user)
        if not member:
            return Response({'error': 'Family member not found.'}, status=status.HTTP_404_NOT_FOUND)
        member.delete()
        return Response({'message': 'Family member profile deleted.'}, status=status.HTTP_200_OK)


class FamilySchemeDiscoveryView(views.APIView):
    """
    Evaluates and discovers government schemes and scholarships specifically tailored
    for a chosen family member (Farmer subsidies, Senior citizen pensions, Child scholarships, Women schemes).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            member = FamilyMemberProfile.objects.get(id=pk, user=request.user)
        except FamilyMemberProfile.DoesNotExist:
            return Response({'error': 'Family member profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        qs = Opportunity.objects.filter(is_draft=False).exclude(verification_status__in=['REJECTED', 'DISCONTINUED'])

        # Filter by occupation & relationship intent
        matched_schemes = []
        occ = member.occupation.lower()
        rel = member.relationship
        age = member.age
        gender = member.gender

        for opp in qs:
            match_score = 0
            match_reasons = []

            # 1. Farmer schemes
            if 'farmer' in occ or 'agriculture' in occ:
                if any(w in (opp.title + opp.short_description).lower() for w in ['kisan', 'farmer', 'agriculture', 'crop', 'fasal', 'krishi']):
                    match_score += 40
                    match_reasons.append("Designed for Farmers and Agricultural households")

            # 2. Senior Citizen pensions
            if age >= 60 or 'senior' in occ:
                if any(w in (opp.title + opp.short_description).lower() for w in ['pension', 'senior citizen', 'vridha', 'elderly', 'old age', 'atal pension']):
                    match_score += 40
                    match_reasons.append(f"Provides financial assistance for Senior Citizens (Age: {age})")

            # 3. Children / Student scholarships
            if rel in ['CHILD', 'BROTHER', 'SISTER'] or age <= 25:
                if opp.opportunity_type == 'SCHOLARSHIP' or any(w in (opp.title + opp.short_description).lower() for w in ['scholarship', 'student', 'school', 'matric', 'education']):
                    match_score += 35
                    match_reasons.append(f"Educational scholarship for children and youth ({member.education_level})")

            # 4. Women welfare schemes
            if gender == 'FEMALE':
                if any(w in (opp.title + opp.short_description).lower() for w in ['girl', 'women', 'mahila', 'pragati', 'kanya', 'ladli', 'mother']):
                    match_score += 35
                    match_reasons.append("Dedicated Government Welfare Scheme for Women & Girls")

            # 5. Disability benefits
            if member.is_disabled:
                if opp.disability_eligible_only or any(w in (opp.title + opp.short_description).lower() for w in ['disability', 'divyang', 'pwd', 'special need']):
                    match_score += 35
                    match_reasons.append("Dedicated Support Scheme for Persons with Disabilities (PwD)")

            # 6. Domicile state match
            if opp.applicable_state == 'All India' or opp.applicable_state.lower() == member.state_or_ut.lower():
                match_score += 20

            # 7. Income qualification
            if member.annual_income and opp.max_annual_income:
                if member.annual_income <= opp.max_annual_income:
                    match_score += 20
                    match_reasons.append(f"Family income ₹{member.annual_income} is within scheme limit of ₹{opp.max_annual_income}")

            if match_score >= 35:
                matched_schemes.append({
                    'opportunity': OpportunityListSerializer(opp).data,
                    'match_score': min(100, match_score),
                    'match_reasons': match_reasons,
                    'family_member_name': member.name,
                    'relationship': member.get_relationship_display()
                })

        # Sort by highest match score
        matched_schemes.sort(key=lambda x: x['match_score'], reverse=True)

        return Response({
            'family_member': FamilyMemberProfileSerializer(member).data,
            'total_matches': len(matched_schemes),
            'recommended_schemes': matched_schemes[:15]
        }, status=status.HTTP_200_OK)
