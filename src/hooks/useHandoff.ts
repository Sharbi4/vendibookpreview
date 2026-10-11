import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type HandoffMode =
  | 'vendibook_freight'
  | 'seller_delivery'
  | 'third_party_driver'
  | 'buyer_pickup';

export interface FulfillmentSession {
  id: string;
  mode: HandoffMode;
  status: string;
  driver_name: string | null;
  driver_email: string | null;
  driver_phone: string | null;
  location_consent: boolean;
  started_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  // Live delivery tracking
  tracking_active?: boolean;
  tracking_paused?: boolean;
  assigned_driver_user_id?: string | null;
  tracking_started_at?: string | null;
  tracking_ended_at?: string | null;
  delivered_at?: string | null;
  last_latitude?: number | string | null;
  last_longitude?: number | string | null;
  last_accuracy_m?: number | string | null;
  last_location_at?: string | null;
  destination_label?: string | null;
  destination_latitude?: number | string | null;
  destination_longitude?: number | string | null;
  route_distance_meters?: number | null;
  route_duration_seconds?: number | null;
  route_polyline?: string | null;
  route_provider?: string | null;
  route_updated_at?: string | null;
}


export interface HandoffSession {
  id: string;
  fulfillment_session_id: string | null;
  sale_transaction_id: string | null;
  booking_id: string | null;
  listing_id: string | null;
  seller_id: string;
  buyer_id: string | null;
  mode: HandoffMode;
  status: string;
  pickup_code: string | null;
  pickup_code_verified_at: string | null;
  recording_consent_seller_at: string | null;
  recording_consent_buyer_at: string | null;
  walkthrough_completed_at: string | null;
  buyer_decision: 'accepted' | 'accepted_with_exceptions' | 'issue_reported' | null;
  buyer_decision_at: string | null;
  buyer_decision_notes: string | null;
  completed_at: string | null;
  finalized: boolean;
  started_at: string;
}

export interface HandoffMedia {
  id: string;
  handoff_session_id: string;
  storage_bucket: string;
  storage_path: string;
  media_type: 'video' | 'photo' | 'document';
  kind: string;
  duration_seconds: number | null;
  created_at: string;
}

export interface HandoffException {
  id: string;
  handoff_session_id: string;
  description: string;
  severity: string;
  created_at: string;
}

export interface HandoffSignature {
  id: string;
  handoff_session_id: string;
  provider: string;
  envelope_id: string | null;
  status: string;
  acknowledgment_type: string | null;
  signed_at: string | null;
  last_error: string | null;
}

export interface TrackingEvent {
  id: string;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
  description: string | null;
  estimated_delivery_at: string | null;
  event_at: string;
  paypal_sync_status: string;
  paypal_sync_error: string | null;
  paypal_debug_id: string | null;
}

export interface EvidenceEvent {
  id: string;
  event_type: string;
  title: string;
  detail: string | null;
  actor_role: string | null;
  status: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
}

export interface HandoffContext {
  success: boolean;
  target: {
    sale_transaction_id: string | null;
    booking_id: string | null;
    listing_id: string | null;
    seller_id: string | null;
    buyer_id: string | null;
    fulfillment_type: string | null;
  };
  viewer_role: 'buyer' | 'seller' | 'admin';
  fulfillment_sessions: FulfillmentSession[];
  handoff_sessions: HandoffSession[];
  media: HandoffMedia[];
  exceptions: HandoffException[];
  signatures: HandoffSignature[];
  tracking: TrackingEvent[];
  evidence: EvidenceEvent[];
  signnow_configured: boolean;
}

export async function handoffOps<T = any>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('handoff-ops', { body: payload });
  if (error) {
    // Surface the server's human message when present rather than a raw 4xx.
    const ctx = (error as any)?.context;
    let message = error.message;
    try {
      const parsed = ctx && typeof ctx.json === 'function' ? await ctx.json() : null;
      if (parsed?.message || parsed?.error) message = parsed.message ?? parsed.error;
    } catch {
      /* keep the original message */
    }
    throw new Error(message);
  }
  if ((data as any)?.success === false && (data as any)?.error) {
    throw new Error(String((data as any).error));
  }
  return data as T;
}

export function useHandoffContext(saleId?: string | null, bookingId?: string | null) {
  const queryClient = useQueryClient();
  const key = ['handoff-context', saleId ?? null, bookingId ?? null];

  const query = useQuery({
    queryKey: key,
    enabled: !!(saleId || bookingId),
    queryFn: () =>
      handoffOps<HandoffContext>({
        action: 'get_context',
        sale_transaction_id: saleId ?? null,
        booking_id: bookingId ?? null,
      }),
    retry: false,
    staleTime: 15_000,
  });

  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: key }), [queryClient, saleId, bookingId]);

  return { ...query, refresh };
}

export async function signedEvidenceUrl(path: string, bucket = 'handoff-evidence') {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
