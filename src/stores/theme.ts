import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'deepdesk:theme';

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function apply(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

const initialTheme = ((): Theme => {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system';
})();

export const useTheme = create<ThemeState>((set) => ({
  theme: initialTheme,
  resolvedTheme: resolve(initialTheme),
  setTheme: (theme) => {
    const resolved = resolve(theme);
    apply(resolved);
    localStorage.setItem(STORAGE_KEY, theme);
    set({ theme, resolvedTheme: resolved });
  },
}));

// 启动时立刻应用主题，避免首帧白闪
if (typeof window !== 'undefined') {
  apply(resolve(initialTheme));

  // 监听系统主题变化（仅在 'system' 模式下生效）
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const { theme } = useTheme.getState();
    if (theme === 'system') {
      const resolved = e.matches ? 'dark' : 'light';
      apply(resolved);
      useTheme.setState({ resolvedTheme: resolved });
    }
  });
}
