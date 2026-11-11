from django.db import models
from django.conf import settings
from apps.opportunities.models import Opportunity

class EligibilityResultStatus(models.TextChoices):
    ELIGIBLE = 'ELIGIBLE', 'Eligible'
    POTENTIALLY_ELIGIBLE = 'POTENTIALLY_ELIGIBLE', 'Potentially Eligible'
    INELIGIBLE = 'INELIGIBLE', 'Ineligible'
    INSUFFICIENT_INFORMATION = 'INSUFFICIENT_INFORMATION', 'Insufficient Information'
    NEEDS_MANUAL_VERIFICATION = 'NEEDS_MANUAL_VERIFICATION', 'Needs Manual Verification'

class EligibilityEvaluation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='eligibility_evaluations')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name='evaluations')
    status = models.CharField(max_length=50, choices=EligibilityResultStatus.choices, default=EligibilityResultStatus.INSUFFICIENT_INFORMATION)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    matched_conditions = models.JSONField(default=list)
    failed_conditions = models.JSONField(default=list)
    unconfirmed_conditions = models.JSONField(default=list)
    missing_profile_fields = models.JSONField(default=list)
    explanation = models.TextField(blank=True)
    next_actions = models.JSONField(default=list)
    evaluated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-evaluated_at']
        indexes = [
            models.Index(fields=['user', 'opportunity']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        user_label = self.user.email if self.user else "Anonymous"
        return f"{user_label} - {self.opportunity.title} ({self.status})"
