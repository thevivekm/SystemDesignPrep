import { Background, ConnectionMode, Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import { useMemo } from 'react';
import { useTheme } from '../../theme';
import type { DiagramData } from '../../types';
import { nodeTypes } from './ComponentNode';
import { defaultEdgeOptions, edgeTypes, prefersReducedMotion, SimContext, type Sim, type SimInput } from './sim';

const NO_HOT: Record<string, string> = {};

export function ReadOnlyDiagram({ diagram, sim, minimal = false }: { diagram: DiagramData; sim?: SimInput; minimal?: boolean }) {
  const theme = useTheme((s) => s.theme);
  const nodes = useMemo(() => diagram.nodes.map((n) => ({ ...n, data: { ...n.data, readOnly: true } })), [diagram]);
  const edges = useMemo(() => diagram.edges.map((e) => ({ ...defaultEdgeOptions, ...e, type: 'flow' })), [diagram]);
  const simValue = useMemo<Sim>(() => ({ running: !prefersReducedMotion(), state: sim?.state ?? 'idle', hot: sim?.hot ?? NO_HOT }), [sim?.state, sim?.hot]);
  return (
    <SimContext.Provider value={simValue}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: minimal ? 0.08 : 0.15 }}
          colorMode={theme}
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          panOnDrag={!minimal}
          zoomOnScroll={!minimal}
          zoomOnPinch={!minimal}
          zoomOnDoubleClick={!minimal}
          preventScrolling={!minimal}
        >
          {!minimal && <Background gap={20} />}
          {!minimal && <Controls showInteractive={false} position="bottom-left" />}
        </ReactFlow>
      </ReactFlowProvider>
    </SimContext.Provider>
  );
}
