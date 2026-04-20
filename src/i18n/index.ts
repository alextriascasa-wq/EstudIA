import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ca from './locales/ca.json';
import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LOCALES = ['ca', 'en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_META: Record<Locale, { name: string; flag: string }> = {
  ca: { name: 'Català', flag: '🇦🇩' },
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Español', flag: '🇪🇸' },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ca: { translation: ca },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'ca',
    supportedLngs: SUPPORTED_LOCALES,
    detection: {
      // Priority: user preference (persisted store) → localStorage → navigator
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'studyflow-locale',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;

/** Set the active locale and persist to localStorage. */
export function setLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
}
