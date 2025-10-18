import { useCallback, useEffect, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

function readValue<T>(key: string, fallback: T): T {
  if (!isBrowser) {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue === null) {
      return fallback;
    }

    return JSON.parse(storedValue) as T;
  } catch (error) {
    console.warn(`No se pudo leer la clave ${key} de localStorage`, error);
    return fallback;
  }
}

export function useLocalStorage<T>(key: string | null, defaultValue: T) {
  const [storageKey, setStorageKey] = useState<string | null>(key);
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (key === null) {
      return defaultValue;
    }

    return readValue<T>(key, defaultValue);
  });

  useEffect(() => {
    if (key === storageKey) {
      return;
    }

    setStorageKey(key);
    if (key === null) {
      setStoredValue(defaultValue);
      return;
    }

    setStoredValue(readValue<T>(key, defaultValue));
  }, [defaultValue, key, storageKey]);

  const setValue = useCallback(
    (value: T | ((previous: T) => T)) => {
      if (storageKey === null) {
        const nextValue = value instanceof Function ? value(storedValue) : value;
        setStoredValue(nextValue);
        return;
      }

      setStoredValue((previous: T) => {
        const nextValue = value instanceof Function ? value(previous) : value;

        if (isBrowser) {
          window.localStorage.setItem(storageKey, JSON.stringify(nextValue));
        }

        return nextValue;
      });
    },
    [storageKey, storedValue]
  );

  const removeValue = useCallback(() => {
    if (storageKey === null) {
      setStoredValue(defaultValue);
      return;
    }

    if (isBrowser) {
      window.localStorage.removeItem(storageKey);
    }
    setStoredValue(defaultValue);
  }, [defaultValue, storageKey]);

  return [storedValue, setValue, removeValue] as const;
}
