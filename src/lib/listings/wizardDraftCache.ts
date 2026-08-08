/**
 * Local (per-browser) cache of everything the seller typed in the publish
 * wizard. The wizard already keeps state in memory while stepping back and
 * forth, but a refresh, an accidental navigation, or a return trip from a
 * payment page would otherwise drop anything not yet written to the database.
 *
 * The cache is intentionally "additive": on restore we only apply values that
 * actually carry content, so it can never blank out data that already exists
 * on the saved listing row.
 */

const PREFIX = 'vb:wizard-draft:';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type CacheEnvelope<T> = {
  savedAt: number;
  values: T;
};

export function wizardDraftKey(listingId: string) {
  return `${PREFIX}${listingId}`;
}

export function saveWizardDraft<T>(listingId: string | undefined, values: T) {
  if (!listingId) return;
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), values };
    localStorage.setItem(wizardDraftKey(listingId), JSON.stringify(envelope));
  } catch {
    // Storage can be full or blocked (private mode) — never break the wizard.
  }
}

export function loadWizardDraft<T>(listingId: string | undefined): T | null {
  if (!listingId) return null;
  try {
    const raw = localStorage.getItem(wizardDraftKey(listingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(wizardDraftKey(listingId));
      return null;
    }
    return parsed.values ?? null;
  } catch {
    return null;
  }
}

export function clearWizardDraft(listingId: string | undefined) {
  if (!listingId) return;
  try {
    localStorage.removeItem(wizardDraftKey(listingId));
  } catch {
    // ignore
  }
}

/** True when a cached value is worth restoring over whatever loaded from the DB. */
export function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value === true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return false;
}

/**
 * Merges a cached object into loaded state, keeping cached entries only when
 * they carry content. Nested plain objects are merged one level deep.
 */
export function mergeCached<T extends Record<string, any>>(current: T, cached: Partial<T> | undefined | null): T {
  if (!cached) return current;
  const next: Record<string, any> = { ...current };
  for (const [key, value] of Object.entries(cached)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      next[key] = mergeCached(current[key] ?? {}, value);
    } else if (hasContent(value)) {
      next[key] = value;
    }
  }
  return next as T;
}
