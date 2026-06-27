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
  uploaded_at: string;
}

export const PERMIT_DOC_BUCKET = 'permit-documents';
export const PERMIT_DOC_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const PERMIT_DOC_ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
];

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

export async function saveRoadmap(userId: string, result: DashboardResult): Promise<SavedRoadmap> {
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
    label: defaultRoadmapLabel(result),
    result_payload: result as any,
  };
  const { data, error } = await sb
    .from('saved_permit_roadmaps')
    .upsert(payload, { onConflict: 'user_id,roadmap_key' })
    .select('*')
    .single();
  if (error) throw error;
  return data as SavedRoadmap;
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
