import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls, Background, applyNodeChanges, applyEdgeChanges,
  addEdge, Node, Edge, Connection, NodeChange, EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Play, Plus, Save, RotateCcw, CheckCircle2, AlertCircle,
  FileCode, Layers, ShieldCheck, ExternalLink, Sparkles
} from 'lucide-react';
import { workflowService } from '../services/scholarsetuService';

const initialNodes: Node[] = [
  {
    id: 'n1',
    type: 'default',
    position: { x: 50, y: 50 },
    data: { label: 'Input: Education = UNDERGRADUATE' },
    style: { background: '#eff6ff', borderColor: '#3b82f6', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }
  },
  {
    id: 'n2',
    type: 'default',
    position: { x: 50, y: 150 },
    data: { label: 'Input: Annual Income <= ₹4,50,000' },
    style: { background: '#eff6ff', borderColor: '#3b82f6', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }
  },
  {
    id: 'n3',
    type: 'default',
    position: { x: 50, y: 250 },
    data: { label: 'Input: Academic Marks >= 60%' },
    style: { background: '#eff6ff', borderColor: '#3b82f6', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }
  },
  {
    id: 'n4',
    type: 'default',
    position: { x: 340, y: 120 },
    data: { label: 'Logic: Check Income Cap (<= 450000)' },
    style: { background: '#fef3c7', borderColor: '#f59e0b', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }
  },
  {
    id: 'n5',
    type: 'default',
    position: { x: 340, y: 220 },
    data: { label: 'Logic: Check Academic Cutoff (>= 60%)' },
    style: { background: '#fef3c7', borderColor: '#f59e0b', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }
  },
  {
    id: 'n6',
    type: 'default',
    position: { x: 620, y: 170 },
    data: { label: 'Output: Show Matching Scholarships' },
    style: { background: '#ecfdf5', borderColor: '#10b981', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-4', source: 'n1', target: 'n4', animated: true },
  { id: 'e2-4', source: 'n2', target: 'n4', animated: true },
  { id: 'e3-5', source: 'n3', target: 'n5', animated: true },
  { id: 'e4-6', source: 'n4', target: 'n6', animated: true },
  { id: 'e5-6', source: 'n5', target: 'n6', animated: true },
];

export const WorkflowBuilderPage: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  // Test input data passed to engine
  const [testInputs, setTestInputs] = useState({
    education_level: 'UNDERGRADUATE',
    annual_family_income: 250000,
    academic_percentage: 78,
    state_or_ut: 'Karnataka',
  });

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    []
  );

  const handleAddNode = (category: 'INPUT' | 'CONDITION' | 'OUTPUT') => {
    const id = `node-${Date.now()}`;
    let label = 'New Condition';
    let style = { background: '#f8fafc', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' };

    if (category === 'INPUT') {
      label = 'Input: Category = OBC';
      style = { background: '#eff6ff', borderColor: '#3b82f6', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' };
    } else if (category === 'CONDITION') {
      label = 'Condition: Domicile = Karnataka';
      style = { background: '#fef3c7', borderColor: '#f59e0b', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' };
    } else {
      label = 'Output: Eligible Decision';
      style = { background: '#ecfdf5', borderColor: '#10b981', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' };
    }

    const newNode: Node = {
      id,
      position: { x: 200 + Math.random() * 100, y: 100 + Math.random() * 100 },
      data: { label },
      style,
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleExecute = async () => {
    setExecuting(true);
    setExecutionResult(null);
    try {
      // Map nodes into declarative format for backend
      const res = await workflowService.executeDirect(
        { nodes, edges },
        testInputs
      );
      setExecutionResult(res);
    } catch (err) {
      console.error('Workflow execution failed', err);
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setExecutionResult(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            Visual Eligibility Workflow Builder
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Design, connect, and validate declarative eligibility pipelines executed securely on the Django backend.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAddNode('INPUT')}
            className="px-2.5 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 font-semibold text-xs hover:bg-brand-100 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> + Input
          </button>
          <button
            onClick={() => handleAddNode('CONDITION')}
            className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 font-semibold text-xs hover:bg-amber-100 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> + Condition
          </button>
          <button
            onClick={() => handleAddNode('OUTPUT')}
            className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold text-xs hover:bg-emerald-100 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> + Output
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-100 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={handleExecute}
            disabled={executing}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {executing ? 'Executing...' : 'Run Backend Pipeline'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* React Flow Canvas */}
        <div className="lg:col-span-2 h-[480px] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background color="#cbd5e1" gap={16} size={1} />
            <Controls />
          </ReactFlow>

          {/* Quick instructions floating badge */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] text-slate-500 font-medium">
            Drag nodes to rearrange • Drag handles to connect
          </div>
        </div>

        {/* Test Inputs & Trace Execution Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-xs mb-3 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-brand-600" />
              Pipeline Test Parameters
            </h3>

            <div className="space-y-2 text-xs mb-4">
              <div>
                <label className="text-[11px] text-slate-500">Degree Level:</label>
                <input
                  type="text"
                  value={testInputs.education_level}
                  onChange={(e) => setTestInputs({ ...testInputs, education_level: e.target.value })}
                  className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Family Income (₹):</label>
                <input
                  type="number"
                  value={testInputs.annual_family_income}
                  onChange={(e) => setTestInputs({ ...testInputs, annual_family_income: Number(e.target.value) })}
                  className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Academic Marks (%):</label>
                <input
                  type="number"
                  value={testInputs.academic_percentage}
                  onChange={(e) => setTestInputs({ ...testInputs, academic_percentage: Number(e.target.value) })}
                  className="w-full mt-0.5 p-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Execution Logs */}
            <h4 className="font-bold text-slate-900 text-xs mb-2">Backend Execution Trace:</h4>
            {executionResult ? (
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono">
                {executionResult.execution_logs?.map((log: any, idx: number) => (
                  <div key={idx} className="leading-tight text-slate-700">
                    <span className="text-brand-600 font-bold">[{log.step}]</span> {log.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                Click "Run Backend Pipeline" to trace graph execution.
              </div>
            )}
          </div>

          {executionResult && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Status:</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                  {executionResult.result_status} ({executionResult.total_matches} Matching Schemes)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Matching Opportunities Found by the Pipeline */}
      {executionResult?.matched_opportunities && executionResult.matched_opportunities.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Verified Schemes Matching Executed Pipeline Criteria ({executionResult.matched_opportunities.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {executionResult.matched_opportunities.map((opp: any) => (
              <div key={opp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1 line-clamp-1">{opp.title}</h4>
                  <p className="text-[11px] text-slate-500 mb-2">{opp.provider}</p>
                  <p className="text-xs font-bold text-emerald-700 mb-2">{opp.benefit_description}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Match: {opp.confidence_score}%</span>
                  <a
                    href={`/scholarships?id=${opp.id}`}
                    className="font-bold text-brand-600 hover:underline flex items-center gap-1"
                  >
                    View Scheme <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
