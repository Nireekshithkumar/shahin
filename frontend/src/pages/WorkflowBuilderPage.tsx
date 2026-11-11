import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Controls, Background, applyNodeChanges, applyEdgeChanges,
  addEdge, Node, Edge, Connection, NodeChange, EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Play, Plus, RotateCcw, CheckCircle2,
  FileCode, Layers, ExternalLink
} from 'lucide-react';
import { workflowService } from '../services/scholarsetuService';

const initialNodes: Node[] = [
  {
    id: 'n1',
    type: 'default',
    position: { x: 50, y: 50 },
    data: { label: 'Input: Education = UNDERGRADUATE' },
    style: { background: '#F4F4F6', borderColor: '#D2D2D4', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' }
  },
  {
    id: 'n2',
    type: 'default',
    position: { x: 50, y: 150 },
    data: { label: 'Input: Annual Income <= ₹4,50,000' },
    style: { background: '#F4F4F6', borderColor: '#D2D2D4', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' }
  },
  {
    id: 'n3',
    type: 'default',
    position: { x: 50, y: 250 },
    data: { label: 'Input: Academic Marks >= 60%' },
    style: { background: '#F4F4F6', borderColor: '#D2D2D4', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' }
  },
  {
    id: 'n4',
    type: 'default',
    position: { x: 340, y: 120 },
    data: { label: 'Logic: Check Income Cap (<= 450000)' },
    style: { background: '#E7E7E7', borderColor: '#FF634A', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' }
  },
  {
    id: 'n5',
    type: 'default',
    position: { x: 340, y: 220 },
    data: { label: 'Logic: Check Academic Cutoff (>= 60%)' },
    style: { background: '#E7E7E7', borderColor: '#FF634A', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' }
  },
  {
    id: 'n6',
    type: 'default',
    position: { x: 620, y: 170 },
    data: { label: 'Output: Show Matching Scholarships' },
    style: { background: '#FF634A', borderColor: '#FF634A', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#FFFFFF' }
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-4', source: 'n1', target: 'n4', animated: true, style: { stroke: '#FF634A' } },
  { id: 'e2-4', source: 'n2', target: 'n4', animated: true, style: { stroke: '#FF634A' } },
  { id: 'e3-5', source: 'n3', target: 'n5', animated: true, style: { stroke: '#FF634A' } },
  { id: 'e4-6', source: 'n4', target: 'n6', animated: true, style: { stroke: '#FF634A' } },
  { id: 'e5-6', source: 'n5', target: 'n6', animated: true, style: { stroke: '#FF634A' } },
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
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#FF634A' } }, eds)),
    []
  );

  const handleAddNode = (category: 'INPUT' | 'CONDITION' | 'OUTPUT') => {
    const id = `node-${Date.now()}`;
    let label = 'New Condition';
    let style = { background: '#F4F4F6', borderColor: '#D2D2D4', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' };

    if (category === 'INPUT') {
      label = 'Input: Category = OBC';
      style = { background: '#F4F4F6', borderColor: '#D2D2D4', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' };
    } else if (category === 'CONDITION') {
      label = 'Condition: Domicile = Karnataka';
      style = { background: '#E7E7E7', borderColor: '#FF634A', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#000000' };
    } else {
      label = 'Output: Eligible Decision';
      style = { background: '#FF634A', borderColor: '#FF634A', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', color: '#FFFFFF' };
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
          <h1 className="text-xl font-black text-black tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FF634A]" />
            Visual Eligibility Workflow Builder
          </h1>
          <p className="text-xs text-black/70 mt-0.5">
            Design, connect, and validate declarative eligibility pipelines executed securely on the Django backend.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleAddNode('INPUT')}
            className="px-2.5 py-1.5 rounded-lg border border-[#D2D2D4] bg-[#E7E7E7] text-black font-semibold text-xs hover:bg-[#D2D2D4] flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> + Input
          </button>
          <button
            onClick={() => handleAddNode('CONDITION')}
            className="px-2.5 py-1.5 rounded-lg border border-[#FF634A] bg-[#F4F4F6] text-black font-semibold text-xs hover:bg-[#E7E7E7] flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#FF634A]" /> + Condition
          </button>
          <button
            onClick={() => handleAddNode('OUTPUT')}
            className="px-2.5 py-1.5 rounded-lg bg-[#FF634A] text-white font-semibold text-xs hover:opacity-90 flex items-center gap-1 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" /> + Output
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-lg border border-[#D2D2D4] bg-[#E7E7E7] text-black font-semibold text-xs hover:bg-[#D2D2D4] flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={handleExecute}
            disabled={executing}
            className="px-4 py-1.5 rounded-lg bg-[#FF634A] hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 transition-opacity disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {executing ? 'Executing...' : 'Run Backend Pipeline'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* React Flow Canvas */}
        <div className="lg:col-span-2 h-[480px] bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] overflow-hidden relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background color="#D2D2D4" gap={16} size={1} />
            <Controls />
          </ReactFlow>

          {/* Quick instructions floating badge */}
          <div className="absolute bottom-3 left-3 bg-[#F4F4F6] border border-[#D2D2D4] rounded-lg px-2.5 py-1 text-[10px] text-black/70 font-medium">
            Drag nodes to rearrange • Drag handles to connect
          </div>
        </div>

        {/* Test Inputs & Trace Execution Panel */}
        <div className="bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-black text-xs mb-3 pb-2 border-b border-[#D2D2D4] flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-[#FF634A]" />
              Pipeline Test Parameters
            </h3>

            <div className="space-y-2 text-xs mb-4">
              <div>
                <label className="text-[11px] text-black/70">Degree Level:</label>
                <input
                  type="text"
                  value={testInputs.education_level}
                  onChange={(e) => setTestInputs({ ...testInputs, education_level: e.target.value })}
                  className="w-full mt-0.5 p-2 bg-[#F4F4F6] border border-[#D2D2D4] rounded-lg text-xs text-black focus:outline-none focus:border-[#FF634A]"
                />
              </div>
              <div>
                <label className="text-[11px] text-black/70">Family Income (₹):</label>
                <input
                  type="number"
                  value={testInputs.annual_family_income}
                  onChange={(e) => setTestInputs({ ...testInputs, annual_family_income: Number(e.target.value) })}
                  className="w-full mt-0.5 p-2 bg-[#F4F4F6] border border-[#D2D2D4] rounded-lg text-xs text-black focus:outline-none focus:border-[#FF634A]"
                />
              </div>
              <div>
                <label className="text-[11px] text-black/70">Academic Marks (%):</label>
                <input
                  type="number"
                  value={testInputs.academic_percentage}
                  onChange={(e) => setTestInputs({ ...testInputs, academic_percentage: Number(e.target.value) })}
                  className="w-full mt-0.5 p-2 bg-[#F4F4F6] border border-[#D2D2D4] rounded-lg text-xs text-black focus:outline-none focus:border-[#FF634A]"
                />
              </div>
            </div>

            {/* Execution Logs */}
            <h4 className="font-bold text-black text-xs mb-2">Backend Execution Trace:</h4>
            {executionResult ? (
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-[#F4F4F6] border border-[#D2D2D4] rounded-lg text-[11px] font-mono">
                {executionResult.execution_logs?.map((log: any, idx: number) => (
                  <div key={idx} className="leading-tight text-black/80">
                    <span className="text-[#FF634A] font-bold">[{log.step}]</span> {log.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[#F4F4F6] border border-[#D2D2D4] text-center text-xs text-black/60">
                Click "Run Backend Pipeline" to trace graph execution.
              </div>
            )}
          </div>

          {executionResult && (
            <div className="mt-4 pt-3 border-t border-[#D2D2D4]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black">Status:</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#F4F4F6] border border-[#D2D2D4] text-black">
                  {executionResult.result_status} ({executionResult.total_matches} Matching Schemes)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Matching Opportunities Found by the Pipeline */}
      {executionResult?.matched_opportunities && executionResult.matched_opportunities.length > 0 && (
        <div className="mt-8 bg-[#E7E7E7] rounded-xl border border-[#D2D2D4] p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-[#FF634A]" />
            <h3 className="font-bold text-black text-sm">
              Verified Schemes Matching Executed Pipeline Criteria ({executionResult.matched_opportunities.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {executionResult.matched_opportunities.map((opp: any) => (
              <div key={opp.id} className="p-4 rounded-xl border border-[#D2D2D4] bg-[#F4F4F6] flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-black text-xs mb-1 line-clamp-1">{opp.title}</h4>
                  <p className="text-[11px] text-black/60 mb-2">{opp.provider}</p>
                  <p className="text-xs font-bold text-black mb-2">{opp.benefit_description}</p>
                </div>
                <div className="pt-2 border-t border-[#D2D2D4] flex items-center justify-between text-[11px]">
                  <span className="text-black/60">Match: {opp.confidence_score}%</span>
                  <a
                    href={`/scholarships?id=${opp.id}`}
                    className="font-bold text-[#FF634A] hover:underline flex items-center gap-1"
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
