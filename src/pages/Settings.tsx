import { useRef, useState } from 'react';
import { exportProgress, useProgress } from '../store/useProgress';

export function Settings() {
  const attempts = useProgress((s) => s.attempts);
  const fixes = useProgress((s) => s.fixes);
  const quizzes = useProgress((s) => s.quizzes);
  const importData = useProgress((s) => s.importData);
  const resetAll = useProgress((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const count = Object.keys(attempts).length;
  const total = count + Object.keys(fixes).length + Object.keys(quizzes).length;

  const onFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (total && !confirm('Importing replaces your current progress in this browser. Continue?')) return;
      importData(data);
      setMsg({ ok: true, text: `Imported progress for ${Object.keys(useProgress.getState().attempts).length} problem(s).` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not read that file.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="font-semibold">Your data</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Progress is stored only in this browser (localStorage). You have saved work on <b>{count}</b> problem(s), <b>{Object.keys(fixes).length}</b> fix-the-design challenge(s) and <b>{Object.keys(quizzes).length}</b> quiz(zes). Export a backup to move it to another browser or machine.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={exportProgress} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">Export progress (.json)</button>
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Import progress…</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
          {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>}
        </section>
        <section className="rounded-lg border border-rose-200 p-4 dark:border-rose-900/60">
          <h2 className="font-semibold text-rose-700 dark:text-rose-400">Reset everything</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Deletes all diagrams, notes, rubric ticks, timers, challenge progress and quiz scores in this browser. Export first if you want a backup.</p>
          <button
            type="button"
            onClick={() => confirm('Delete ALL saved progress? This cannot be undone.') && (resetAll(), setMsg({ ok: true, text: 'All progress cleared.' }))}
            className="mt-3 rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            Reset all progress
          </button>
        </section>
        <section className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Adding your own problems</h2>
          Create a file in <code>src/data/problems/</code> following any existing problem, then add it to the list in <code>src/data/problems/index.ts</code>. See the README for the format.
        </section>
      </div>
    </div>
  );
}
