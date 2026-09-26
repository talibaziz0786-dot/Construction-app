import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'construction-app:theme';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === 'light' || s === 'dark' || s === 'system') return s;
    } catch { /* ignore */ }
    return 'dark';
  });
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    theme === 'light' ? 'light' : theme === 'dark' ? 'dark' : systemPrefersDark() ? 'dark' : 'light',
  );

  useEffect(() => {
    const r: 'light' | 'dark' =
      theme === 'light' ? 'light' : theme === 'dark' ? 'dark' : systemPrefersDark() ? 'dark' : 'light';
    setResolved(r);
    const root = document.documentElement;
    root.classList.toggle('dark', r === 'dark');
    root.dataset.theme = r;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', r === 'dark' ? '#0f172a' : '#ffffff');
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => {
      const r = mq.matches ? 'dark' : 'light';
      setResolved(r);
      document.documentElement.classList.toggle('dark', r === 'dark');
      document.documentElement.dataset.theme = r;
    };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const c = useContext(ThemeContext);
  if (!c) throw new Error('useTheme must be used within ThemeProvider');
  return c;
}
