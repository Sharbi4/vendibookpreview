import { useEffect, useRef, useState } from 'react';

/**
 * Persist a checkout wizard's furthest-reached step and captured form
 * state to sessionStorage keyed per listing so a buyer can leave and
 * return without losing typed information.
 */
export function useCheckoutState<T extends object>(sessionKey: string, initial: T) {
  const storageKey = `vb.checkout:${sessionKey}`;
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return initial;
      const parsed = JSON.parse(raw) as { state?: T };
      return { ...initial, ...(parsed.state ?? {}) };
    } catch {
      return initial;
    }
  });

  const [furthestStep, setFurthestStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return 1;
      const parsed = JSON.parse(raw) as { furthestStep?: number };
      return parsed.furthestStep ?? 1;
    } catch {
      return 1;
    }
  });

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({ state, furthestStep }),
      );
    } catch {
      /* quota — ignore */
    }
  }, [state, furthestStep, storageKey]);

  const clear = () => {
    try { window.sessionStorage.removeItem(storageKey); } catch { /* noop */ }
  };

  const bumpFurthestStep = (n: number) =>
    setFurthestStep((cur) => (n > cur ? n : cur));

  return { state, setState, furthestStep, bumpFurthestStep, clear };
}

export default useCheckoutState;
