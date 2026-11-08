import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Concepts } from './pages/Concepts';
import { FixList } from './pages/FixList';
import { FixWorkspace } from './pages/FixWorkspace';
import { QuizList } from './pages/QuizList';
import { QuizRunner } from './pages/QuizRunner';
import { ProblemList } from './pages/ProblemList';
import { Settings } from './pages/Settings';
import { Workspace } from './pages/Workspace';
import { useTheme } from './theme';

const navCls = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-sm ${isActive ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`;

export default function App() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
        <NavLink to="/" className="mr-1 flex shrink-0 items-center gap-2 font-semibold">
          <img src="favicon.svg" alt="" className="h-6 w-6" />
          <span className="hidden lg:inline">DesignPrep</span>
        </NavLink>
        <nav className="flex min-w-0 gap-1 overflow-x-auto">
          <NavLink to="/" end className={navCls}>Problems</NavLink>
          <NavLink to="/fix" className={navCls}>Fix&nbsp;the&nbsp;Design</NavLink>
          <NavLink to="/quizzes" className={navCls}>Quizzes</NavLink>
          <NavLink to="/concepts" className={navCls}>Concepts</NavLink>
          <NavLink to="/settings" className={navCls}>Settings</NavLink>
        </nav>
        <button type="button" onClick={toggle} className="ml-auto shrink-0 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Toggle dark mode" title="Toggle theme">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
          )}
        </button>
      </header>
      <main key={location.pathname} className="animate-fade-in min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<ProblemList />} />
          <Route path="/problems/:id" element={<Workspace />} />
          <Route path="/fix" element={<FixList />} />
          <Route path="/fix/:id" element={<FixWorkspace />} />
          <Route path="/quizzes" element={<QuizList />} />
          <Route path="/quizzes/:id" element={<QuizRunner />} />
          <Route path="/concepts" element={<Concepts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<ProblemList />} />
        </Routes>
      </main>
    </div>
  );
}
