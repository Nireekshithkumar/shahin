from rest_framework import views, permissions, status
from rest_framework.response import Response
from apps.ai_assistant.models import ChatConversation, ChatMessage
from apps.ai_assistant.rag import RAGAssistantEngine
from apps.ai_assistant.ai_services import (
    VoiceAssistantEngine, FormAssistantEngine, RejectionAnalyzerEngine
)
from apps.profiles.document_service import DocumentAnalysisService
from apps.opportunities.models import Opportunity

class ChatAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        query = request.data.get('message', '').strip()
        conv_id = request.data.get('conversation_id')

        if not query:
            return Response({'error': 'Message content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user.is_authenticated else None
        res = RAGAssistantEngine.answer_query(query, user=user, conversation_id=conv_id)
        return Response(res, status=status.HTTP_200_OK)

class ConversationListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        convs = ChatConversation.objects.filter(user=request.user)[:20]
        data = [
            {
                'id': str(c.id),
                'title': c.title,
                'created_at': c.created_at,
                'updated_at': c.updated_at,
                'message_count': c.messages.count()
            }
            for c in convs
        ]
        return Response(data, status=status.HTTP_200_OK)

class ConversationDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        try:
            conv = ChatConversation.objects.get(id=id, user=request.user)
        except ChatConversation.DoesNotExist:
            return Response({'error': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)

        msgs = conv.messages.all()
        data = {
            'id': str(conv.id),
            'title': conv.title,
            'messages': [
                {
                    'id': m.id,
                    'role': m.role,
                    'content': m.content,
                    'citations': m.citations,
                    'created_at': m.created_at
                }
                for m in msgs
            ]
        }
        return Response(data, status=status.HTTP_200_OK)


# ==============================================================================
# Feature 2: Voice-Based AI Government Assistant View
# ==============================================================================
class VoiceAssistantView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        query = request.data.get('query', '').strip()
        language = request.data.get('language', 'en').strip().lower()

        if not query:
            return Response({'error': 'Spoken query text is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user.is_authenticated else None
        result = VoiceAssistantEngine.process_voice_query(query, language=language, user=user)
        return Response(result, status=status.HTTP_200_OK)


# ==============================================================================
# Feature 3: Smart Application Form Assistant View
# ==============================================================================
class FormAssistantView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        field_name = request.data.get('field_name', '').strip()
        opp_id = request.data.get('opportunity_id')

        if not field_name:
            return Response({'error': 'field_name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user if request.user.is_authenticated else None
        result = FormAssistantEngine.explain_form_field(field_name, user=user, opportunity_id=opp_id)
        return Response(result, status=status.HTTP_200_OK)


# ==============================================================================
# Feature 5: AI Rejection Reason Analyzer View
# ==============================================================================
class RejectionAnalyzerView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        rejection_text = request.data.get('rejection_text', '').strip()
        rejection_file = request.FILES.get('rejection_file') or request.FILES.get('file')
        opp_id = request.data.get('opportunity_id')

        # If a file is uploaded, extract text with DocumentAnalysisService OCR
        if rejection_file:
            fname = rejection_file.name
            mime = rejection_file.content_type
            extracted = DocumentAnalysisService.extract_text_from_file(rejection_file, fname, mime)
            if extracted:
                rejection_text = f"{rejection_text} {extracted}".strip()

        if not rejection_text:
            return Response({
                'error': 'Please provide the rejection text or upload an official rejection notice image/PDF.'
            }, status=status.HTTP_400_BAD_REQUEST)

        opp = None
        if opp_id:
            try:
                opp = Opportunity.objects.get(id=opp_id)
            except Opportunity.DoesNotExist:
                pass

        result = RejectionAnalyzerEngine.analyze_rejection(rejection_text, opportunity=opp)
        return Response(result, status=status.HTTP_200_OK)
