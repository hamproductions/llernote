import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from './useLocalStorage';
import { loadAbbreviations } from '~/data/abbreviations';
import {
  createAbbreviations,
  EMPTY_ABBREVIATIONS,
  type Abbreviations
} from '~/utils/abbreviations';

interface State {
  data?: Abbreviations;
  failed: boolean;
}

const empty = createAbbreviations(EMPTY_ABBREVIATIONS);
const initial: State = { failed: false };
const listeners = new Set<() => void>();
let state = initial;
let loading = false;

const publish = (next: State) => {
  state = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const request = () => {
  if (state.data || loading) return;
  loading = true;
  publish(initial);
  loadAbbreviations()
    .then(
      (data) => publish({ data, failed: false }),
      (error: unknown) => {
        console.error(error);
        publish({ failed: true });
      }
    )
    .finally(() => {
      loading = false;
    });
};

export const useAbbreviations = () => {
  const { i18n } = useTranslation();
  const { data, failed } = useSyncExternalStore(
    subscribe,
    () => state,
    () => initial
  );
  useEffect(request, []);
  return useMemo(() => {
    const abbreviations = data ?? empty;
    return {
      ...abbreviations,
      ready: !!data,
      failed,
      retry: request,
      short: abbreviations.shortNames(i18n.language)
    };
  }, [data, failed, i18n.language]);
};

export const useAbbreviatedExport = () => {
  const [stored, setStored] = useLocalStorage<boolean>('llernote-use-abbreviations', false);
  const { short, ready, failed, retry } = useAbbreviations();
  const abbreviate = !!stored;
  const setAbbreviate = (value: boolean) => {
    retry();
    setStored(value);
  };
  return {
    abbreviate,
    setAbbreviate,
    ready,
    short,
    exportShort: abbreviate ? short : undefined,
    pending: abbreviate && !ready && !failed
  };
};
