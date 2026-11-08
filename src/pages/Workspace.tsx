import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DifficultyBadge, Tag } from '../components/Badges';
import { DesignCanvas } from '../components/canvas/DesignCanvas';
import { HintList } from '../components/HintList';
import { Markdown } from '../components/Markdown';
import { NotesEditor } from '../components/NotesEditor';
import { ReferencePanel } from '../components/ReferencePanel';
import { Resizer } from '../components/Resizer';
import { RubricPanel, rubricScore } from '../components/RubricPanel';
import { Timer } from '../components/Timer';
import { PROBLEMS, PROBLEM_BY_ID } from '../data/problems';
import { emptyAttempt, statusLabel, useProgress } from '../store/useProgress';
import type { DiagramData, Problem, Status } from '../types';

type LeftTab = 'problem' | 'hints' | 'rubric' | 'reference';
type MobilePane = 'left' | 'canvas' | 'notes';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function Workspace() {
  const { id = '' } = useParams();
  const problem = PROBLEM_BY_ID[id];
  if (!problem)
    return (
      <div className="p-10 text-center">
        <p className="mb-3">Problem not found.</p>
        <Link to="/" className="text-indigo-600 underline">Back to problems</Link>
      </div>
    );
  return <WorkspaceInner key={problem.id} problem={problem} />;
}

function WorkspaceInner({ problem }: { problem: Problem }) {
  const [tab, setTab] = useState<LeftTab>('problem');
  const [mobile, setMobile] = useState<MobilePane>('left');
  const [leftW, setLeftW] = useState(400);
  const [notesH, setNotesH] = useState(240);
  const status = useProgress((s) => s.attempts[problem.id]?.status ?? 'todo');
  const checked = useProgress((s) => s.attempts[problem.id]?.rubricChecked);
  const patch = useProgress((s) => s.patch);
  const resetProblem = useProgress((s) => s.resetProblem);
  const setDiagram = useProgress((s) => s.setDiagram);
  const [initialDiagram, setInitialDiagram] = useState<DiagramData>(() => (useProgress.getState().attempts[problem.id] ?? emptyAttempt()).diagram);
  const [canvasKey, setCanvasKey] = useState(0);
  const onDiagram = useCallback((d: DiagramData) => setDiagram(problem.id, d), [problem.id, setDiagram]);
  const score = rubricScore(problem, checked ?? []);

  const idx = PROBLEMS.findIndex((p) => p.id === problem.id);
  const prev = PROBLEMS[idx - 1];
  const next = PROBLEMS[idx + 1];

  const reset = () => {
    if (!confirm(`Reset your attempt at "${problem.title}"? Your diagram, notes, and rubric ticks will be deleted.`)) return;
    resetProblem(problem.id);
    setInitialDiagram(emptyAttempt().diagram);
    setCanvasKey((k) => k + 1);
  };

  const tabs: { key: LeftTab; label: string }[] = [
    { key: 'problem', label: 'Problem' },
    { key: 'hints', label: 'Hints' },
    { key: 'rubric', label: `Rubric ${score.pct ? `· ${score.pct}%` : ''}` },
    { key: 'reference', label: 'Reference' },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" title="All problems">←</Link>
        <h1 className="min-w-0 truncate text-sm font-semibold">{idx + 1}. {problem.title}</h1>
        <DifficultyBadge d={problem.difficulty} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Timer problemId={problem.id} />
          <select
            value={status}
            onChange={(e) => patch(problem.id, { status: e.target.value as Status })}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
            aria-label="Status"
          >
            {(Object.keys(statusLabel) as Status[]).map((s) => (
              <option key={s} value={s}>{statusLabel[s]}</option>
            ))}
          </select>
          <button type="button" onClick={reset} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800">Reset</button>
          <div className="flex">
            {prev ? <Link to={`/problems/${prev.id}`} className="rounded-l-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" title={prev.title}>‹ Prev</Link> : <span className="rounded-l-md border border-slate-200 px-2 py-1 text-xs text-slate-300 dark:border-slate-800 dark:text-slate-700">‹ Prev</span>}
            {next ? <Link to={`/problems/${next.id}`} className="-ml-px rounded-r-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" title={next.title}>Next ›</Link> : <span className="-ml-px rounded-r-md border border-slate-200 px-2 py-1 text-xs text-slate-300 dark:border-slate-800 dark:text-slate-700">Next ›</span>}
          </div>
        </div>
      </div>

      {/* Mobile pane switcher */}
      <div className="flex shrink-0 border-b border-slate-200 md:hidden dark:border-slate-800">
        {(['left', 'canvas', 'notes'] as MobilePane[]).map((m) => (
          <button key={m} type="button" onClick={() => setMobile(m)} className={`flex-1 py-2 text-xs font-medium ${mobile === m ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
            {m === 'left' ? 'Problem' : m === 'canvas' ? 'Canvas' : 'Notes'}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left pane */}
        <div className={`${mobile === 'left' ? 'flex' : 'hidden'} w-full min-w-0 flex-col md:flex md:w-[var(--lw)] md:shrink-0`} style={{ '--lw': `${leftW}px` } as React.CSSProperties}>
          <div className="flex shrink-0 gap-0.5 border-b border-slate-200 px-2 dark:border-slate-800">
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`relative whitespace-nowrap px-2.5 py-2 text-xs font-medium ${tab === t.key ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                {t.label}
                {tab === t.key && <span className="absolute inset-x-1 bottom-0 h-0.5 rounded bg-indigo-500" />}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === 'problem' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1">{problem.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
                <Markdown>{problem.statement}</Markdown>
                <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-800" open>
                  <summary className="cursor-pointer text-sm font-semibold">Questions to ask the interviewer</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                    {problem.clarifyingQuestions.map((q) => <li key={q}>{q}</li>)}
                  </ul>
                </details>
                <div className="rounded-lg bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                  <b>Suggested flow (45 min):</b> requirements (5) → estimates (5) → API & data model (10) → high-level diagram (10) → deep dives (10) → trade-offs (5). Then grade yourself in the Rubric tab and compare with the Reference.
                </div>
              </div>
            )}
            {tab === 'hints' && <HintList problem={problem} />}
            {tab === 'rubric' && <RubricPanel problem={problem} />}
            {tab === 'reference' && <ReferencePanel problem={problem} />}
          </div>
        </div>
        <div className="hidden md:block">
          <Resizer axis="x" onDelta={(d) => setLeftW((w) => clamp(w + d, 280, 720))} />
        </div>

        {/* Right: canvas + notes */}
        <div className={`${mobile === 'left' ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col md:flex`}>
          <div className={`${mobile === 'notes' ? 'hidden' : 'block'} min-h-0 flex-1 md:block`}>
            <DesignCanvas key={canvasKey} initial={initialDiagram} onChange={onDiagram} />
          </div>
          <div className="hidden md:block">
            <Resizer axis="y" onDelta={(d) => setNotesH((h) => clamp(h - d, 120, 600))} />
          </div>
          <div className={`${mobile === 'notes' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col md:flex md:h-[var(--nh)] md:flex-none`} style={{ '--nh': `${notesH}px` } as React.CSSProperties}>
            <NotesEditor key={canvasKey} problemId={problem.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
