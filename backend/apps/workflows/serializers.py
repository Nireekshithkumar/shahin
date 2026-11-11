from rest_framework import serializers
from apps.workflows.models import EligibilityWorkflow, WorkflowExecution

class EligibilityWorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = EligibilityWorkflow
        fields = ['id', 'title', 'description', 'nodes', 'edges', 'is_template', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class WorkflowExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowExecution
        fields = '__all__'
