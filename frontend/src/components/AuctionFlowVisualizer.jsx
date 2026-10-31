import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
} from '@xyflow/react';

export function AuctionFlowVisualizer({ rfq, isInTriggerWindow }) {
  const isClosed = rfq.status === 'CLOSED' || rfq.status === 'FORCE_CLOSED';
  const isActive = rfq.status === 'ACTIVE';
  const isScheduled = rfq.status === 'SCHEDULED';

  const triggerRule = rfq.config?.extension_trigger || 'L1_RANK_CHANGE';
  const triggerWindow = rfq.config?.trigger_window_minutes || 10;
  const extDuration = rfq.config?.extension_duration_minutes || 5;

  const { nodes, edges } = useMemo(() => {
    const rawNodes = [
      {
        id: '1',
        type: 'input',
        data: {
          label: (
            <div className="p-2 text-left">
              <div className="text-[10px] font-bold uppercase text-slate-400">Step 1</div>
              <div className="text-xs font-bold text-slate-800">RFQ Creation</div>
              <div className="text-[10px] text-slate-500">Config: X={triggerWindow}m, Y={extDuration}m</div>
            </div>
          ),
        },
        position: { x: 20, y: 50 },
        style: {
          background: isScheduled ? '#eff6ff' : '#ffffff',
          borderColor: isScheduled ? '#3b82f6' : '#cbd5e1',
          borderWidth: 2,
          borderRadius: 10,
          width: 170,
        },
      },
      {
        id: '2',
        data: {
          label: (
            <div className="p-2 text-left">
              <div className="text-[10px] font-bold uppercase text-slate-400">Step 2</div>
              <div className="text-xs font-bold text-slate-800">Competitive Bids</div>
              <div className="text-[10px] text-slate-500">Continuous price lowering</div>
            </div>
          ),
        },
        position: { x: 230, y: 50 },
        style: {
          background: isActive && !isInTriggerWindow ? '#ecfdf5' : '#ffffff',
          borderColor: isActive && !isInTriggerWindow ? '#10b981' : '#cbd5e1',
          borderWidth: 2,
          borderRadius: 10,
          width: 170,
        },
      },
      {
        id: '3',
        data: {
          label: (
            <div className="p-2 text-left">
              <div className="text-[10px] font-bold uppercase text-amber-600">Decision Engine</div>
              <div className="text-xs font-bold text-slate-900">Trigger Window ({triggerWindow}m)</div>
              <div className="text-[10px] text-slate-500">Rule: {triggerRule}</div>
            </div>
          ),
        },
        position: { x: 440, y: 50 },
        style: {
          background: isInTriggerWindow ? '#fef3c7' : '#ffffff',
          borderColor: isInTriggerWindow ? '#f59e0b' : '#cbd5e1',
          borderWidth: 2,
          borderRadius: 10,
          width: 190,
          boxShadow: isInTriggerWindow ? '0 0 12px rgba(245, 158, 11, 0.4)' : 'none',
        },
      },
      {
        id: '4',
        data: {
          label: (
            <div className="p-2 text-left">
              <div className="text-[10px] font-bold uppercase text-slate-400">Extension Engine</div>
              <div className="text-xs font-bold text-slate-900">+ {extDuration} Mins Extension</div>
              <div className="text-[10px] text-slate-500">Bounded by Forced Close</div>
            </div>
          ),
        },
        position: { x: 670, y: 50 },
        style: {
          background: '#ffffff',
          borderColor: '#cbd5e1',
          borderWidth: 2,
          borderRadius: 10,
          width: 170,
        },
      },
      {
        id: '5',
        type: 'output',
        data: {
          label: (
            <div className="p-2 text-left">
              <div className="text-[10px] font-bold uppercase text-slate-400">Step 4</div>
              <div className="text-xs font-bold text-slate-900">
                {rfq.status === 'FORCE_CLOSED' ? 'Force Closed' : 'Auction Concluded'}
              </div>
              <div className="text-[10px] text-slate-500">L1 Winner Awarded</div>
            </div>
          ),
        },
        position: { x: 880, y: 50 },
        style: {
          background: isClosed ? '#f8fafc' : '#ffffff',
          borderColor: isClosed ? '#475569' : '#cbd5e1',
          borderWidth: 2,
          borderRadius: 10,
          width: 170,
        },
      },
    ];

    const rawEdges = [
      {
        id: 'e1-2',
        source: '1',
        target: '2',
        animated: isActive,
        style: { stroke: isActive ? '#10b981' : '#94a3b8' },
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e2-3',
        source: '2',
        target: '3',
        label: 'Bid inside [T - X]',
        labelStyle: { fontSize: 10, fill: '#64748b' },
        animated: isInTriggerWindow,
        style: { stroke: isInTriggerWindow ? '#f59e0b' : '#94a3b8' },
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e3-4',
        source: '3',
        target: '4',
        label: `${triggerRule} fired`,
        labelStyle: { fontSize: 10, fill: '#64748b' },
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e4-2',
        source: '4',
        target: '2',
        label: 'Time extended, bids continue',
        labelStyle: { fontSize: 10, fill: '#0284c7' },
        style: { stroke: '#0284c7', strokeDasharray: '4 4' },
        type: 'smoothstep',
      },
      {
        id: 'e3-5',
        source: '3',
        target: '5',
        label: 'Deadline or Forced Close ceiling',
        labelStyle: { fontSize: 10, fill: '#64748b' },
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ];

    return { nodes: rawNodes, edges: rawEdges };
  }, [rfq.status, isInTriggerWindow, triggerRule, triggerWindow, extDuration, isScheduled, isActive, isClosed]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Interactive British Auction Engine & Bid Flow (React Flow)
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          State: <strong className="text-slate-800">{rfq.status}</strong>
          {isInTriggerWindow && ' • (IN TRIGGER WINDOW)'}
        </span>
      </div>
      <div className="h-56 w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
