import React, { createContext, useContext, useEffect, useState } from 'react';
import { LANGUAGE_STORAGE_KEY, translate, type AppLanguage, type TranslationKey } from '../i18n/translations.js';

interface LanguageContextType {
  lang: AppLanguage;
  setLang: (l: AppLanguage) => void;
  t: (k: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    try {
      const s = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (s === 'hi' || s === 'en') return s;
    } catch { /* ignore */ }
    return 'en';
  });
  useEffect(() => {
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, lang); } catch { /* ignore */ }
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
  }, [lang]);
  const setLang = (l: AppLanguage) => setLangState(l);
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: (k) => translate(lang, k) }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const c = useContext(LanguageContext);
  if (!c) throw new Error('useLanguage must be used within LanguageProvider');
  return c;
}
