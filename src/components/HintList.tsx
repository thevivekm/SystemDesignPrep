import type { Problem } from '../types';
import { useProgress } from '../store/useProgress';

export function HintList({ problem }: { problem: Problem }) {
  const n = useProgress((s) => s.attempts[problem.id]?.hintsRevealed ?? 0);
  const patch = useProgress((s) => s.patch);
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">Stuck? Reveal hints one at a time. Try to get as far as you can without them.</p>
      {problem.hints.slice(0, n).map((h, i) => (
        <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <span className="mr-1 font-semibold">Hint {i + 1}.</span>
          {h}
        </div>
      ))}
      {n < problem.hints.length ? (
        <button type="button" onClick={() => patch(problem.id, { hintsRevealed: n + 1 })} className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
          Reveal hint {n + 1} of {problem.hints.length}
        </button>
      ) : (
        <p className="text-center text-xs text-slate-400">All hints revealed.</p>
      )}
    </div>
  );
}
