import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ja from './locales/ja.json';
// don't want to use this?
// have a look at the Quick start guide
// for passing in lng and translations on init
export const resources = {
  en: {
    translation: en
  },
  ja: {
    translation: ja
  }
};

const savedLanguage = (() => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('i18nextLng');
  if (stored === 'en' || stored === 'ja') return stored;
  return navigator.language.startsWith('ja') ? 'ja' : 'en';
})();

void i18n
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    lng: savedLanguage ?? 'ja',
    fallbackLng: 'en',
    debug: false,
    resources,
    interpolation: {
      escapeValue: false // not needed for react as it escapes by default
    }
  });

export type Locale = 'en' | 'ja' | string;

export default i18n;
