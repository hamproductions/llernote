import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  useCallback
} from 'react';

type NullOrUndefinedAble<T> = T | null | undefined;
export class LocalStorage<T = unknown> {
  constructor(public key: string) {}

  get value(): NullOrUndefinedAble<T> {
    try {
      const val = localStorage.getItem(this.key);
      return val !== null ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  set value(value: NullOrUndefinedAble<T>) {
    if (value != null) {
      localStorage.setItem(this.key, JSON.stringify(value));
    } else {
      localStorage.removeItem(this.key);
    }
  }

  clear() {
    localStorage.removeItem(this.key);
  }
}

export const useLocalStorage = function <T>(
  key: string,
  initial: NullOrUndefinedAble<T> = undefined
): [NullOrUndefinedAble<T>, Dispatch<SetStateAction<NullOrUndefinedAble<T>>>] {
  const storage = useRef(new LocalStorage<T>(key));
  const [data, setData] = useState<NullOrUndefinedAble<T>>(initial);

  const setNewData: Dispatch<SetStateAction<NullOrUndefinedAble<T>>> = useCallback(
    (s: SetStateAction<NullOrUndefinedAble<T>>) => {
      setData((prev) => {
        //@ts-expect-error force convert to function
        const newData = typeof s === 'function' ? s.call(s, prev) : s;
        storage.current.value = newData;
        return newData;
      });
    },
    []
  );

  useEffect(() => {
    const stored = storage.current.value;
    if (stored != null) setData(stored);
    // oxlint-disable-next-line exhaustive-deps
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        setData(event.newValue !== null ? JSON.parse(event.newValue) : initial);
      } catch {
        setData(initial);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
    // oxlint-disable-next-line exhaustive-deps
  }, [key]);

  return [data, setNewData];
};
