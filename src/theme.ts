import { create } from 'zustand';

type Theme = 'light' | 'dark';

const initial = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

export const useTheme = create<{ theme: Theme; toggle: () => void }>((set, get) => ({
  theme: initial(),
  toggle: () => {
    const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
}));
