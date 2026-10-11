import { supabase } from '@/integrations/supabase/client';

/** Server-owned lifecycle of a Listing Concierge order. */
export type ConciergeStatus =
  | 'payment_required'
  | 'intake_not_started'
  | 'intake_in_progress'
  | 'information_needed'
  | 'listing_being_created'
  | 'ready_for_seller_review'
  | 'revision_requested'
  | 'approved_for_publication'
  | 'published'
  | 'canceled'
  | 'refunded';

export interface ConciergeConfig {
  is_available: boolean;
  price_cents: number;
  currency: string;
  turnaround_business_days: number;
  included_revisions: number;
  specialist_contact_enabled: boolean;
  terms_version: string;
  copy?: Record<string, unknown>;
}

export interface ConciergeOrder {
  id: string;
  user_id: string;
  listing_id: string | null;
  price_cents: number;
  currency: string;
  status: ConciergeStatus;
  payment_status: string;
  refund_status: string | null;
  intake: Record<string, unknown>;
  intake_version: number;
  intake_submitted_at: string | null;
  uploads: ConciergeUpload[];
  specialist_contact_requested: boolean;
  contact_method: string | null;
  contact_availability: string | null;
  revisions_included: number;
  revision_count: number;
  reviewer_completed_at: string | null;
  draft_delivered_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
}

export interface ConciergeUpload {
  path: string;
  name: string;
  size?: number;
  kind?: 'photo' | 'video' | 'document';
}

export interface ConciergeMessage {
  id: string;
  author_role: string;
  kind: string;
  body: string;
  created_at: string;
}

export interface ConciergeEvent {
  id: string;
  code: string;
  from_status: ConciergeStatus | null;
  to_status: ConciergeStatus | null;
  created_at: string;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('concierge-order', { body });
  if (error) {
    const message = (data as { error?: string } | null)?.error ?? error.message;
    throw new Error(message || 'Something went wrong. Please try again.');
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

/** Public config read — the same row the server prices from. */
export async function fetchConciergeConfig(): Promise<ConciergeConfig | null> {
  const { data } = await (supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: boolean) => { maybeSingle: () => Promise<{ data: ConciergeConfig | null }> };
      };
    };
  })
    .from('listing_concierge_config')
    .select('*')
    .eq('id', true)
    .maybeSingle();
  return data ?? null;
}

export const createConciergeOrder = (idempotencyKey: string) =>
  call<{ order: ConciergeOrder; reused?: boolean }>({
    action: 'create',
    agreement_accepted: true,
    idempotency_key: idempotencyKey,
  });

export const getConciergeOrder = (orderId: string) =>
  call<{
    order: ConciergeOrder;
    config: ConciergeConfig;
    messages: ConciergeMessage[];
    events: ConciergeEvent[];
    human_reviewed: boolean;
  }>({ action: 'get', order_id: orderId });

export const saveConciergeIntake = (
  orderId: string,
  payload: {
    intake: Record<string, unknown>;
    uploads?: ConciergeUpload[];
    contact_method?: string;
    contact_availability?: string;
    specialist_contact_requested?: boolean;
  },
) => call<{ order: ConciergeOrder }>({ action: 'save_intake', order_id: orderId, ...payload });

export const submitConciergeIntake = (orderId: string) =>
  call<{ order: ConciergeOrder }>({ action: 'submit_intake', order_id: orderId });

export const answerConciergeQuestion = (orderId: string, body: string) =>
  call<{ order: ConciergeOrder }>({ action: 'answer', order_id: orderId, body });

export const requestConciergeRevision = (orderId: string, body: string) =>
  call<{ order: ConciergeOrder }>({ action: 'request_revision', order_id: orderId, body });

export const approveConciergePublication = (orderId: string) =>
  call<{ order: ConciergeOrder; listing_id: string }>({
    action: 'approve_publish',
    order_id: orderId,
    agreements: [
      'ownership_authority',
      'accuracy',
      'condition',
      'marketplace_rules',
      'electronic_consent',
    ],
  });

/** Uploads an intake file to the private concierge bucket. */
export async function uploadConciergeFile(
  orderId: string,
  userId: string,
  file: File,
): Promise<ConciergeUpload> {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
  const path = `${userId}/${orderId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from('concierge-uploads').upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  const kind: ConciergeUpload['kind'] = file.type.startsWith('image/')
    ? 'photo'
    : file.type.startsWith('video/')
      ? 'video'
      : 'document';
  return { path, name: file.name.slice(0, 120), size: file.size, kind };
}

export const CONCIERGE_STATUS_COPY: Record<ConciergeStatus, { label: string; next: string }> = {
  payment_required: { label: 'Payment required', next: 'Complete payment to start your order.' },
  intake_not_started: { label: 'Ready for your details', next: 'Tell us about your equipment.' },
  intake_in_progress: { label: 'Details in progress', next: 'Finish and submit your intake.' },
  information_needed: { label: 'We need more information', next: 'Answer our question to continue.' },
  listing_being_created: { label: 'Your listing is being created', next: 'Nothing needed from you right now.' },
  ready_for_seller_review: { label: 'Ready for your review', next: 'Review the draft and approve or request a revision.' },
  revision_requested: { label: 'Revision in progress', next: 'We are making your requested changes.' },
  approved_for_publication: { label: 'Approved', next: 'Finishing publication.' },
  published: { label: 'Published', next: 'Your listing is live.' },
  canceled: { label: 'Canceled', next: 'This order is closed.' },
  refunded: { label: 'Refunded', next: 'This order was refunded.' },
};
