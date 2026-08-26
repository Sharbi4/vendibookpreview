/**
 * Server-authoritative identity for a "List with Vendi" listing session.
 *
 * Root cause of the original duplicate-draft bug: the builder treated the
 * browser's localStorage payload as the source of truth for `draftId`. Any
 * remount, auth transition, cleared storage, second tab or new device produced
 * an empty `draftId`, and the create-draft effect happily inserted ANOTHER
 * listing row as soon as mode + category were known.
 *
 * The fix has three halves:
 *  1. Every session carries a durable `sessionKey`. The edge function treats it
 *     as an idempotency key (one key == one listing row for that owner), so
 *     repeated invocations can never create a second draft.
 *  2. Before creating anything, the client asks the SERVER which unfinished
 *     Vendi drafts this owner has. localStorage stays a fast UX cache; it is no
 *     longer what decides listing identity.
 *  3. A session key whose listing is no longer a draft (published, paused,
 *     archived, deleted) is RETIRED — never resumed, never autosaved onto.
 */
import { supabase } from '@/integrations/supabase/client';
import type { DocumentType } from '@/types/documents';
import { listingRowToVendiDraft, type ListingRow } from './hydrate';
import type { VendiDraft } from './script';

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
  /** Full Vendi-supported hydration of the saved row. */
  draft: VendiDraft;
  image_urls: string[] | null;
  video_urls: string[] | null;
  required_documents: DocumentType[];
  title: string | null;
  category: string | null;
  mode: string | null;
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Only these statuses are an unfinished Vendi listing. */
const RESUMABLE_STATUS = 'draft';

const ACTIVE_DRAFT_COLUMNS = [
  'id', 'vendi_session_key', 'status', 'created_at', 'updated_at',
  'title', 'description', 'category', 'mode', 'subcategory',
  'address', 'pickup_location_text', 'city', 'state', 'postal_code', 'latitude', 'longitude',
  'price_sale', 'price_monthly', 'price_weekly', 'price_daily', 'price_hourly', 'deposit_amount',
  'available_from', 'available_to', 'operating_hours_start', 'operating_hours_end', 'instant_book',
  'fulfillment_type', 'delivery_fee', 'delivery_radius_miles', 'pickup_instructions',
  'delivery_instructions', 'access_instructions', 'hours_of_access', 'location_notes',
  'amenities', 'highlights', 'length_inches', 'width_inches', 'height_inches', 'weight_lbs',
  'accept_paypal_checkout', 'accept_cash_payment', 'vendibook_freight_enabled',
  'image_urls', 'video_urls', 'cover_image_url',
].join(',');

const toActive = (row: ListingRow, requiredDocuments: DocumentType[] = []): ActiveVendiDraft => ({
  id: String(row.id),
  session_key: String(row.vendi_session_key ?? ''),
  draft: listingRowToVendiDraft(row, requiredDocuments),
  image_urls: (row.image_urls as string[]) ?? null,
  video_urls: (row.video_urls as string[]) ?? null,
  required_documents: requiredDocuments,
  title: (row.title as string) || null,
  category: (row.category as string) || null,
  mode: (row.mode as string) || null,
  city: (row.city as string) || null,
  state: (row.state as string) || null,
  cover_image_url: (row.cover_image_url as string)
    ?? ((row.image_urls as string[] | null)?.[0] ?? null),
  created_at: String(row.created_at),
  updated_at: (row.updated_at as string) ?? null,
});

/** Rental screening documents Vendi owns for a listing. */
export async function loadRequiredDocuments(listingId: string): Promise<DocumentType[]> {
  const { data } = await supabase
    .from('listing_required_documents')
    .select('document_type')
    .eq('listing_id', listingId);
  return ((data ?? []) as Array<{ document_type: DocumentType }>).map((r) => r.document_type);
}

/** Every unfinished Vendi draft on this account, newest activity first. */
export async function listActiveVendiDrafts(
  userId: string,
  limit = 6,
): Promise<ActiveVendiDraft[]> {
  const { data } = await supabase
    .from('listings')
    .select(ACTIVE_DRAFT_COLUMNS)
    .eq('host_id', userId)
    .eq('status', RESUMABLE_STATUS)
    .is('deleted_at', null)
    .not('vendi_session_key', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit);

  return ((data ?? []) as unknown as ListingRow[]).map((row) => toActive(row));
}

export interface ResumeResolution {
  /** The draft belonging to this browser's session key, if it is still a draft. */
  session: ActiveVendiDraft | null;
  /** Other unfinished Vendi drafts on the account. */
  others: ActiveVendiDraft[];
  /** This browser's session key points at a listing that is no longer a draft. */
  retired: boolean;
}

