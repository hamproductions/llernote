import 'i18next';
import type translations from './locales/en.json';
import type bingo from './locales/bingo-en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: typeof translations & { bingo: typeof bingo };
  }
}
