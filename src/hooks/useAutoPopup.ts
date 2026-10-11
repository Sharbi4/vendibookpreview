/**
 * Global auto-popup coordinator.
 *
 * Vendibook shows several self-opening surfaces (cookie consent, install
 * banner, phone verification, boost prompt). Only ONE of them may be visible
 * at a time, and lower-priority ones wait their turn instead of stacking.
 *
 * Usage:
 *   const { open, show, close } = useAutoPopup('boost', { delayMs: 60_000, priority: 10 });
 *
 * `open` flips to true only when the requested delay has elapsed AND no other
 * popup currently holds the slot. Releasing the slot (close) lets the next
 * waiting popup take it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

let activeId: string | null = null;
const waiters = new Set<() => void>();

function notify() {
  waiters.forEach((fn) => fn());
}

/** Try to take the single global popup slot. */
export function claimPopupSlot(id: string): boolean {
  if (activeId && activeId !== id) return false;
  activeId = id;
  return true;
}

/** Release the slot so the next waiting popup can appear. */
export function releasePopupSlot(id: string) {
  if (activeId === id) {
    activeId = null;
    notify();
  }
}

export function isPopupSlotBusy(): boolean {
  return activeId !== null;
}

interface AutoPopupOptions {
  /** Wait this long after `ready` before attempting to show. */
  delayMs?: number;
  /** Extra spacing after another popup closes, so they never flash together. */
  gapMs?: number;
  /** Set false to keep the popup dormant (not eligible to show). */
  ready?: boolean;
}

export function useAutoPopup(id: string, options: AutoPopupOptions = {}) {
  const { delayMs = 0, gapMs = 800, ready = true } = options;
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const elapsedRef = useRef(false);

  const tryOpen = useCallback(() => {
    if (openRef.current || !elapsedRef.current) return;
    if (!claimPopupSlot(id)) return;
    openRef.current = true;
    setOpen(true);
  }, [id]);

  const close = useCallback(() => {
    openRef.current = false;
    setOpen(false);
    releasePopupSlot(id);
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    elapsedRef.current = false;
    const timer = window.setTimeout(() => {
      elapsedRef.current = true;
      tryOpen();
    }, delayMs);

    // Retry when whoever holds the slot lets go.
    const onFree = () => window.setTimeout(tryOpen, gapMs);
    waiters.add(onFree);

    return () => {
      window.clearTimeout(timer);
      waiters.delete(onFree);
      releasePopupSlot(id);
      openRef.current = false;
    };
  }, [ready, delayMs, gapMs, tryOpen, id]);

  /** Force-show (e.g. user clicked a trigger) — still respects the slot. */
  const show = useCallback(() => {
    elapsedRef.current = true;
    tryOpen();
  }, [tryOpen]);

  return { open, show, close, setOpen };
}

export default useAutoPopup;
