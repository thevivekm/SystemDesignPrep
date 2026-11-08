import {
  addEdge,
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COMPONENT_BY_KIND } from '../../data/components';
import { useTheme } from '../../theme';
import type { ComponentType, DesignNode, DiagramData } from '../../types';
import { nodeTypes } from './ComponentNode';
import { DND_MIME, Palette } from './Palette';
import { defaultEdgeOptions, edgeTypes, prefersReducedMotion, SimContext, type Sim, type SimInput } from './sim';

export { defaultEdgeOptions };

let idCounter = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

interface Props {
  initial: DiagramData;
  onChange: (d: DiagramData) => void;
  /** Always holds the latest (un-debounced) diagram, for instant checks. */
  liveRef?: React.MutableRefObject<DiagramData | null>;
  /** Called immediately (no debounce) whenever nodes or edges change. */
  onLiveChange?: (d: DiagramData) => void;
  /** Traffic simulation state; defaults to idle traffic. */
  sim?: SimInput;
  /** Extra content shown in the canvas top bar (e.g. a status badge). */
  overlay?: React.ReactNode;
}

const NO_HOT: Record<string, string> = {};

function CanvasInner({ initial, onChange, liveRef, onLiveChange, sim, overlay }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<DesignNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const { screenToFlowPosition } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const viewport = useRef(initial.viewport);
  const clickAdds = useRef(0);
  const rf = useRef<ReactFlowInstance<DesignNode, Edge> | null>(null);
  const theme = useTheme((s) => s.theme);
  const [editingEdge, setEditingEdge] = useState<{ id: string; label: string } | null>(null);
  const [running, setRunning] = useState(() => !prefersReducedMotion());
  const simValue = useMemo<Sim>(() => ({ running, state: sim?.state ?? 'idle', hot: sim?.hot ?? NO_HOT }), [running, sim?.state, sim?.hot]);

  useEffect(() => {
    if (liveRef) liveRef.current = { nodes, edges };
    onLiveChange?.({ nodes, edges });
  }, [nodes, edges, liveRef, onLiveChange]);

  // Debounced autosave (skip until the user actually changes something)
  useEffect(() => {
    if (nodes === initial.nodes && edges === initial.edges) return;
    const t = setTimeout(() => onChange({ nodes: strip(nodes), edges, viewport: viewport.current }), 400);
    return () => clearTimeout(t);
  }, [nodes, edges, onChange, initial]);

  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, id: newId('e') }, es)), [setEdges]);

  const addNode = useCallback(
    (kind: ComponentType, position?: { x: number; y: number }) => {
      let pos = position;
      if (!pos) {
        const r = wrapper.current?.getBoundingClientRect();
        pos = r ? screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) : { x: 0, y: 0 };
        // Lay click-added nodes out in a grid around the center so they don't stack
        const k = clickAdds.current++ % 12;
        pos = { x: pos.x - 75 + ((k % 4) - 1.5) * 190, y: pos.y - 24 + (Math.floor(k / 4) - 1) * 100 };
      }
      const def = COMPONENT_BY_KIND[kind];
      const node: DesignNode = {
        id: newId('n'),
        type: 'component',
        position: pos,
        data: { kind, label: kind === 'note' ? 'Double-click to edit note' : def.label },
        style: { width: kind === 'note' ? 180 : 150, height: kind === 'note' ? 70 : 48 },
      };
      setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...node, selected: true }]);
    },
    [screenToFlowPosition, setNodes]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData(DND_MIME) as ComponentType;
      if (!kind || !COMPONENT_BY_KIND[kind]) return;
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(kind, { x: p.x - 75, y: p.y - 24 });
    },
    [addNode, screenToFlowPosition]
  );

  const clear = () => {
    if (nodes.length === 0 || confirm('Clear the whole canvas?')) {
      setNodes([]);
      setEdges([]);
    }
  };

  const saveEdgeLabel = () => {
    if (!editingEdge) return;
    setEdges((es) => es.map((e) => (e.id === editingEdge.id ? { ...e, label: editingEdge.label.trim() || undefined } : e)));
    setEditingEdge(null);
  };

  return (
    <SimContext.Provider value={simValue}>
    <div className="flex h-full min-h-0">
      <Palette onAdd={(k) => addNode(k)} />
      <div ref={wrapper} className="relative min-w-0 flex-1" onDragOver={(e) => (e.preventDefault(), (e.dataTransfer.dropEffect = 'move'))} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={(i) => {
            rf.current = i;
            if (!initial.viewport) i.fitView({ padding: 0.3, maxZoom: 1 });
          }}
          onMoveEnd={(_, vp) => {
            viewport.current = vp;
            // Don't mark a problem as started just because the empty canvas was panned
            if (nodes.length) onChange({ nodes: strip(nodes), edges, viewport: vp });
          }}
          onEdgeDoubleClick={(_, edge) => setEditingEdge({ id: edge.id, label: String(edge.label ?? '') })}
          defaultViewport={initial.viewport}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={['Backspace', 'Delete']}
          colorMode={theme}
          snapToGrid
          snapGrid={[10, 10]}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right" className="!hidden md:!block" />
        </ReactFlow>
        <div className="pointer-events-none absolute left-2 top-2 right-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            {overlay}
            <div className="pointer-events-auto hidden rounded-md bg-white/90 px-2 py-1 text-[11px] text-slate-500 shadow-sm lg:block dark:bg-slate-800/90 dark:text-slate-400">
              Drag from a node edge to connect · Double-click node/arrow to label · Del to remove
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              title={running ? 'Pause the traffic animation' : 'Animate traffic flowing through the system'}
              className="pointer-events-auto flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm hover:text-indigo-600 dark:bg-slate-800/90 dark:text-slate-300"
            >
              {running ? (
                <>
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" /></span>
                  Traffic on
                </>
              ) : (
                <>
                  <span className="inline-flex h-2 w-2 rounded-full bg-slate-400" />
                  Traffic paused
                </>
              )}
            </button>
            <button type="button" onClick={clear} className="pointer-events-auto rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm hover:text-red-600 dark:bg-slate-800/90 dark:text-slate-300">
              Clear
            </button>
          </div>
        </div>
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="max-w-xs text-center text-sm text-slate-400 dark:text-slate-500">Your canvas is empty. Drag components from the left to start sketching the architecture.</p>
          </div>
        )}
        {editingEdge && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20" onClick={() => setEditingEdge(null)}>
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => (e.preventDefault(), saveEdgeLabel())}
              className="w-72 rounded-lg bg-white p-3 shadow-xl dark:bg-slate-800"
            >
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Arrow label</label>
              <input
                autoFocus
                value={editingEdge.label}
                onChange={(e) => setEditingEdge({ ...editingEdge, label: e.target.value })}
                placeholder="e.g. HTTPS, async, reads"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingEdge(null)} className="rounded-md px-2 py-1 text-xs text-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white">Save</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
    </SimContext.Provider>
  );
}

// Drop transient fields before persisting
function strip(nodes: DesignNode[]): DesignNode[] {
  return nodes.map(({ id, type, position, data, style, width, height }) => ({ id, type, position, data, style, width, height }));
}

export function DesignCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
