import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Moon, Sun, Monitor, LogIn, UserPlus, FolderOpen, LogOut } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.js';
import { useTheme } from '../contexts/ThemeContext.js';
import { useAuth } from '../contexts/AuthContext.js';
import type { AppLanguage } from '../i18n/translations.js';

export const SiteHeader: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme, resolved } = useTheme();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Single-toggle spec: Light -> show Moon (switch to dark), Dark -> show Sun (switch to light).
  const isDark = resolved === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  const toggleLabel = isDark ? t('themeSwitchToLight') : t('themeSwitchToDark');

  return (
    <header className="no-print sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--page-bg)] text-[var(--page-text)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-amber-500" />
          <span className="text-base font-bold">{t('appName')}</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm" aria-label="Site">
          <Link to="/calculators" className="hidden sm:inline px-2 py-2 min-h-[44px] items-center">{t('navCalculators')}</Link>
          <Link to="/workspace" className="hidden sm:inline px-2 py-2 min-h-[44px] items-center">{t('navWorkspace')}</Link>
          {!isLoading && isAuthenticated && (
            <>
              <Link to="/projects" className="hidden md:inline-flex items-center gap-1.5 px-2 py-2">
                <FolderOpen className="h-4 w-4" />
                {t('navProjects')}
              </Link>
              <button type="button" onClick={() => void logout()} title={t('navLogout')} aria-label={t('navLogout')} className="hidden md:inline-flex items-center gap-1.5 px-2 py-2 opacity-80 hover:opacity-100">
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">{t('navLogout')}</span>
              </button>
            </>
          )}
          {!isLoading && !isAuthenticated && (
            <>
              <Link to="/login" className="hidden md:inline-flex items-center gap-1.5 px-2 py-2 opacity-80 hover:opacity-100">
                <LogIn className="h-4 w-4" />
                {t('navSignIn')}
              </Link>
              <Link to="/signup" className="hidden md:inline-flex items-center gap-1.5 px-2 py-2 opacity-80 hover:opacity-100">
                <UserPlus className="h-4 w-4" />
                {t('navSignUp')}
              </Link>
            </>
          )}
          <Link to={isAuthenticated ? '/workspace' : '/calculators'} className="hidden sm:inline-flex rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400">
            {t('navStartFree')}
          </Link>
          <label className="flex items-center gap-1.5 text-xs">
            <span className="hidden md:inline opacity-70">{t('languageLabel')}</span>
            <select
              value={lang}
              aria-label={t('languageLabel')}
              onChange={(e) => setLang(e.target.value as AppLanguage)}
              className="rounded-lg border border-[var(--field-border)] px-2 py-2 min-h-[44px] text-sm bg-[var(--field-bg)] text-[var(--field-text)]"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </label>
          <div className="flex items-center rounded-lg border border-[var(--card-border)] p-0.5" role="group" aria-label={t('themeLabel')}>
            <button
              type="button"
              title={toggleLabel}
              aria-label={toggleLabel}
              onClick={toggleTheme}
              className="p-2.5 rounded-md min-h-[44px] min-w-[44px] bg-amber-500 text-slate-950 transition hover:bg-amber-400"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              title={t('themeSystem')}
              aria-label={t('themeSystem')}
              aria-pressed={theme === 'system'}
              onClick={() => setTheme('system')}
              className={`p-2.5 rounded-md min-h-[44px] min-w-[44px] transition ${theme === 'system' ? 'bg-amber-500/20 text-amber-500' : 'opacity-60 hover:opacity-100'}`}
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>
          <span className="sr-only">theme:{theme} resolved:{resolved} user:{user?.email ?? 'guest'}</span>
        </nav>
      </div>
    </header>
  );
};
