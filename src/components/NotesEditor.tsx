import { useEffect, useRef, useState } from 'react';
import { NOTE_SECTIONS, type NoteKey } from '../types';
import { useProgress } from '../store/useProgress';

const NO_NOTES = {} as Partial<Record<NoteKey, string>>;

export function NotesEditor({ problemId }: { problemId: string }) {
  const [tab, setTab] = useState<NoteKey>('requirements');
  const stored = useProgress((s) => s.attempts[problemId]?.notes ?? NO_NOTES);
  const setNote = useProgress((s) => s.setNote);
  const [draft, setDraft] = useState(stored[tab] ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef<{ key: NoteKey; value: string } | null>(null);

  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current) {
      setNote(problemId, pending.current.key, pending.current.value);
      pending.current = null;
    }
  };

  // Load draft when tab/problem changes
  useEffect(() => {
    setDraft(useProgress.getState().attempts[problemId]?.notes?.[tab] ?? '');
  }, [tab, problemId]);

  useEffect(() => flush, []); // flush pending edits on unmount

  const onChange = (v: string) => {
    setDraft(v);
    pending.current = { key: tab, value: v };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 300);
  };

  const section = NOTE_SECTIONS.find((s) => s.key === tab)!;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-slate-200 px-2 dark:border-slate-800">
        {NOTE_SECTIONS.map((s) => {
          const filled = (s.key === tab ? draft : stored[s.key] ?? '').trim().length > 0;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                flush();
                setTab(s.key);
              }}
              className={`relative whitespace-nowrap px-2.5 py-2 text-xs font-medium ${
                tab === s.key ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {s.label}
              {filled && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />}
              {tab === s.key && <span className="absolute inset-x-1 bottom-0 h-0.5 rounded bg-indigo-500" />}
            </button>
          );
        })}
      </div>
      <textarea
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        onBlur={flush}
        placeholder={section.placeholder}
        spellCheck
        className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[13px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-600"
      />
    </div>
  );
}
