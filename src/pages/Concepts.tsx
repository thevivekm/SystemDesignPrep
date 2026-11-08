import { useState } from 'react';
import { Markdown } from '../components/Markdown';
import { CONCEPTS } from '../data/concepts';

export function Concepts() {
  const [active, setActive] = useState(CONCEPTS[0].id);
  const c = CONCEPTS.find((x) => x.id === active) ?? CONCEPTS[0];
  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 p-2 md:w-60 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r dark:border-slate-800">
        {CONCEPTS.map((x) => (
          <button key={x.id} type="button" onClick={() => setActive(x.id)} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-sm ${x.id === active ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'}`}>
            {x.title}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto max-w-3xl px-5 py-6">
          <h1 className="mb-4 text-2xl font-bold tracking-tight">{c.title}</h1>
          <Markdown>{c.body}</Markdown>
        </article>
      </div>
    </div>
  );
}
