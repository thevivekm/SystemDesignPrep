import { Link } from 'react-router-dom';
import { QUIZ_TOPICS } from '../data/quizzes';
import { useProgress } from '../store/useProgress';

export function QuizList() {
  const quizzes = useProgress((s) => s.quizzes);
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
        <p className="mt-1 mb-6 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Short multiple-choice sets by topic, each answer explained. Try <b>Spot the Flaw</b> for diagram-based questions, or <Link to="/fix" className="text-indigo-600 underline dark:text-indigo-400">Fix the Design</Link> to repair flawed systems on the canvas.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUIZ_TOPICS.map((t) => {
            const p = quizzes[t.id];
            const total = t.questions.length;
            const best = p?.bestScore ?? 0;
            const pct = Math.round((best / total) * 100);
            return (
              <Link key={t.id} to={`/quizzes/${t.id}`} className="group flex flex-col rounded-lg border border-slate-200 p-4 transition hover:border-indigo-400 hover:shadow-sm dark:border-slate-800 dark:hover:border-indigo-500">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{total} questions</span>
                  {p?.runs ? <span className={`text-xs font-semibold ${pct === 100 ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>Best {best}/{total}</span> : null}
                </div>
                <h2 className="font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{t.title}</h2>
                <p className="mt-1 flex-1 text-sm text-slate-500 dark:text-slate-400">{t.description}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${p?.runs ? pct : 0}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
