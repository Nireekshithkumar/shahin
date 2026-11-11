from rest_framework import viewsets, views, permissions, status
from rest_framework.response import Response
from apps.workflows.models import EligibilityWorkflow, WorkflowExecution
from apps.workflows.serializers import EligibilityWorkflowSerializer
from apps.workflows.engine import WorkflowExecutionEngine

class EligibilityWorkflowViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = EligibilityWorkflowSerializer

    def get_queryset(self):
        # Return public templates and user's own workflows
        if self.request.user.is_authenticated:
            return EligibilityWorkflow.objects.filter(is_active=True).filter(
                models_Q := self._get_filter()
            )
        return EligibilityWorkflow.objects.filter(is_template=True, is_active=True)

    def _get_filter(self):
        from django.db.models import Q
        return Q(is_template=True) | Q(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)

class ExecuteWorkflowView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, id=None):
        input_data = request.data.get('input_data', {})

        if id:
            try:
                workflow = EligibilityWorkflow.objects.get(id=id)
                workflow_def = {'nodes': workflow.nodes, 'edges': workflow.edges}
            except EligibilityWorkflow.DoesNotExist:
                return Response({'error': 'Workflow not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            workflow_def = {
                'nodes': request.data.get('nodes', []),
                'edges': request.data.get('edges', [])
            }
            workflow = None

        # Execute securely via deterministic backend engine
        result = WorkflowExecutionEngine.execute(workflow_def, input_data)

        # Record execution history if saved workflow exists
        if workflow and request.user.is_authenticated:
            WorkflowExecution.objects.create(
                workflow=workflow,
                user=request.user,
                input_data=result['resolved_inputs'],
                execution_logs=result['execution_logs'],
                result_status=result['result_status'],
                matched_opportunities=result['matched_opportunities']
            )

        return Response(result, status=status.HTTP_200_OK)
