import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DifficultyBadge, StatusDot, Tag } from '../components/Badges';
import { ReadOnlyDiagram } from '../components/canvas/ReadOnlyDiagram';
import { rubricScore } from '../components/RubricPanel';
import { diagram } from '../data/diagram';
import { PROBLEMS } from '../data/problems';
import { useProgress } from '../store/useProgress';
import type { Difficulty, Status } from '../types';

const HERO = diagram(
  [
    ['u', 'client', 'Users', 0, 60, 120],
    ['lb', 'lb', 'Load Balancer', 170, 60, 140],
    ['a', 'service', 'Service', 360, 0, 120],
    ['b', 'service', 'Service', 360, 120, 120],
    ['c', 'cache', 'Cache', 540, 0, 130],
    ['d', 'sql', 'Database', 540, 120, 130],
  ],
  [['u', 'lb'], ['lb', 'a'], ['lb', 'b'], ['a', 'c'], ['a', 'd'], ['b', 'c'], ['b', 'd']]
);
const HERO_SIM = { state: 'healthy' as const };

const fmtTime = (s: number) => (s < 60 ? (s ? `${s}s` : '—') : s < 3600 ? `${Math.round(s / 60)}m` : `${(s / 3600).toFixed(1)}h`);

export function ProblemList() {
  const attempts = useProgress((s) => s.attempts);
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState<Difficulty | 'All'>('All');
  const [status, setStatus] = useState<Status | 'All'>('All');
  const [tag, setTag] = useState('All');

  const allTags = useMemo(() => [...new Set(PROBLEMS.flatMap((p) => p.tags))].sort(), []);

  const rows = PROBLEMS.map((p, i) => ({ p, n: i + 1, a: attempts[p.id] })).filter(({ p, a }) => {
    const st = a?.status ?? 'todo';
    if (diff !== 'All' && p.difficulty !== diff) return false;
    if (status !== 'All' && st !== status) return false;
    if (tag !== 'All' && !p.tags.includes(tag)) return false;
    if (q && !`${p.title} ${p.summary} ${p.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const counts = (d: Difficulty) => {
    const ps = PROBLEMS.filter((p) => p.difficulty === d);
    return { done: ps.filter((p) => attempts[p.id]?.status === 'done').length, total: ps.length };
  };
  const doneTotal = PROBLEMS.filter((p) => attempts[p.id]?.status === 'done').length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="animate-fade-in-up relative mb-6 h-36 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white dark:border-slate-800 dark:from-indigo-950/40 dark:to-slate-950">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-full max-w-[16rem] flex-col justify-center bg-gradient-to-r from-indigo-50 via-indigo-50/90 to-transparent p-4 sm:max-w-xs dark:from-indigo-950 dark:via-indigo-950/80">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
              Live
            </span>
            <p className="mt-1 text-sm font-semibold">Design it. Break it. Fix it.</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Every diagram runs simulated traffic.</p>
          </div>
          <div className="absolute inset-y-0 right-0 w-full sm:w-3/4">
            <ReadOnlyDiagram diagram={HERO} sim={HERO_SIM} minimal />
          </div>
        </div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Design Problems</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sketch the architecture, write your reasoning, grade yourself against the rubric, then compare with a reference. Everything is saved in this browser.</p>
          </div>
          <div className="flex shrink-0 gap-4 rounded-lg border border-slate-200 px-4 py-2.5 text-center dark:border-slate-800">
            <div>
              <div className="text-lg font-bold tabular-nums">{doneTotal}<span className="text-sm font-normal text-slate-400">/{PROBLEMS.length}</span></div>
              <div className="text-[11px] text-slate-500">Solved</div>
            </div>
            {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((d) => {
              const c = counts(d);
              return (
                <div key={d}>
                  <div className="text-lg font-bold tabular-nums">{c.done}<span className="text-sm font-normal text-slate-400">/{c.total}</span></div>
                  <DifficultyBadge d={d} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search problems…" className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 sm:max-w-xs dark:border-slate-700 dark:bg-slate-900" />
          <Select value={diff} onChange={(v) => setDiff(v as Difficulty | 'All')} options={['All', 'Easy', 'Medium', 'Hard']} label="Difficulty" />
          <Select value={status} onChange={(v) => setStatus(v as Status | 'All')} options={['All', 'todo', 'in-progress', 'done']} labels={{ todo: 'To do', 'in-progress': 'In progress', done: 'Done' }} label="Status" />
          <Select value={tag} onChange={setTag} options={['All', ...allTags]} label="Topic" />
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="w-28 px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Topics</th>
                <th className="w-20 px-3 py-2 font-medium">Difficulty</th>
                <th className="hidden w-16 px-3 py-2 text-right font-medium sm:table-cell">Score</th>
                <th className="hidden w-16 px-3 py-2 text-right font-medium sm:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, n, a }) => {
                const sc = a ? rubricScore(p, a.rubricChecked).pct : 0;
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/60">
                    <td className="px-3 py-2.5"><StatusDot s={a?.status ?? 'todo'} /></td>
                    <td className="px-3 py-2.5">
                      <Link to={`/problems/${p.id}`} className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400">{n}. {p.title}</Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{p.summary}</div>
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      <div className="flex flex-wrap gap-1">{p.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}</div>
                    </td>
                    <td className="px-3 py-2.5"><DifficultyBadge d={p.difficulty} /></td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-slate-600 sm:table-cell dark:text-slate-300">{a?.rubricChecked.length ? `${sc}%` : '—'}</td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-slate-600 sm:table-cell dark:text-slate-300">{fmtTime(a?.timeSpentSec ?? 0)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">No problems match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options, labels, label }: { value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string>; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900">
      {options.map((o) => (
        <option key={o} value={o}>{o === 'All' ? `${label}: All` : labels?.[o] ?? o}</option>
      ))}
    </select>
  );
}
