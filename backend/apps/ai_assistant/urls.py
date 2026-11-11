from django.urls import path
from apps.ai_assistant.views import (
    ChatAPIView, ConversationListView, ConversationDetailView,
    VoiceAssistantView, FormAssistantView, RejectionAnalyzerView
)

urlpatterns = [
    path('chat/', ChatAPIView.as_view(), name='ai-chat'),
    path('conversations/', ConversationListView.as_view(), name='ai-conversations'),
    path('conversations/<uuid:id>/', ConversationDetailView.as_view(), name='ai-conversation-detail'),
    path('voice-assistant/', VoiceAssistantView.as_view(), name='ai-voice-assistant'),
    path('form-assistant/', FormAssistantView.as_view(), name='ai-form-assistant'),
    path('rejection-analyzer/', RejectionAnalyzerView.as_view(), name='ai-rejection-analyzer'),
]
