from django.db import models
from django.conf import settings
from apps.opportunities.models import Opportunity

class UserRecommendationLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recommendation_logs')
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE)
    score = models.DecimalField(max_digits=5, decimal_places=2)
    ranking_factors = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score', '-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.opportunity.title} (Score: {self.score})"
