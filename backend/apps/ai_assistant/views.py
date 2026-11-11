from rest_framework import views, permissions, status
from rest_framework.response import Response
from apps.ai_assistant.models import ChatConversation, ChatMessage
from apps.ai_assistant.rag import RAGAssistantEngine

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
