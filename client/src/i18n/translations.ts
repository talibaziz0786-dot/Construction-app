import { enTranslations, type EnKeys } from './en.js';
import { hiTranslations } from './hi.js';
export type AppLanguage = 'en' | 'hi';
export type TranslationKey = EnKeys;
export const LANGUAGE_STORAGE_KEY = 'construction-app:language';
export const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: { ...enTranslations },
  hi: hiTranslations,
};
export function translate(lang: AppLanguage, key: TranslationKey): string {
  return translations[lang][key] ?? enTranslations[key];
}
