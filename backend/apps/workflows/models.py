from django.db import models
from django.conf import settings

class EligibilityWorkflow(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='workflows')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    nodes = models.JSONField(default=list, help_text="React Flow nodes array")
    edges = models.JSONField(default=list, help_text="React Flow edges array")
    is_template = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        owner = self.user.email if self.user else "System Template"
        return f"{self.title} ({owner})"

class WorkflowExecution(models.Model):
    workflow = models.ForeignKey(EligibilityWorkflow, on_delete=models.CASCADE, related_name='executions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='workflow_executions')
    input_data = models.JSONField(default=dict)
    execution_logs = models.JSONField(default=list)
    result_status = models.CharField(max_length=50, default='EVALUATED')
    matched_opportunities = models.JSONField(default=list)
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-executed_at']

    def __str__(self):
        return f"Execution of {self.workflow.title} on {self.executed_at} [{self.result_status}]"
