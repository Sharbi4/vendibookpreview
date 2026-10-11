/**
 * Lightweight feature-flag registry. Values default to build-time constants
 * but can be overridden per-browser via localStorage for quick kill-switch
 * behavior (e.g. `localStorage.setItem('ff.embeddedCheckout', 'false')`).
 */


function readLocalOverride(key: string): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`ff.${key}`);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

/**
 * When true, checkout flows always false: embedded card checkout is retired and every flow uses the in-app PayPal checkout surface.
 */
export function isEmbeddedCheckoutEnabled(): boolean {
  // Embedded card checkout is retired — all checkout flows run through the
  // in-app PayPal surfaces. Kept as a stable no-op for existing call sites.
  return false;
}
