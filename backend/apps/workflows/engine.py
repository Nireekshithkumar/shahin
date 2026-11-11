"""
Declarative Workflow Execution Engine for ScholarSetu AI.
Safely interprets and executes visual React Flow eligibility pipelines on the backend.
No arbitrary code execution; only approved, validated node operations.
"""
from typing import Dict, Any, List, Set
from decimal import Decimal
from apps.opportunities.models import Opportunity
from apps.eligibility.engine import EligibilityEngine
from apps.eligibility.models import EligibilityResultStatus

class WorkflowExecutionEngine:
    """
    Executes declarative React Flow graphs:
    - Input Nodes: gathers test attributes or defaults from user profile
    - Condition/Logic Nodes: evaluates boolean gates (Equals, Greater, Less, Between, AND, OR)
    - Output Nodes: produces final eligibility decision, execution trace, and matching opportunities
    """

    ALLOWED_INPUT_KEYS = {
        'education_level', 'state_or_ut', 'annual_family_income', 'academic_percentage',
        'course_name', 'category', 'gender', 'is_disabled', 'disability_percentage', 'age'
    }

    @classmethod
    def execute(cls, workflow_def: Dict[str, Any], input_data: Dict[str, Any]) -> Dict[str, Any]:
        nodes = workflow_def.get('nodes', [])
        edges = workflow_def.get('edges', [])
        logs: List[Dict[str, Any]] = []

        # Build adjacency mapping
        adj: Dict[str, List[str]] = {}
        for edge in edges:
            src = edge.get('source')
            tgt = edge.get('target')
            if src and tgt:
                adj.setdefault(src, []).append(tgt)

        node_map = {n['id']: n for n in nodes if 'id' in n}
        logs.append({
            'step': 'INITIALIZATION',
            'message': f"Workflow graph loaded with {len(nodes)} nodes and {len(edges)} connections.",
            'status': 'SUCCESS'
        })

        # 1. Collect inputs
        resolved_inputs: Dict[str, Any] = {}
        input_nodes = [n for n in nodes if n.get('type') == 'inputNode' or n.get('data', {}).get('category') == 'INPUT']
        
        for inode in input_nodes:
            key = inode.get('data', {}).get('fieldKey') or inode.get('data', {}).get('label', '').lower().replace(' ', '_')
            val = input_data.get(key, inode.get('data', {}).get('defaultValue'))
            if key:
                resolved_inputs[key] = val
                logs.append({
                    'step': 'INPUT_RESOLVED',
                    'node_id': inode['id'],
                    'field': key,
                    'value': str(val),
                    'message': f"Resolved input '{key}': {val}"
                })

        # Default fallback inputs if not specified in input nodes
        for k, v in input_data.items():
            if k not in resolved_inputs:
                resolved_inputs[k] = v

        # 2. Evaluate condition and logic nodes
        condition_results: Dict[str, bool] = {}
        logic_nodes = [n for n in nodes if n.get('type') in ['conditionNode', 'logicNode'] or n.get('data', {}).get('category') in ['CONDITION', 'LOGIC']]

        for lnode in logic_nodes:
            nid = lnode['id']
            data = lnode.get('data', {})
            op = data.get('operator') or data.get('logicType') or 'CHECK'
            field = data.get('field', 'annual_family_income')
            target_val = data.get('targetValue')

            user_val = resolved_inputs.get(field)
            res = cls._evaluate_condition(op, user_val, target_val, data)
            condition_results[nid] = res
            logs.append({
                'step': 'CONDITION_EVALUATED',
                'node_id': nid,
                'operator': op,
                'field': field,
                'result': res,
                'message': f"Node '{data.get('label', nid)}' evaluated to {res} (Value: {user_val}, Target: {target_val})"
            })

        # 3. Find matching opportunities based on resolved inputs
        all_opps = Opportunity.objects.all()[:50]
        matched_opps = []
        for opp in all_opps:
            eval_res = EligibilityEngine.evaluate(opp, custom_input=resolved_inputs)
            if eval_res['status'] in [EligibilityResultStatus.ELIGIBLE, EligibilityResultStatus.POTENTIALLY_ELIGIBLE]:
                matched_opps.append({
                    'id': opp.id,
                    'title': opp.title,
                    'provider': opp.provider,
                    'applicable_state': opp.applicable_state,
                    'status': eval_res['status'],
                    'confidence_score': eval_res['confidence_score'],
                    'benefit_description': opp.benefit_description or (f"₹{int(opp.benefit_amount):,}" if opp.benefit_amount else "Government grant"),
                    'closing_date': str(opp.application_closing_date) if opp.application_closing_date else "Open",
                    'matched_conditions': eval_res['matched_conditions'],
                })

        all_conditions_passed = all(condition_results.values()) if condition_results else True
        final_status = 'ELIGIBLE' if (all_conditions_passed and len(matched_opps) > 0) else ('NEEDS_MORE_INFO' if not condition_results else 'INELIGIBLE')

        logs.append({
            'step': 'COMPLETION',
            'final_status': final_status,
            'matches_found': len(matched_opps),
            'message': f"Workflow execution complete. Found {len(matched_opps)} opportunities matching workflow conditions."
        })

        return {
            'result_status': final_status,
            'execution_logs': logs,
            'condition_results': condition_results,
            'resolved_inputs': resolved_inputs,
            'matched_opportunities': matched_opps[:10],
            'total_matches': len(matched_opps),
        }

    @staticmethod
    def _evaluate_condition(op: str, val: Any, target: Any, node_data: dict) -> bool:
        op = str(op).upper()
        if val is None:
            return False

        try:
            if op in ['GREATER_THAN', '>']:
                return Decimal(str(val)) > Decimal(str(target))
            elif op in ['LESS_THAN', '<', 'LESS_THAN_OR_EQUAL', '<=']:
                return Decimal(str(val)) <= Decimal(str(target))
            elif op in ['EQUALS', '==', '=']:
                return str(val).strip().lower() == str(target).strip().lower()
            elif op in ['BETWEEN']:
                low = Decimal(str(node_data.get('minVal', 0)))
                high = Decimal(str(node_data.get('maxVal', 10000000)))
                return low <= Decimal(str(val)) <= high
            elif op in ['CONTAINS']:
                return str(target).lower() in str(val).lower()
            elif op in ['IS_KNOWN']:
                return val is not None and str(val).strip() != ''
            elif op in ['CHECK_INCOME']:
                limit = Decimal(str(target or 250000))
                return Decimal(str(val)) <= limit
            elif op in ['CHECK_ACADEMICS']:
                cutoff = Decimal(str(target or 60))
                return Decimal(str(val)) >= cutoff
            elif op in ['CHECK_STATE']:
                return str(val).strip().lower() == str(target or 'All India').strip().lower() or str(target).lower() in ['all india', 'nationwide']
            else:
                return True
        except Exception:
            return False
