import uuid
from django.db import models
from django.conf import settings
from apps.opportunities.models import Opportunity

class RAGDocumentType(models.TextChoices):
    SCHOLARSHIP_GUIDELINE = 'SCHOLARSHIP_GUIDELINE', 'Scholarship Official Guideline'
    SCHEME_FAQ = 'SCHEME_FAQ', 'Government Scheme FAQ'
    ELIGIBILITY_RULES = 'ELIGIBILITY_RULES', 'Eligibility Rules Document'
    GOVERNMENT_CIRCULAR = 'GOVERNMENT_CIRCULAR', 'Government Circular / Gazette'
    PORTAL_GUIDE = 'PORTAL_GUIDE', 'Application Portal Guide'

class RAGDocument(models.Model):
    title = models.CharField(max_length=500)
    source_url = models.URLField(max_length=1000)
    source_name = models.CharField(max_length=255)
    document_type = models.CharField(max_length=50, choices=RAGDocumentType.choices, default=RAGDocumentType.SCHOLARSHIP_GUIDELINE)
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, null=True, blank=True, related_name='rag_documents')
    full_content = models.TextField()
    verification_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.source_name})"

class RAGDocumentChunk(models.Model):
    document = models.ForeignKey(RAGDocument, on_delete=models.CASCADE, related_name='chunks')
    chunk_index = models.PositiveIntegerField(default=0)
    chunk_text = models.TextField()
    chunk_metadata = models.JSONField(default=dict)
    embedding = models.JSONField(default=list, help_text="Vector embedding of the chunk text")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['document', 'chunk_index']

    def __str__(self):
        return f"Chunk #{self.chunk_index} of {self.document.title}"

class ChatConversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_conversations')
    title = models.CharField(max_length=255, default='New Scholarship Consultation')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        user_str = self.user.email if self.user else "Guest"
        return f"{self.title} ({user_str})"

class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'ScholarSetu AI Assistant'),
        ('system', 'System Context'),
    ]
    conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    citations = models.JSONField(default=list, help_text="Citations of retrieved documents: url, title, date")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:40]}..."
