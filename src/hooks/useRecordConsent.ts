/**
 * useRecordConsent — writes a consent row via the `record_user_consent` RPC.
 *
 * The RPC is SECURITY DEFINER and requires an authenticated caller. Consumers
 * MUST pass the exact wording the user saw and the document version being
 * accepted; the RPC will fail if either is missing.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ConsentTrigger, DocumentType } from '@/lib/legalDocuments';

export interface RecordConsentInput {
  documentType: DocumentType;
  documentVersion: string;
  trigger: ConsentTrigger;
  acceptanceText: string;
  relatedIds?: Record<string, string>;
  route?: string;
  locale?: string;
  applicationVersion?: string;
}

export function useRecordConsent() {
  return useMutation<string, Error, RecordConsentInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.rpc('record_user_consent', {
        _document_type: input.documentType,
        _document_version: input.documentVersion,
        _trigger_action: input.trigger,
        _acceptance_text: input.acceptanceText,
        _related_ids: input.relatedIds ?? {},
        _route: input.route ?? (typeof window !== 'undefined' ? window.location.pathname : null),
        _ip: null, // client cannot supply a trusted IP; edge functions may.
        _user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        _locale: input.locale ?? (typeof navigator !== 'undefined' ? navigator.language : null),
        _application_version: input.applicationVersion ?? null,
      });
      if (error) throw error;
      return data as string;
    },
  });
}
