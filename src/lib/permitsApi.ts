import { supabase } from '@/integrations/supabase/client';
import type { DashboardResult } from '@/components/tools/permit-path/ResultsDashboard';

const sb = supabase as any;

export type PermitItemStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'expired';

export interface SavedRoadmap {
  id: string;
  user_id: string;
  roadmap_key: string;
  state_code: string;
  city: string | null;
  business_type: string | null;
  label: string | null;
  result_payload: DashboardResult;
  refreshed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface PermitItem {
  id: string;
  roadmap_id: string;
  user_id: string;
  item_key: string;
  status: PermitItemStatus;
  permit_number: string | null;
  issuing_agency: string | null;
  notes: string | null;
  issue_date: string | null;
  expires_on: string | null;
  archived: boolean;
  archived_at: string | null;
  archived_reason: string | null;
  field_updated_at: Record<string, string>;
  created_at: string;
  updated_at: string;
}


export interface PermitDocument {
  id: string;
  roadmap_id: string;
  user_id: string;
  item_key: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  deleted_at: string | null;
  uploaded_at: string;
}

export const PERMIT_DOC_BUCKET = 'permit-documents';
export const PERMIT_DOC_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const PERMIT_DOC_MAX_PER_ITEM = 5;

// Hard MIME allowlist. Anything not on this list is rejected before upload.
export const PERMIT_DOC_ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const;

// Backstop by extension for browsers that don't set a MIME (some iOS HEIC pickers).
const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'];

export interface UploadValidationError {
  file: string;
  reason: string;
}

/** Returns null when valid, or a human-readable rejection reason. */
export function validatePermitFile(file: File): string | null {
  if (!file || file.size === 0) {
    return 'File is empty or unreadable. Try re-exporting it and uploading again.';
  }
  if (file.size > PERMIT_DOC_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `Too large at ${mb} MB. Max is 10 MB — compress the PDF or screenshot the page.`;
  }
  const mime = (file.type || '').toLowerCase();
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const mimeOk = mime ? (PERMIT_DOC_ALLOWED_MIME as readonly string[]).includes(mime) : false;
  const extOk = ext ? ALLOWED_EXT.includes(ext) : false;
  if (!mimeOk && !extOk) {
    return `Unsupported file type${ext ? ` (.${ext})` : ''}. Use PDF, JPG, PNG, HEIC, or WEBP.`;
  }
  return null;
}

export function buildRoadmapKey(
  state: string,
  city: string | undefined | null,
  businessType: string | undefined | null,
) {
  return `${state}|${city || ''}|${businessType || ''}`;
}

export function defaultRoadmapLabel(result: DashboardResult) {
  const loc = result.location.city
    ? `${result.location.city}, ${result.location.state}`
    : result.location.state;
  const bt = result.businessType || result.location.business_type;
  return bt ? `${loc} · ${bt}` : loc;
}

// ---------------- Roadmaps ----------------

/**
 * Save the roadmap as a brand-new record. Multiple roadmaps with the same
 * (state, city, businessType) are now allowed — the user picks "refresh existing"
 * vs "save new" via SaveRoadmapDialog before we get here.
 */
export async function saveRoadmap(
  userId: string,
  result: DashboardResult,
  label?: string,
): Promise<SavedRoadmap> {
  const roadmap_key = buildRoadmapKey(
    result.location.state,
    result.location.city,
    result.businessType || result.location.business_type,
  );
  const payload = {
    user_id: userId,
    roadmap_key,
    state_code: result.location.state,
    city: result.location.city || null,
    business_type: result.businessType || result.location.business_type || null,
    label: (label && label.trim()) || defaultRoadmapLabel(result),
    result_payload: result as any,
  };
  const { data, error } = await sb
    .from('saved_permit_roadmaps')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as SavedRoadmap;
}

/** Roadmaps that could be a duplicate of the result the user is about to save. */
export async function findSimilarRoadmaps(
  userId: string,
  result: DashboardResult,
): Promise<SavedRoadmap[]> {
  const state = result.location.state;
  const city = (result.location.city || '').trim().toLowerCase();
  const bt = (result.businessType || result.location.business_type || '').toLowerCase();
  const { data, error } = await sb
    .from('saved_permit_roadmaps')
    .select('*')
    .eq('user_id', userId)
    .eq('state_code', state)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const rows = (data || []) as SavedRoadmap[];
  return rows
    .map((r) => {
      const rCity = (r.city || '').trim().toLowerCase();
      const rBt = (r.business_type || '').toLowerCase();
      const cityMatch = city && rCity ? rCity === city : !city && !rCity;
      const btMatch = bt && rBt ? rBt === bt : !bt && !rBt;
      const score = (cityMatch ? 2 : 0) + (btMatch ? 1 : 0);
      return { r, score };
    })
    .filter((x) => x.score >= 1) // at least same city OR same business type
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}


export async function listRoadmaps(userId: string): Promise<SavedRoadmap[]> {
  const { data, error } = await sb
    .from('saved_permit_roadmaps')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as SavedRoadmap[];
}

export async function getRoadmap(id: string): Promise<SavedRoadmap | null> {
  const { data, error } = await sb
    .from('saved_permit_roadmaps')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as SavedRoadmap) || null;
}

export async function deleteRoadmap(id: string): Promise<void> {
  const { error } = await sb.from('saved_permit_roadmaps').delete().eq('id', id);
  if (error) throw error;
}

// ---------------- Items ----------------

export async function listItems(roadmapId: string): Promise<PermitItem[]> {
  const { data, error } = await sb
    .from('permit_items')
    .select('*')
    .eq('roadmap_id', roadmapId);
  if (error) throw error;
  return (data || []) as PermitItem[];
}

