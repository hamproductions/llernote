import 'i18next';
import type translations from './locales/en.json';
import type bingo from './locales/bingo-en.json';
import type fes from './locales/fes-en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: typeof translations & { bingo: typeof bingo; fes: typeof fes };
  }
}
