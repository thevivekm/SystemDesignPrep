import type { Difficulty, Status } from '../types';
import { statusLabel } from '../store/useProgress';

const diffColor: Record<Difficulty, string> = {
  Easy: 'text-emerald-600 dark:text-emerald-400',
  Medium: 'text-amber-600 dark:text-amber-400',
  Hard: 'text-rose-600 dark:text-rose-400',
};

export function DifficultyBadge({ d }: { d: Difficulty }) {
  return <span className={`text-xs font-semibold ${diffColor[d]}`}>{d}</span>;
}

export function StatusDot({ s }: { s: Status }) {
  const c = s === 'done' ? 'bg-emerald-500' : s === 'in-progress' ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
      <span className={`h-2 w-2 rounded-full ${c}`} />
      {statusLabel[s]}
    </span>
  );
}

export function Tag({ children }: { children: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{children}</span>;
}
