import { Link } from 'react-router-dom';
import { DifficultyBadge, Tag } from '../components/Badges';
import { FIX_CHALLENGES } from '../data/fixes';
import { useProgress } from '../store/useProgress';

export function FixList() {
  const fixes = useProgress((s) => s.fixes);
  const solved = FIX_CHALLENGES.filter((f) => fixes[f.id]?.solved).length;
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fix the Design</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Each challenge gives you a working system with a real flaw and its symptoms. Edit the diagram (drag in new components, rewire or delete connections) and watch it recover live: the moment your design fixes the flaw, the system turns healthy.
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-slate-200 px-4 py-2.5 text-center dark:border-slate-800">
            <div className="text-lg font-bold tabular-nums">{solved}<span className="text-sm font-normal text-slate-400">/{FIX_CHALLENGES.length}</span></div>
            <div className="text-[11px] text-slate-500">Fixed</div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FIX_CHALLENGES.map((f, i) => {
            const done = fixes[f.id]?.solved;
            return (
              <Link
                key={f.id}
                to={`/fix/${f.id}`}
                className="group flex flex-col rounded-lg border border-slate-200 p-4 transition hover:border-indigo-400 hover:shadow-sm dark:border-slate-800 dark:hover:border-indigo-500"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <DifficultyBadge d={f.difficulty} />
                  {done ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">✓ Fixed</span>
                  ) : fixes[f.id]?.diagram ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Attempted</span>
                  ) : null}
                </div>
                <h2 className="font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{i + 1}. {f.title}</h2>
                <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">{f.summary}</p>
                <div className="mt-3"><Tag>{f.topic}</Tag></div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
