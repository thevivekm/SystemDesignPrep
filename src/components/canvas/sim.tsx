import { BaseEdge, getSmoothStepPath, MarkerType, type EdgeProps } from '@xyflow/react';
import { createContext, memo, useContext } from 'react';

/**
 * Traffic simulation shared by every canvas.
 * - idle:    normal traffic (indigo packets)
 * - broken:  edges touching a hotspot carry red packets that slow down and get dropped
 * - healthy: everything flows fast and green
 */
export type SimState = 'idle' | 'broken' | 'healthy';

export interface SimInput {
  state: SimState;
  /** node id -> short status text shown on the node while broken (e.g. "CPU 100%") */
  hot?: Record<string, string>;
}

export interface Sim {
  running: boolean;
  state: SimState;
  hot: Record<string, string>;
}

const NO_HOT: Record<string, string> = {};
export const SimContext = createContext<Sim>({ running: false, state: 'idle', hot: NO_HOT });
export const useSim = () => useContext(SimContext);

export const prefersReducedMotion = () => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const COLORS = { idle: '#6366f1', healthy: '#10b981', broken: '#ef4444' } as const;

function FlowEdgeImpl({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  interactionWidth,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8 });
  const sim = useSim();
  const hot = sim.state === 'broken' && (source in sim.hot || target in sim.hot);
  const tone = sim.state === 'healthy' ? 'healthy' : hot ? 'broken' : 'idle';
  const color = COLORS[tone];
  const dur = tone === 'healthy' ? 1.5 : tone === 'broken' ? 3.4 : 2.4;
  const count = tone === 'broken' ? 4 : 3;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth}
        style={{
          ...style,
          ...(tone !== 'idle' ? { stroke: color, strokeOpacity: 0.75 } : {}),
          ...(hot ? { strokeDasharray: '6 4' } : {}),
          transition: 'stroke 400ms',
        }}
        label={label}
        labelX={labelX}
        labelY={labelY}
        labelStyle={labelStyle}
        labelShowBg={labelShowBg}
        labelBgStyle={labelBgStyle}
        labelBgPadding={labelBgPadding}
        labelBgBorderRadius={labelBgBorderRadius}
      />
      {sim.running &&
        Array.from({ length: count }, (_, i) => {
          const begin = `${(-i * dur) / count}s`;
          return (
            <circle key={`${tone}-${i}`} r={tone === 'broken' ? 3.6 : 3} fill={color} className="sim-packet" style={{ color }}>
              <animateMotion dur={`${dur}s`} begin={begin} repeatCount="indefinite" path={path} />
              {tone === 'broken' && (
                // requests time out / get dropped before reaching the overloaded component
                <animate attributeName="opacity" values="1;1;0.15;0" keyTimes="0;0.5;0.72;1" dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
              )}
            </circle>
          );
        })}
    </>
  );
}

export const FlowEdge = memo(FlowEdgeImpl);
export const edgeTypes = { flow: FlowEdge };

export const defaultEdgeOptions = {
  type: 'flow',
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
  style: { strokeWidth: 1.6 },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 4,
};
