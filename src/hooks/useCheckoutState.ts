import { useEffect, useState } from 'react';

/** Keep checkout drafts isolated by the caller's account and listing key. */
export function useCheckoutState<T extends object>(sessionKey: string, initial: T) {
  const storageKey = `vb.checkout:${sessionKey}`;
  const read = () => {
    try {
      const raw = typeof window === 'undefined' ? null : window.sessionStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) : null;
      return { key: storageKey, state: { ...initial, ...(saved?.state ?? {}) } as T, furthestStep: saved?.furthestStep ?? 1 };
    } catch {
      return { key: storageKey, state: initial, furthestStep: 1 };
    }
  };
  const [draft, setDraft] = useState(read);
  // Reset during render so children never receive another account's draft.
  if (draft.key !== storageKey) setDraft(read());
  useEffect(() => {
    if (draft.key !== storageKey) return;
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(draft)); } catch { /* Storage may be unavailable. */ }
  }, [draft, storageKey]);
  const setState = (next: T | ((previous: T) => T)) => setDraft(previous => ({
    ...previous,
    state: typeof next === 'function' ? (next as (previous: T) => T)(previous.state) : next,
  }));
  const bumpFurthestStep = (step: number) => setDraft(previous => ({ ...previous, furthestStep: Math.max(previous.furthestStep, step) }));
  const clear = () => { try { window.sessionStorage.removeItem(storageKey); } catch { /* noop */ } };
  return { state: draft.state, setState, furthestStep: draft.furthestStep, bumpFurthestStep, clear };
}
export default useCheckoutState;
