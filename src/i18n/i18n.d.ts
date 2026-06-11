import 'i18next';
import type translations from './locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: typeof translations;
  }
}
