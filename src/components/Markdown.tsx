import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-4 prose-h2:mt-6 prose-h2:text-base prose-h3:text-sm prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:font-normal dark:prose-code:bg-slate-800 prose-table:text-xs">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
