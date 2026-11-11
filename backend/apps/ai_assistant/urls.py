from django.urls import path
from apps.ai_assistant.views import ChatAPIView, ConversationListView, ConversationDetailView

urlpatterns = [
    path('chat/', ChatAPIView.as_view(), name='ai-chat'),
    path('conversations/', ConversationListView.as_view(), name='ai-conversations'),
    path('conversations/<uuid:id>/', ConversationDetailView.as_view(), name='ai-conversation-detail'),
]
