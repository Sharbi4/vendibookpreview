/**
 * Server-authoritative identity for a "List with Vendi" listing session.
 *
 * Root cause of the duplicate-draft bug: the builder treated the browser's
 * localStorage payload as the source of truth for `draftId`. Any remount, auth
 * transition, cleared storage, second tab or new device produced an empty
 * `draftId`, and the create-draft effect happily inserted ANOTHER listing row
 * as soon as mode + category were known.
 *
 * The fix has two halves:
 *  1. Every session carries a durable `sessionKey`. The edge function treats it
 *     as an idempotency key (one key == one listing row for that owner), so
 *     repeated invocations can never create a second draft.
 *  2. Before creating anything, the client asks the SERVER whether this owner
 *     already has an unfinished Vendi draft. localStorage stays a fast UX
 *     cache; it is no longer what decides listing identity.
 */
import { supabase } from '@/integrations/supabase/client';

const SESSION_PREFIX = 'vendibook_vendi_session_v1:';

const sessionStorageKeyFor = (userId: string) => `${SESSION_PREFIX}${userId}`;

const randomKey = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);

/** Stable per-owner session key, created on first use and reused thereafter. */
export function getVendiSessionKey(userId: string): string {
  const storeKey = sessionStorageKeyFor(userId);
  try {
    const existing = localStorage.getItem(storeKey);
    if (existing && existing.length >= 8) return existing;
    const created = randomKey();
    localStorage.setItem(storeKey, created);
    return created;
  } catch {
    // Private mode / blocked storage: still return a key so the request is
    // idempotent within this page life.
    return randomKey();
  }
}

/** Adopt an existing server session key as this browser's session. */
export function adoptVendiSessionKey(userId: string, key: string): void {
  try {
    localStorage.setItem(sessionStorageKeyFor(userId), key);
  } catch { /* ignore */ }
}

/** Explicit "Start over": retire the current session and mint a fresh one. */
export function rotateVendiSessionKey(userId: string): string {
  const created = randomKey();
  try {
    localStorage.setItem(sessionStorageKeyFor(userId), created);
  } catch { /* ignore */ }
  return created;
}

export interface ActiveVendiDraft {
  id: string;
  session_key: string;
  title: string | null;
  description: string | null;
  category: string | null;
  mode: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  address: string | null;
  image_urls: string[] | null;
  created_at: string;
}

const ACTIVE_DRAFT_COLUMNS =
  'id,vendi_session_key,title,description,category,mode,city,state,postal_code,address,image_urls,created_at,status';

type DraftRow = Record<string, unknown>;

const toActive = (row: DraftRow): ActiveVendiDraft => ({
  id: String(row.id),
  session_key: String(row.vendi_session_key ?? ''),
  title: (row.title as string) || null,
  description: (row.description as string) || null,
  category: (row.category as string) || null,
  mode: (row.mode as string) || null,
  city: (row.city as string) || null,
  state: (row.state as string) || null,
  postal_code: (row.postal_code as string) || null,
  address: (row.address as string) || null,
  images: (row.image_urls as string[]) ?? null,
  created_at: String(row.created_at),
});

/**
 * The owner's current unfinished Vendi draft, if any.
 *
 * Deliberately narrow: only rows that carry a Vendi session marker and are
 * still `status = 'draft'` qualify. An arbitrary old wizard draft is never
 * adopted. When `sessionKey` is supplied, that exact session wins; otherwise
 * (new device, cleared storage) the most recent Vendi draft is offered so the
 * seller can continue it instead of starting a duplicate.
 */
export async function findActiveVendiDraft(
  userId: string,
  sessionKey?: string | null,
): Promise<ActiveVendiDraft | null> {
  if (sessionKey) {
    const { data } = await supabase
      .from('listings')
      .select(ACTIVE_DRAFT_COLUMNS)
      .eq('host_id', userId)
      .eq('vendi_session_key', sessionKey)
      .eq('status', 'draft')
      .maybeSingle();
    if (data) return toActive(data as DraftRow);
  }

  const { data: recent } = await supabase
    .from('listings')
    .select(ACTIVE_DRAFT_COLUMNS)
    .eq('host_id', userId)
    .eq('status', 'draft')
    .not('vendi_session_key', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const row = (recent ?? [])[0] as DraftRow | undefined;
  return row ? toActive(row) : null;
}

export interface CreateDraftArgs {
  sessionKey: string;
  mode: 'sale' | 'rent';
  category: string;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  location?: string | null;
}

/**
 * Create-or-resume. Safe to call from a racing effect, a second tab, or after a
 * reload mid-create: the server keys off `sessionKey` and returns the same id.
 */
export async function createOrResumeVendiDraft(args: CreateDraftArgs): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Please sign in again to continue.');

  const { data, error } = await supabase.functions.invoke('create-listing-draft', {
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      sessionKey: args.sessionKey,
      mode: args.mode,
      category: args.category,
      city: args.city ?? null,
      state: args.state ?? null,
      zipCode: args.zipCode ?? null,
      location: args.location ?? null,
    },
  });
  if (error) throw error;
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new Error('We could not start your draft.');
  return id;
}