/**
 * Resolve what this browser should do on arrival.
 *
 * Never silently adopts an arbitrary draft: the caller decides between seamless
 * resume (same session), a single Continue/Start-new offer, or a chooser.
 */
export async function resolveVendiResume(
  userId: string,
  sessionKey?: string | null,
): Promise<ResumeResolution> {
  const drafts = await listActiveVendiDrafts(userId);
  const session = sessionKey ? drafts.find((d) => d.session_key === sessionKey) ?? null : null;

  let retired = false;
  if (sessionKey && !session) {
    const { data } = await supabase
      .from('listings')
      .select('id,status')
      .eq('host_id', userId)
      .eq('vendi_session_key', sessionKey)
      .maybeSingle();
    retired = !!data && (data as { status?: string }).status !== RESUMABLE_STATUS;
  }

  const others = drafts.filter((d) => d.id !== session?.id);
  return { session, others, retired };
}

/**
 * The owner's current unfinished Vendi draft for this session, if any.
 * Kept for call sites that only need the exact-session answer; it deliberately
 * never falls back to "some other recent draft".
 */
export async function findActiveVendiDraft(
  userId: string,
  sessionKey?: string | null,
): Promise<ActiveVendiDraft | null> {
  const { session } = await resolveVendiResume(userId, sessionKey);
  return session;
}

/**
 * What the server says about the row this browser thinks it is editing.
 *
 * A cached `draftId` is a hint, never a fact: between two visits the seller may
 * have published it, archived it, or deleted it from the dashboard or the full
 * editor. Vendi must never keep chatting into — or autosaving onto — a row that
 * is no longer an unfinished draft.
 */
export type DraftVerification =
  | { state: 'active'; draft: ActiveVendiDraft }
  /** Deleted, soft-deleted, or not owned by this account. */
  | { state: 'gone' }
  /** Still exists but has left the draft lifecycle (published / paused / archived). */
  | { state: 'not_draft'; status: string };

/**
 * Authoritative re-read of one listing for this owner. Used on resume, when a
 * cached draft id is restored, when returning from the full editor, and when
 * the tab regains focus — so the newest server values always win over stale
 * browser state, and a removed draft is detected instead of silently written to.
 */
export async function verifyVendiDraft(
  listingId: string,
  userId: string,
): Promise<DraftVerification> {
  const { data } = await supabase
    .from('listings')
    .select(`${ACTIVE_DRAFT_COLUMNS},deleted_at,host_id`)
    .eq('id', listingId)
    .eq('host_id', userId)
    .maybeSingle();

  if (!data) return { state: 'gone' };
  const row = data as unknown as ListingRow;
  if (row.deleted_at) return { state: 'gone' };
  if (row.status !== RESUMABLE_STATUS) return { state: 'not_draft', status: String(row.status ?? '') };

  const docs = row.mode === 'rent' ? await loadRequiredDocuments(String(row.id)) : [];
  return { state: 'active', draft: toActive(row, docs) };
}

/**
 * Open any of the owner's own drafts in Vendi (dashboard "Continue with Vendi").
 *
 * A draft the seller started in the manual wizard has no Vendi session key yet;
 * claiming it with this browser's key keeps the one-row guarantee intact, so
 * later create calls resolve to this listing instead of inserting a second one.
 */
export async function adoptDraftIntoVendiSession(
  listingId: string,
  userId: string,
  sessionKey: string,
): Promise<DraftVerification> {
  const verified = await verifyVendiDraft(listingId, userId);
  if (verified.state !== 'active') return verified;

  if (verified.draft.session_key) {
    adoptVendiSessionKey(userId, verified.draft.session_key);
    return verified;
  }

  const { error } = await supabase
    .from('listings')
    .update({ vendi_session_key: sessionKey } as never)
    .eq('id', listingId)
    .eq('host_id', userId)
    .eq('status', RESUMABLE_STATUS)
    .is('vendi_session_key', null);
  // A claim collision just means another tab got there first; the row is still
  // this listing, so continuing is safe either way.
  if (error) return verified;
  return { state: 'active', draft: { ...verified.draft, session_key: sessionKey } };
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

/** Thrown when the browser's session key belongs to a listing that already went live. */
export class VendiSessionRetiredError extends Error {
  constructor() {
    super('This listing session already finished. Start a new listing to continue.');
    this.name = 'VendiSessionRetiredError';
  }
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
  if ((data as { error?: string } | null)?.error === 'session_retired') {
    throw new VendiSessionRetiredError();
  }
  if (error) throw error;
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new Error('We could not start your draft.');
  return id;
}
