import { useState } from 'react';
import type { Problem } from '../types';
import { useProgress } from '../store/useProgress';
import { Markdown } from './Markdown';
import { ReadOnlyDiagram } from './canvas/ReadOnlyDiagram';

export function ReferencePanel({ problem }: { problem: Problem }) {
  const revealed = useProgress((s) => s.attempts[problem.id]?.referenceRevealed ?? false);
  const patch = useProgress((s) => s.patch);
  const [showDiagram, setShowDiagram] = useState(false);

  if (!revealed)
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 p-6 text-center dark:border-slate-800">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="text-slate-400"><path d="M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4" /></svg>
        <p className="text-sm text-slate-600 dark:text-slate-300">The reference solution is hidden so you can attempt the problem first.</p>
        <button
          type="button"
          onClick={() => confirm('Reveal the reference solution? Try to finish your own design first.') && patch(problem.id, { referenceRevealed: true })}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Reveal reference solution
        </button>
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="h-56 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <ReadOnlyDiagram diagram={problem.reference.diagram} />
      </div>
      <button type="button" onClick={() => setShowDiagram(true)} className="w-full rounded-md border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
        Open reference diagram full screen
      </button>
      <Markdown>{problem.reference.markdown}</Markdown>
      {showDiagram && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
            <span className="text-sm font-semibold">Reference diagram — {problem.title}</span>
            <button type="button" onClick={() => setShowDiagram(false)} className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Close ✕</button>
          </div>
          <div className="min-h-0 flex-1">
            <ReadOnlyDiagram diagram={problem.reference.diagram} />
          </div>
        </div>
      )}
    </div>
  );
}
