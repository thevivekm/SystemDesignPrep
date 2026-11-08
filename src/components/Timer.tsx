import { useEffect, useRef, useState } from 'react';
import { useProgress } from '../store/useProgress';

const PRESETS = [30, 45, 60];

export function Timer({ problemId }: { problemId: string }) {
  const [limit, setLimit] = useState(45 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const addTime = useProgress((s) => s.addTime);
  const unsaved = useRef(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      unsaved.current += 1;
      if (unsaved.current >= 5) {
        addTime(problemId, unsaved.current);
        unsaved.current = 0;
      }
    }, 1000);
    return () => {
      clearInterval(t);
      if (unsaved.current) addTime(problemId, unsaved.current);
      unsaved.current = 0;
    };
  }, [running, problemId, addTime]);

  const remaining = limit - elapsed;
  const over = remaining < 0;
  const abs = Math.abs(remaining);
  const mm = String(Math.floor(abs / 60)).padStart(2, '0');
  const ss = String(abs % 60).padStart(2, '0');

  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 dark:border-slate-700 dark:bg-slate-900">
      <span className={`w-14 text-center font-mono text-sm tabular-nums ${over ? 'text-rose-600' : remaining < 300 ? 'text-amber-600' : ''}`} title="Interview timer">
        {over ? '+' : ''}
        {mm}:{ss}
      </span>
      <button type="button" onClick={() => setRunning((r) => !r)} className="rounded px-1.5 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-slate-800">
        {running ? 'Pause' : elapsed ? 'Resume' : 'Start'}
      </button>
      <button type="button" onClick={() => (setRunning(false), setElapsed(0))} className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Reset timer">
        Reset
      </button>
      <select
        value={limit / 60}
        onChange={(e) => setLimit(Number(e.target.value) * 60)}
        className="hidden rounded bg-transparent text-xs text-slate-500 outline-none sm:block"
        aria-label="Timer length"
      >
        {PRESETS.map((p) => (
          <option key={p} value={p}>{p}m</option>
        ))}
      </select>
    </div>
  );
}
