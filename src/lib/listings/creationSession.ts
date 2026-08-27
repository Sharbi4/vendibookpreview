/**
 * Canonical, idempotent draft creation for every NON-Vendi listing flow
 * (manual quick-start wizard, import/paste wizard, AI creator).
 *
 * Root cause this replaces: each of those flows inserted a listing row per
 * invocation. A remount, a StrictMode double effect, a sign-in redirect that
 * re-ran the "resume" effect, a double click, or a retry after a slow network
 * therefore produced a brand-new draft every time — the Earl Wigger and
 * Samantha Van duplicate rows.
 *
 * Fix: one durable per-owner CREATION SESSION KEY. The key is the server-side
 * idempotency key (`listings.creation_session_key`, partial-unique per host),
 * so the same key can never map to more than one row. Explicit "start a new
 * listing" is the ONLY thing that mints a new key.
 */
import { supabase } from '@/integrations/supabase/client';

const PREFIX = 'vendibook_listing_creation_v1:';

export type CreationFlow = 'manual' | 'import' | 'ai';

const storageKeyFor = (userId: string, flow: CreationFlow) => `${PREFIX}${flow}:${userId}`;

const randomKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

/** Stable key for this owner + flow; created on first use, reused thereafter. */
export function getCreationSessionKey(userId: string, flow: CreationFlow): string {
  const storeKey = storageKeyFor(userId, flow);
  try {
    const existing = localStorage.getItem(storeKey);
    if (existing && existing.length >= 8) return existing;
    const created = randomKey();
    localStorage.setItem(storeKey, created);
    return created;
  } catch {
    // Private mode / blocked storage: still idempotent for this page life.
    return randomKey();
  }
}

/** Explicit "Start a new listing": retire the current key, mint a fresh one. */
export function rotateCreationSessionKey(userId: string, flow: CreationFlow): string {
  const created = randomKey();
  try {
    localStorage.setItem(storageKeyFor(userId, flow), created);
  } catch { /* ignore */ }
  return created;
}

/** Drop the key once its listing is published/abandoned so it is never reused. */
export function clearCreationSessionKey(userId: string, flow: CreationFlow): void {
  try {
    localStorage.removeItem(storageKeyFor(userId, flow));
  } catch { /* ignore */ }
}

export class CreationSessionRetiredError extends Error {
  constructor() {
    super('This listing session already went live. Start a new listing to continue.');
    this.name = 'CreationSessionRetiredError';
  }
}

export interface CreateDraftArgs {
  userId: string;
  flow: CreationFlow;
  mode: 'rent' | 'sale';
  category: string;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Override the stored key (used right after an explicit rotate). */
  creationSessionKey?: string;
}

/**
 * Create the draft, or resume the one this creation session already produced.
 * Never returns a second row for the same key.
 */
export async function createOrResumeListingDraft(args: CreateDraftArgs): Promise<string> {
  const key = args.creationSessionKey ?? getCreationSessionKey(args.userId, args.flow);

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error('Please sign in to save your listing.');

  const { data, error } = await supabase.functions.invoke('create-listing-draft', {
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      mode: args.mode,
      category: args.category,
      location: args.location ?? null,
      city: args.city ?? null,
      state: args.state ?? null,
      zipCode: args.zipCode ?? null,
      latitude: args.latitude ?? null,
      longitude: args.longitude ?? null,
      creationSessionKey: key,
    },
  });

  const payload = data as { id?: string; retired?: boolean; error?: string } | null;
  if (payload?.retired) throw new CreationSessionRetiredError();
  if (error) throw new Error(payload?.error || error.message || 'We could not start your draft.');
  if (!payload?.id) throw new Error(payload?.error || 'Draft was not created. Please try again.');
  return payload.id;
}
