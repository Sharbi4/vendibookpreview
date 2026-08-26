/**
 * Vendi lifecycle telemetry.
 *
 * Structured, low-cardinality events for supportability. Deliberately never
 * records listing prose (title, description), seller-entered free text, or the
 * raw session key — only a short irreversible fingerprint of it for
 * correlation.
 */
import { supabase } from '@/integrations/supabase/client';

export type VendiEvent =
  | 'vendi_started'
  | 'vendi_session_started'
  | 'vendi_session_resumed'
  | 'vendi_resume_offered'
  | 'vendi_resume_choice_shown'
  | 'vendi_start_new_chosen'
  | 'vendi_session_retired'
  | 'vendi_bulk_input_used'
  | 'vendi_import_used'
  | 'vendi_field_captured'
  | 'vendi_field_corrected'
  | 'vendi_question_shown'
  | 'vendi_ready_to_publish'
  | 'vendi_draft_created'
  | 'vendi_draft_create_resumed'
  | 'vendi_save_failed'
  | 'vendi_media_failed'
  | 'vendi_media_upload_failed'
  | 'vendi_publish_attempt'
  | 'vendi_publish_failed'
  | 'vendi_published';


/** Non-reversible short fingerprint so events can be correlated without the key. */
export const sessionFingerprint = (key: string): string => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36).slice(0, 8);
};

export function trackVendi(
  event: VendiEvent,
  params: {
    userId?: string | null;
    listingId?: string | null;
    sessionKey?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
  } = {},
): void {
  const metadata: Record<string, unknown> = { ...(params.metadata ?? {}) };
  if (params.sessionKey) metadata.session_ref = sessionFingerprint(params.sessionKey);

  void supabase
    .from('analytics_events')
    .insert({
      event_name: event,
      event_category: 'Supply',
      user_id: params.userId ?? null,
      listing_id: params.listingId ?? null,
      metadata,
    } as never)
    .then(() => undefined, () => undefined);
}
