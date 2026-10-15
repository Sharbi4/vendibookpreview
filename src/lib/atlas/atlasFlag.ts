/**
 * Atlas is off for the public until the owner turns it on. It shows when
 * VITE_ATLAS_ENABLED=true, or for a single browser after visiting any page
 * with ?atlas=1 (?atlas=0 turns it back off).
 */
const KEY = 'vb_atlas';

export function isAtlasEnabled(): boolean {
  if (import.meta.env.VITE_ATLAS_ENABLED === 'true') return true;
  if (typeof window === 'undefined') return false;
  try {
    const param = new URLSearchParams(window.location.search).get('atlas');
    if (param === '1') window.localStorage.setItem(KEY, '1');
    if (param === '0') window.localStorage.removeItem(KEY);
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
