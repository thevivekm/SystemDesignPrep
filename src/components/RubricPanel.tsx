import type { Problem } from '../types';
import { useProgress } from '../store/useProgress';

export function rubricScore(p: Problem, checked: string[]) {
  let total = 0;
  let got = 0;
  for (const s of p.rubric)
    for (const i of s.items) {
      const w = i.weight ?? 1;
      total += w;
      if (checked.includes(i.id)) got += w;
    }
  return { got, total, pct: total ? Math.round((got / total) * 100) : 0 };
}

const NONE: string[] = [];

export function RubricPanel({ problem }: { problem: Problem }) {
  const checked = useProgress((s) => s.attempts[problem.id]?.rubricChecked ?? NONE);
  const toggle = useProgress((s) => s.toggleRubric);
  const { got, total, pct } = rubricScore(problem, checked);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Self-assessment</span>
          <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
            {got}/{total} pts · <b>{pct}%</b>
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Tick each point your design and notes cover. Be strict: count it only if you'd have said it out loud in an interview. Items marked ★ weigh double.
        </p>
      </div>
      {problem.rubric.map((sec) => (
        <section key={sec.section}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{sec.section}</h3>
          <ul className="space-y-1">
            {sec.items.map((it) => (
              <li key={it.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <input type="checkbox" checked={checked.includes(it.id)} onChange={() => toggle(problem.id, it.id)} className="mt-0.5 accent-indigo-600" />
                  <span className={checked.includes(it.id) ? 'text-slate-500 line-through decoration-slate-300 dark:text-slate-400' : ''}>
                    {it.text}
                    {(it.weight ?? 1) > 1 && <span className="ml-1 text-amber-500">★</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
