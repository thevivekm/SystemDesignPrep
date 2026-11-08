import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReadOnlyDiagram } from '../components/canvas/ReadOnlyDiagram';
import { Markdown } from '../components/Markdown';
import { Confetti } from '../components/SystemStatus';
import { QUIZ_BY_ID } from '../data/quizzes';
import { emptyQuiz, useProgress } from '../store/useProgress';
import type { QuizTopic } from '../types';

export function QuizRunner() {
  const { id = '' } = useParams();
  const topic = QUIZ_BY_ID[id];
  if (!topic)
    return (
      <div className="p-10 text-center">
        <p className="mb-3">Quiz not found.</p>
        <Link to="/quizzes" className="text-indigo-600 underline">Back to quizzes</Link>
      </div>
    );
  return <Runner key={topic.id} topic={topic} />;
}

function Runner({ topic }: { topic: QuizTopic }) {
  const progress = useProgress((s) => s.quizzes[topic.id]) ?? emptyQuiz();
  const answerQuiz = useProgress((s) => s.answerQuiz);
  const finishQuiz = useProgress((s) => s.finishQuiz);
  const restartQuiz = useProgress((s) => s.restartQuiz);
  const qs = topic.questions;
  const answeredCount = qs.filter((q) => progress.answers[q.id] !== undefined).length;
  // Resume at the first unanswered question
  const [idx, setIdx] = useState(() => Math.min(answeredCount, qs.length - 1));
  const [finished, setFinished] = useState(answeredCount === qs.length && qs.length > 0);

  const score = qs.filter((q) => progress.answers[q.id] === q.answer).length;
  const q = qs[idx];
  const chosen = progress.answers[q.id];
  const answered = chosen !== undefined;

  const next = () => {
    if (idx < qs.length - 1) setIdx(idx + 1);
    else {
      finishQuiz(topic.id, score);
      setFinished(true);
    }
  };

  const restart = () => {
    restartQuiz(topic.id);
    setIdx(0);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Link to="/quizzes" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">← All quizzes</Link>
          <div className="animate-fade-in-up relative mt-4 overflow-hidden rounded-xl border border-slate-200 p-6 text-center dark:border-slate-800">
            {pct === 100 && <Confetti />}
            <p className="text-sm text-slate-500">{topic.title}</p>
            <p className="mt-2 text-4xl font-bold tabular-nums">{score}<span className="text-xl text-slate-400">/{qs.length}</span></p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{pct === 100 ? 'Perfect score! 🎉' : pct >= 70 ? 'Solid. Review the misses below.' : 'Worth another pass. Read the explanations below.'}</p>
            <button type="button" onClick={restart} className="mt-4 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">Retake quiz</button>
          </div>
          <h2 className="mt-8 mb-3 font-semibold">Review</h2>
          <ol className="space-y-3">
            {qs.map((x, i) => {
              const ok = progress.answers[x.id] === x.answer;
              return (
                <li key={x.id} className={`rounded-lg border p-3 text-sm ${ok ? 'border-emerald-200 dark:border-emerald-900' : 'border-rose-200 dark:border-rose-900'}`}>
                  <div className="font-medium">{ok ? '✓' : '✗'} {i + 1}. <span className="font-normal">{x.question.replace(/\*\*|`/g, '')}</span></div>
                  <div className="mt-1 text-slate-600 dark:text-slate-400">Answer: <b>{x.options[x.answer]}</b></div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between gap-2">
          <Link to="/quizzes" className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">← {topic.title}</Link>
          <span className="text-sm tabular-nums text-slate-500">Question {idx + 1} / {qs.length} · Score {score}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((idx + (answered ? 1 : 0)) / qs.length) * 100}%` }} />
        </div>

        <div key={q.id} className="animate-fade-in-up mt-6">
          <Markdown>{q.question}</Markdown>
        </div>
        {q.diagram && (
          <div className="relative mt-4 h-64 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <ReadOnlyDiagram diagram={q.diagram} sim={answered && q.hotspots ? { state: 'broken', hot: q.hotspots } : undefined} />
            {answered && q.hotspots && (
              <span className="animate-fade-in-up absolute right-2 top-2 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow">The flaw, live</span>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {q.options.map((opt, i) => {
            const isRight = i === q.answer;
            const isChosen = i === chosen;
            const cls = !answered
              ? 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-700 dark:hover:bg-slate-900'
              : isRight
                ? `border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40 ${isChosen ? 'animate-pop' : ''}`
                : isChosen
                  ? 'animate-shake border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40'
                  : 'border-slate-200 opacity-60 dark:border-slate-800';
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => answerQuiz(topic.id, q.id, i)}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${cls}`}
              >
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-semibold opacity-70">{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{opt}</span>
                {answered && isRight && <span className="text-emerald-600">✓</span>}
                {answered && isChosen && !isRight && <span className="text-rose-600">✗</span>}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="animate-fade-in-up mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <p className={`mb-1 text-sm font-semibold ${chosen === q.answer ? 'text-emerald-600' : 'text-rose-600'}`}>{chosen === q.answer ? 'Correct!' : 'Not quite.'}</p>
            <Markdown>{q.explanation}</Markdown>
            <button type="button" onClick={next} className="mt-3 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              {idx < qs.length - 1 ? 'Next question →' : 'See results'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
