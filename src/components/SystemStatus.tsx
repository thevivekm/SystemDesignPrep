import { useEffect, useState } from 'react';

/** A metric value that gently fluctuates, so the system feels live. */
export function LiveMetric({ value, jitter = 0.06 }: { value: string; jitter?: number }) {
  const m = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(value.trim());
  const base = m ? parseFloat(m[1]) : NaN;
  const unit = m ? m[2] : '';
  const decimals = m && m[1].includes('.') ? m[1].split('.')[1].length : 0;
  const [n, setN] = useState(base);

  useEffect(() => {
    setN(base);
    if (!Number.isFinite(base) || base === 0) return;
    const t = setInterval(() => {
      const next = base * (1 + (Math.random() - 0.5) * 2 * jitter);
      // percentages never go above 100
      setN(unit.trim().startsWith('%') ? Math.min(100, next) : next);
    }, 1100);
    return () => clearInterval(t);
  }, [base, unit, jitter]);

  if (!m) return <>{value}</>;
  return (
    <span className="tabular-nums">
      {n.toFixed(decimals)}
      {unit}
    </span>
  );
}

const NUM = /^(-?\d+(?:\.\d+)?)(.*)$/;

/** Moves a metric from its broken value toward its healthy value as the fix progresses (0..1). */
export function blendMetric(broken: string, healthy: string, p: number): string {
  if (p <= 0) return broken;
  if (p >= 1) return healthy;
  const a = NUM.exec(broken.trim());
  const b = NUM.exec(healthy.trim());
  // Only interpolate numbers with the same unit; otherwise switch when fully fixed.
  if (!a || !b || a[2] !== b[2]) return broken;
  const dec = Math.max(a[1].split('.')[1]?.length ?? 0, b[1].split('.')[1]?.length ?? 0);
  const v = parseFloat(a[1]) + (parseFloat(b[1]) - parseFloat(a[1])) * p;
  return `${v.toFixed(dec)}${a[2]}`;
}

export function SystemStatus({
  healthy,
  progress = healthy ? 1 : 0,
  metrics,
}: {
  healthy: boolean;
  /** 0 = as broken as the starting design, 1 = fully fixed */
  progress?: number;
  metrics: { label: string; broken: string; healthy: string }[];
}) {
  const level = healthy ? 'ok' : progress > 0 ? 'mid' : 'bad';
  const tone = {
    ok: 'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-100',
    mid: 'border-amber-200 bg-amber-50/95 text-amber-900 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100',
    bad: 'border-red-200 bg-red-50/95 text-red-900 dark:border-red-900 dark:bg-red-950/80 dark:text-red-100',
  }[level];
  const dot = { ok: 'bg-emerald-500', mid: 'bg-amber-500', bad: 'bg-red-500' }[level];
  const ping = { ok: 'bg-emerald-400', mid: 'bg-amber-400', bad: 'bg-red-400' }[level];
  const title = { ok: 'SYSTEM HEALTHY', mid: 'SYSTEM RECOVERING', bad: 'SYSTEM DEGRADED' }[level];
  return (
    <div key={level} className={`animate-fade-in-up pointer-events-auto max-w-md rounded-md border px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur ${tone}`}>
      <div className="flex items-center gap-1.5 font-semibold tracking-wide">
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${ping}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
        </span>
        {title}
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {metrics.map((m) => (
          <span key={m.label} className="whitespace-nowrap opacity-90">
            {m.label}: <b><LiveMetric value={healthy ? m.healthy : blendMetric(m.broken, m.healthy, progress)} /></b>
          </span>
        ))}
      </div>
    </div>
  );
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899'];

/** One-shot confetti burst; parent mounts it (with a new key) to replay. */
export function Confetti({ count = 60 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      color: COLORS[i % COLORS.length],
      dx: `${(Math.random() - 0.5) * 240}px`,
      rot: `${(Math.random() - 0.5) * 1080}deg`,
      dur: `${1.6 + Math.random() * 1.4}s`,
      delay: `${Math.random() * 0.35}s`,
    }))
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: p.left, background: p.color, ['--dx' as string]: p.dx, ['--rot' as string]: p.rot, ['--dur' as string]: p.dur, ['--delay' as string]: p.delay }}
        />
      ))}
    </div>
  );
}
