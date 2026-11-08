import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DifficultyBadge, Tag } from '../components/Badges';
import { DesignCanvas } from '../components/canvas/DesignCanvas';
import { ReadOnlyDiagram } from '../components/canvas/ReadOnlyDiagram';
import { Markdown } from '../components/Markdown';
import { Resizer } from '../components/Resizer';
import { Confetti, SystemStatus } from '../components/SystemStatus';
import { FIX_BY_ID, FIX_CHALLENGES } from '../data/fixes';
import { checkDesign, type CheckResult } from '../lib/checkDesign';
import { useProgress } from '../store/useProgress';
import type { DiagramData, FixChallenge } from '../types';

type Tab = 'scenario' | 'hints' | 'solution';

export function FixWorkspace() {
  const { id = '' } = useParams();
  const fix = FIX_BY_ID[id];
  if (!fix)
    return (
      <div className="p-10 text-center">
        <p className="mb-3">Challenge not found.</p>
        <Link to="/fix" className="text-indigo-600 underline">Back to challenges</Link>
      </div>
    );
  return <FixInner key={fix.id} fix={fix} />;
}

function FixInner({ fix }: { fix: FixChallenge }) {
  const progress = useProgress((s) => s.fixes[fix.id]);
  const patchFix = useProgress((s) => s.patchFix);
  const resetFix = useProgress((s) => s.resetFix);
  const [tab, setTab] = useState<Tab>('scenario');
  const [mobileCanvas, setMobileCanvas] = useState(false);
  const [leftW, setLeftW] = useState(400);
  const [canvasKey, setCanvasKey] = useState(0);
  const [initial, setInitial] = useState<DiagramData>(() => useProgress.getState().fixes[fix.id]?.diagram ?? fix.start);
  // Checks run live on every structural change to the diagram — no "check" button needed.
  const [results, setResults] = useState<CheckResult[]>(() => checkDesign(initial, fix.checks));
  const healthy = results.every((r) => r.passed);
  const healthyRef = useRef(healthy);
  const sigRef = useRef(signature(initial));
  const [celebrate, setCelebrate] = useState(0);
  const [failFx, setFailFx] = useState(0);
  const sim = useMemo(() => ({ state: healthy ? ('healthy' as const) : ('broken' as const), hot: fix.hotspots }), [healthy, fix.hotspots]);
  const onChange = useCallback((d: DiagramData) => patchFix(fix.id, { diagram: d }), [fix.id, patchFix]);

  // How far from the starting design toward a full fix (drives the metrics)
  const startPassed = useMemo(() => checkDesign(fix.start, fix.checks).filter((r) => r.passed).length, [fix]);
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const fixProgress = total > startPassed ? Math.max(0, Math.min(1, (passed - startPassed) / (total - startPassed))) : 0;

  const onLiveChange = useCallback(
    (d: DiagramData) => {
      const sig = signature(d);
      if (sig === sigRef.current) return; // only positions/selection changed
      sigRef.current = sig;
      const r = checkDesign(d, fix.checks);
      const ok = r.every((x) => x.passed);
      if (ok && !healthyRef.current) {
        setCelebrate((c) => c + 1);
        patchFix(fix.id, { solved: true });
      } else if (!ok && healthyRef.current) {
        setFailFx((c) => c + 1); // something that was working just broke again
      }
      healthyRef.current = ok;
      setResults(r);
    },
    [fix.checks, fix.id, patchFix]
  );

  const idx = FIX_CHALLENGES.findIndex((f) => f.id === fix.id);
  const prev = FIX_CHALLENGES[idx - 1];
  const next = FIX_CHALLENGES[idx + 1];
  const hints = progress?.hintsRevealed ?? 0;
  const solved = progress?.solved ?? false;
  const showSolution = solved || (progress?.solutionRevealed ?? false);

  const restart = () => {
    if (!confirm('Restore the original (flawed) design? Your edits to the diagram will be lost.')) return;
    resetFix(fix.id);
    setInitial(fix.start);
    setResults(checkDesign(fix.start, fix.checks));
    healthyRef.current = false;
    sigRef.current = signature(fix.start);
    setCelebrate(0);
    setFailFx(0);
    setCanvasKey((k) => k + 1);
  };

  const allPassed = healthy;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <Link to="/fix" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" title="All challenges">←</Link>
        <h1 className="min-w-0 truncate text-sm font-semibold">Fix: {fix.title}</h1>
        <DifficultyBadge d={fix.difficulty} />
        {solved && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">✓ Fixed</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span
            title="Checks run automatically as you edit the diagram"
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors ${
              healthy ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${healthy ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
            </span>
            Live · {passed}/{total} checks
          </span>
          <button type="button" onClick={restart} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800">Restart</button>
          <div className="flex">
            {prev ? <Link to={`/fix/${prev.id}`} className="rounded-l-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">‹ Prev</Link> : <span className="rounded-l-md border border-slate-200 px-2 py-1 text-xs text-slate-300 dark:border-slate-800 dark:text-slate-700">‹ Prev</span>}
            {next ? <Link to={`/fix/${next.id}`} className="-ml-px rounded-r-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Next ›</Link> : <span className="-ml-px rounded-r-md border border-slate-200 px-2 py-1 text-xs text-slate-300 dark:border-slate-800 dark:text-slate-700">Next ›</span>}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 border-b border-slate-200 md:hidden dark:border-slate-800">
        {[false, true].map((c) => (
          <button key={String(c)} type="button" onClick={() => setMobileCanvas(c)} className={`flex-1 py-2 text-xs font-medium ${mobileCanvas === c ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
            {c ? 'Canvas' : 'Scenario'}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={`${mobileCanvas ? 'hidden' : 'flex'} w-full min-w-0 flex-col md:flex md:w-[var(--lw)] md:shrink-0`} style={{ '--lw': `${leftW}px` } as React.CSSProperties}>
          <div className="flex shrink-0 gap-0.5 border-b border-slate-200 px-2 dark:border-slate-800">
            {(['scenario', 'hints', 'solution'] as Tab[]).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`relative px-2.5 py-2 text-xs font-medium capitalize ${tab === t ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                {t}
                {tab === t && <span className="absolute inset-x-1 bottom-0 h-0.5 rounded bg-indigo-500" />}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {tab === 'scenario' && (
              <>
                <div className={`rounded-lg border p-3 transition-colors duration-500 ${allPassed ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{allPassed ? '🎉 Fixed! The system is healthy.' : 'Live system checks'}</p>
                    <span className="text-xs tabular-nums text-slate-500">{passed}/{total}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={`h-full rounded-full transition-all duration-500 ${allPassed ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${(passed / total) * 100}%` }} />
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {results.map((r) => (
                      <li key={r.label} className="flex gap-2">
                        <span key={String(r.passed)} className={`animate-pop inline-block w-3 ${r.passed ? 'text-emerald-600' : 'text-rose-500'}`}>{r.passed ? '✓' : '✗'}</span>
                        <span className={`transition-colors ${r.passed ? 'text-slate-500 dark:text-slate-400' : ''}`}>{r.label}</span>
                      </li>
                    ))}
                  </ul>
                  {allPassed ? (
                    <button type="button" onClick={() => setTab('solution')} className="mt-2 text-xs font-medium text-emerald-700 underline dark:text-emerald-300">Read the explanation and compare with the reference fix →</button>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">These update instantly as you edit the diagram.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1"><Tag>{fix.topic}</Tag></div>
                <Markdown>{fix.scenario}</Markdown>
                <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                  <b>Your goal:</b> {fix.goal}
                </div>
                <div className="rounded-lg border border-slate-200 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
                  <b>How to edit:</b> drag components in from the palette (or click to add). Hover a node and drag from its edge dot to connect. Click a connection or node and press Delete to remove it. Labels don't matter — component <i>types</i> and <i>connections</i> do. The system re-checks itself live as you edit.
                </div>
              </>
            )}
            {tab === 'hints' && (
              <div className="space-y-2">
                {fix.hints.slice(0, hints).map((h, i) => (
                  <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <span className="mr-1 font-semibold">Hint {i + 1}.</span>{h}
                  </div>
                ))}
                {hints < fix.hints.length ? (
                  <button type="button" onClick={() => patchFix(fix.id, { hintsRevealed: hints + 1 })} className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
                    Reveal hint {hints + 1} of {fix.hints.length}
                  </button>
                ) : (
                  <p className="text-center text-xs text-slate-400">All hints revealed.</p>
                )}
              </div>
            )}
            {tab === 'solution' &&
              (showSolution ? (
                <>
                  <div className="h-60 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                    <ReadOnlyDiagram diagram={fix.solution} sim={{ state: 'healthy' }} />
                  </div>
                  <Markdown>{fix.explanation}</Markdown>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 p-6 text-center dark:border-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-300">The reference fix unlocks when all checks pass. You can also give up and reveal it.</p>
                  <button type="button" onClick={() => confirm('Reveal the reference fix?') && patchFix(fix.id, { solutionRevealed: true })} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    Reveal reference fix
                  </button>
                </div>
              ))}
          </div>
        </div>
        <div className="hidden md:block">
          <Resizer axis="x" onDelta={(d) => setLeftW((w) => Math.min(720, Math.max(280, w + d)))} />
        </div>
        <div className={`${mobileCanvas ? 'block' : 'hidden'} relative min-w-0 flex-1 md:block`}>
          <DesignCanvas
            key={canvasKey}
            initial={initial}
            onChange={onChange}
            onLiveChange={onLiveChange}
            sim={sim}
            overlay={<SystemStatus healthy={healthy} progress={fixProgress} metrics={fix.metrics} />}
          />
          {failFx > 0 && <div key={`fail-${failFx}`} className="animate-flash-red pointer-events-none absolute inset-0 z-10" />}
          {celebrate > 0 && <Confetti key={`confetti-${celebrate}`} />}
        </div>
      </div>
    </div>
  );
}

/** Structural fingerprint of a diagram: which components exist and how they connect (ignores positions). */
function signature(d: DiagramData) {
  const n = d.nodes.map((x) => `${x.id}:${x.data.kind}`).sort().join(',');
  const e = d.edges.map((x) => [x.source, x.target].sort().join('-')).sort().join(',');
  return `${n}|${e}`;
}
