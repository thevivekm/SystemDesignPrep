import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Attempt, DiagramData, FixAttempt, NoteKey, QuizProgress, Status } from '../types';

export const emptyAttempt = (): Attempt => ({
  diagram: { nodes: [], edges: [] },
  notes: {},
  rubricChecked: [],
  hintsRevealed: 0,
  referenceRevealed: false,
  status: 'todo',
  timeSpentSec: 0,
  updatedAt: 0,
});

export const emptyFix = (): FixAttempt => ({
  diagram: null,
  solved: false,
  checkRuns: 0,
  hintsRevealed: 0,
  solutionRevealed: false,
  updatedAt: 0,
});

export const emptyQuiz = (): QuizProgress => ({ answers: {}, bestScore: 0, runs: 0 });

interface ProgressState {
  attempts: Record<string, Attempt>;
  fixes: Record<string, FixAttempt>;
  quizzes: Record<string, QuizProgress>;
  // problems
  patch: (id: string, p: Partial<Attempt>) => void;
  setDiagram: (id: string, d: DiagramData) => void;
  setNote: (id: string, key: NoteKey, value: string) => void;
  toggleRubric: (id: string, itemId: string) => void;
  addTime: (id: string, sec: number) => void;
  resetProblem: (id: string) => void;
  // fix challenges
  patchFix: (id: string, p: Partial<FixAttempt>) => void;
  resetFix: (id: string) => void;
  // quizzes
  answerQuiz: (topic: string, qid: string, choice: number) => void;
  finishQuiz: (topic: string, score: number) => void;
  restartQuiz: (topic: string) => void;
  // data
  resetAll: () => void;
  importData: (data: unknown) => void;
}

const touch = (a: Attempt, p: Partial<Attempt>): Attempt => {
  const next = { ...a, ...p, updatedAt: Date.now() };
  if (next.status === 'todo' && p.status === undefined) next.status = 'in-progress';
  return next;
};

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      attempts: {},
      fixes: {},
      quizzes: {},
      patch: (id, p) =>
        set((s) => ({ attempts: { ...s.attempts, [id]: { ...(s.attempts[id] ?? emptyAttempt()), ...p, updatedAt: Date.now() } } })),
      setDiagram: (id, diagram) =>
        set((s) => ({ attempts: { ...s.attempts, [id]: touch(s.attempts[id] ?? emptyAttempt(), { diagram }) } })),
      setNote: (id, key, value) =>
        set((s) => {
          const a = s.attempts[id] ?? emptyAttempt();
          return { attempts: { ...s.attempts, [id]: touch(a, { notes: { ...a.notes, [key]: value } }) } };
        }),
      toggleRubric: (id, itemId) =>
        set((s) => {
          const a = s.attempts[id] ?? emptyAttempt();
          const has = a.rubricChecked.includes(itemId);
          const rubricChecked = has ? a.rubricChecked.filter((x) => x !== itemId) : [...a.rubricChecked, itemId];
          return { attempts: { ...s.attempts, [id]: touch(a, { rubricChecked }) } };
        }),
      addTime: (id, sec) =>
        set((s) => {
          const a = s.attempts[id] ?? emptyAttempt();
          return { attempts: { ...s.attempts, [id]: { ...a, timeSpentSec: a.timeSpentSec + sec } } };
        }),
      resetProblem: (id) =>
        set((s) => {
          const attempts = { ...s.attempts };
          delete attempts[id];
          return { attempts };
        }),
      patchFix: (id, p) =>
        set((s) => ({ fixes: { ...s.fixes, [id]: { ...(s.fixes[id] ?? emptyFix()), ...p, updatedAt: Date.now() } } })),
      resetFix: (id) =>
        set((s) => {
          const prev = s.fixes[id];
          // keep "solved" so the badge survives a restart
          return { fixes: { ...s.fixes, [id]: { ...emptyFix(), solved: prev?.solved ?? false } } };
        }),
      answerQuiz: (topic, qid, choice) =>
        set((s) => {
          const q = s.quizzes[topic] ?? emptyQuiz();
          return { quizzes: { ...s.quizzes, [topic]: { ...q, answers: { ...q.answers, [qid]: choice } } } };
        }),
      finishQuiz: (topic, score) =>
        set((s) => {
          const q = s.quizzes[topic] ?? emptyQuiz();
          return { quizzes: { ...s.quizzes, [topic]: { ...q, bestScore: Math.max(q.bestScore, score), runs: q.runs + 1 } } };
        }),
      restartQuiz: (topic) =>
        set((s) => {
          const q = s.quizzes[topic] ?? emptyQuiz();
          return { quizzes: { ...s.quizzes, [topic]: { ...q, answers: {} } } };
        }),
      resetAll: () => set({ attempts: {}, fixes: {}, quizzes: {} }),
      importData: (data) => {
        const d = data as { app?: string; attempts?: Record<string, Attempt>; fixes?: Record<string, FixAttempt>; quizzes?: Record<string, QuizProgress> };
        if (!d || d.app !== 'designprep' || typeof d.attempts !== 'object' || d.attempts === null)
          throw new Error('This file is not a DesignPrep export.');
        const attempts: Record<string, Attempt> = {};
        for (const [k, v] of Object.entries(d.attempts)) attempts[k] = { ...emptyAttempt(), ...v };
        const fixes: Record<string, FixAttempt> = {};
        for (const [k, v] of Object.entries(d.fixes ?? {})) fixes[k] = { ...emptyFix(), ...v };
        const quizzes: Record<string, QuizProgress> = {};
        for (const [k, v] of Object.entries(d.quizzes ?? {})) quizzes[k] = { ...emptyQuiz(), ...v };
        set({ attempts, fixes, quizzes });
      },
    }),
    {
      name: 'designprep-progress',
      version: 2,
      // v1 only had `attempts`
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<ProgressState>;
        return { attempts: p.attempts ?? {}, fixes: p.fixes ?? {}, quizzes: p.quizzes ?? {} } as ProgressState;
      },
      partialize: (s) => ({ attempts: s.attempts, fixes: s.fixes, quizzes: s.quizzes }) as ProgressState,
    }
  )
);

export const statusLabel: Record<Status, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
};

export function exportProgress() {
  const { attempts, fixes, quizzes } = useProgress.getState();
  const data = { app: 'designprep', version: 2, exportedAt: new Date().toISOString(), attempts, fixes, quizzes };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `designprep-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
