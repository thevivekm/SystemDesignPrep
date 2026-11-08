import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import { memo, useEffect, useRef, useState } from 'react';
import { COMPONENT_BY_KIND } from '../../data/components';
import type { DesignNode } from '../../types';
import { useSim } from './sim';

export function Icon({ path, color, size = 18 }: { path: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path} />
    </svg>
  );
}

const sides = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function ComponentNodeImpl({ id, data, selected }: NodeProps<DesignNode>) {
  const def = COMPONENT_BY_KIND[data.kind] ?? COMPONENT_BY_KIND.service;
  const { updateNodeData } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const readOnly = data.readOnly === true;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== data.label) updateNodeData(id, { label: v });
    else setDraft(data.label);
  };

  const isNote = data.kind === 'note';
  const sim = useSim();
  const hotText = sim.state === 'broken' ? sim.hot[id] : undefined;
  const healthy = sim.state === 'healthy' && !isNote;

  return (
    <div
      onDoubleClick={() => !readOnly && (setDraft(data.label), setEditing(true))}
      className={`group relative h-full w-full rounded-lg border-2 px-2.5 py-2 text-xs shadow-sm transition-colors ${
        isNote
          ? 'border-dashed border-amber-400/70 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100'
          : 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100'
      } ${selected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-transparent' : ''} ${hotText ? 'sim-hot' : ''} ${healthy ? 'sim-healthy' : ''}`}
      style={isNote ? undefined : { borderColor: hotText ? '#ef4444' : def.color }}
    >
      {hotText && (
        <span className="sim-badge pointer-events-none absolute -top-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" /></span>
          {hotText}
        </span>
      )}
      {healthy && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-white bg-emerald-500 dark:border-slate-800" />
        </span>
      )}
      {!readOnly && <NodeResizer isVisible={selected} minWidth={110} minHeight={44} lineClassName="!border-indigo-400" handleClassName="!bg-indigo-500 !border-white" />}
      {sides.map((p) => (
        <Handle key={p} id={p} type="source" position={p} className={`!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400 ${readOnly ? '!opacity-0' : 'opacity-0 group-hover:opacity-100'}`} />
      ))}
      <div className={`flex h-full items-center gap-2 ${isNote ? 'items-start' : ''}`}>
        {!isNote && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: def.color + '1f' }}>
            <Icon path={def.icon} color={def.color} />
          </span>
        )}
        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            autoFocus
            rows={isNote ? 3 : 1}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commit();
              }
              if (e.key === 'Escape') {
                setDraft(data.label);
                setEditing(false);
              }
              e.stopPropagation();
            }}
            className="nodrag w-full resize-none rounded border border-slate-300 bg-white px-1 py-0.5 text-xs text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        ) : (
          <span className={`min-w-0 whitespace-pre-wrap break-words font-medium leading-tight ${isNote ? 'font-normal' : ''}`}>{data.label}</span>
        )}
      </div>
    </div>
  );
}

export const ComponentNode = memo(ComponentNodeImpl);
export const nodeTypes = { component: ComponentNode };
