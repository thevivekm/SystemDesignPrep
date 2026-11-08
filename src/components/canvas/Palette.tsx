import { COMPONENTS, COMPONENT_GROUPS } from '../../data/components';
import type { ComponentType } from '../../types';
import { Icon } from './ComponentNode';

export const DND_MIME = 'application/x-designprep-component';

export function Palette({ onAdd }: { onAdd: (kind: ComponentType) => void }) {
  return (
    <aside className="flex w-40 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="mb-2 px-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">Drag onto the canvas, or click to add.</p>
      {COMPONENT_GROUPS.map((g) => (
        <div key={g} className="mb-2">
          <h4 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{g}</h4>
          {COMPONENTS.filter((c) => c.group === g).map((c) => (
            <button
              key={c.kind}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DND_MIME, c.kind);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => onAdd(c.kind)}
              className="mb-0.5 flex w-full cursor-grab items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs text-slate-700 hover:bg-white hover:shadow-sm active:cursor-grabbing dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Icon path={c.icon} color={c.color} size={16} />
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}