export async function listItemsForUser(userId: string): Promise<PermitItem[]> {
  const { data, error } = await sb
    .from('permit_items')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []) as PermitItem[];
}

export async function upsertItem(
  userId: string,
  roadmapId: string,
  itemKey: string,
  patch: Partial<Omit<PermitItem, 'id' | 'roadmap_id' | 'user_id' | 'item_key' | 'created_at' | 'updated_at'>>,
): Promise<PermitItem> {
  const payload = {
    user_id: userId,
    roadmap_id: roadmapId,
    item_key: itemKey,
    status: patch.status ?? 'not_started',
    permit_number: patch.permit_number ?? null,
    issuing_agency: patch.issuing_agency ?? null,
    notes: patch.notes ?? null,
    issue_date: patch.issue_date ?? null,
    expires_on: patch.expires_on ?? null,
  };
  const { data, error } = await sb
    .from('permit_items')
    .upsert(payload, { onConflict: 'roadmap_id,item_key' })
    .select('*')
    .single();
  if (error) throw error;
  return data as PermitItem;
}

// ---------------- Documents ----------------

export async function listDocuments(roadmapId: string): Promise<PermitDocument[]> {
  const { data, error } = await sb
    .from('permit_documents')
    .select('*')
    .eq('roadmap_id', roadmapId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PermitDocument[];
}

export async function uploadDocument(
  userId: string,
  roadmapId: string,
  itemKey: string,
  file: File,
): Promise<PermitDocument> {
  if (file.size > PERMIT_DOC_MAX_BYTES) {
    throw new Error(`File too large (max ${Math.round(PERMIT_DOC_MAX_BYTES / 1024 / 1024)} MB).`);
  }
  if (file.type && !PERMIT_DOC_ALLOWED_MIME.includes(file.type)) {
    // Allow unknown types (e.g. HEIC sometimes empty) but warn known disallowed
    // by not rejecting silently here. Keep permissive for resilience.
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
  const objectKey = `${userId}/${roadmapId}/${encodeURIComponent(itemKey)}/${crypto.randomUUID()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(PERMIT_DOC_BUCKET)
    .upload(objectKey, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
  if (upErr) throw upErr;

  const { data, error } = await sb
    .from('permit_documents')
    .insert({
      user_id: userId,
      roadmap_id: roadmapId,
      item_key: itemKey,
      storage_path: objectKey,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select('*')
    .single();
  if (error) {
    // Best-effort cleanup
    await supabase.storage.from(PERMIT_DOC_BUCKET).remove([objectKey]).catch(() => {});
    throw error;
  }
  return data as PermitDocument;
}

export async function deleteDocument(doc: PermitDocument): Promise<void> {
  await supabase.storage.from(PERMIT_DOC_BUCKET).remove([doc.storage_path]).catch(() => {});
  const { error } = await sb.from('permit_documents').delete().eq('id', doc.id);
  if (error) throw error;
}

export async function getSignedDocUrl(storagePath: string, expiresInSec = 60 * 5): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PERMIT_DOC_BUCKET)
    .createSignedUrl(storagePath, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

// ---------------- Sessionstorage stash for sign-in resume ----------------

const PENDING_KEY = 'permitpath:pendingSave';

export function stashPendingSave(result: DashboardResult) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(result));
  } catch { /* ignore */ }
}

export function takePendingSave(): DashboardResult | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);
    return JSON.parse(raw) as DashboardResult;
  } catch {
    return null;
  }
}

// ---------------- Item keys / refresh ----------------

/** Mirror of how ResultsDashboard / buildRoadmap derive each requirement's stable id. */
export function extractItemKeys(result: DashboardResult): string[] {
  const out: string[] = [];
  for (const c of result.categories || []) {
    for (const it of c.items || []) {
      out.push(`${c.name}::${it.title}`);
    }
  }
  return out;
}

/**
 * Re-run produced new requirements for an existing saved roadmap.
 * - Swaps in the new payload.
 * - Archives items whose item_key disappears (progress + uploads preserved, hidden from %).
 * - Un-archives items that reappear (e.g. a permit briefly removed then added back).
 */
export async function refreshRoadmap(
  roadmapId: string,
  newResult: DashboardResult,
): Promise<SavedRoadmap> {
  const newKeys = extractItemKeys(newResult);
  const { data, error } = await sb.rpc('refresh_permit_roadmap', {
    p_roadmap_id: roadmapId,
    p_new_payload: newResult as any,
    p_new_item_keys: newKeys,
  });
  if (error) throw error;
  return data as SavedRoadmap;
}

// ---------------- Per-field merge (cross-device LWW per field) ----------------

const ITEM_FIELDS = [
  'status',
  'permit_number',
  'issuing_agency',
  'notes',
  'issue_date',
  'expires_on',
] as const;
type ItemField = (typeof ITEM_FIELDS)[number];

/**
 * Merge an item edit using per-field timestamps so two devices editing the same
 * roadmap don't clobber each other — each field independently keeps the most
 * recent client write.
 */
export async function mergeItemFields(
  roadmapId: string,
  itemKey: string,
  patch: Partial<Record<ItemField, string | null>>,
): Promise<PermitItem> {
  const ts = new Date().toISOString();
  const cleanPatch: Record<string, any> = {};
  const fieldTs: Record<string, string> = {};
  for (const f of ITEM_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, f)) {
      cleanPatch[f] = patch[f] ?? null;
      fieldTs[f] = ts;
    }
  }
  const { data, error } = await sb.rpc('merge_permit_item', {
    p_roadmap_id: roadmapId,
    p_item_key: itemKey,
    p_patch: cleanPatch,
    p_field_ts: fieldTs,
  });
  if (error) throw error;
  return data as PermitItem;
}

