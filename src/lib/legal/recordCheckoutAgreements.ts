import { supabase } from '@/integrations/supabase/client';
import { CURRENT_VERSIONS, DOCUMENT_TYPES, type DocumentType } from '@/lib/legalDocuments';
import {
  CHECKOUT_PRIVACY_ACCEPTANCE_TEXT,
  RENTAL_AGREEMENT_ACCEPTANCE_TEXT,
  SALE_AGREEMENT_ACCEPTANCE_TEXT,
} from '@/components/checkout/TransactionAgreementStep';

interface RecordArgs {
  mode: 'sale' | 'rental';
  trigger: string;
  relatedIds: Record<string, string | null | undefined>;
  /** Content hashes of the exact documents the user read, when known. */
  hashes?: { agreement?: string | null; privacy?: string | null };
}

const write = async (
  documentType: DocumentType,
  acceptanceText: string,
  { trigger, relatedIds, contentHash }:
    { trigger: string; relatedIds: RecordArgs['relatedIds']; contentHash?: string | null },
) => {
  const { error } = await supabase.rpc('record_user_consent', {
    _document_type: documentType,
    _document_version: CURRENT_VERSIONS[documentType],
    _trigger_action: trigger,
    _acceptance_text: acceptanceText,
    _related_ids: {
      ...Object.fromEntries(Object.entries(relatedIds).filter(([, v]) => Boolean(v))),
      ...(contentHash ? { content_hash: contentHash } : {}),
    },
    _route: window.location.pathname,
    _ip: null,
    _user_agent: navigator.userAgent,
    _locale: navigator.language,
    _application_version: null,
  });
  if (error) throw error;
};

/**
 * Persists both checkout consents server-side. Each row stores the document
 * type, the frozen version, the exact acceptance sentence, the transaction
 * context, the route, locale, and user agent. Append-only — never updated.
 */
export async function recordCheckoutAgreements({ mode, trigger, relatedIds, hashes }: RecordArgs) {
  const agreementType =
    mode === 'sale' ? DOCUMENT_TYPES.SALE_BUYER_TERMS : DOCUMENT_TYPES.RENTAL_TRANSACTION_TERMS;
  await write(
    agreementType,
    mode === 'sale' ? SALE_AGREEMENT_ACCEPTANCE_TEXT : RENTAL_AGREEMENT_ACCEPTANCE_TEXT,
    { trigger, relatedIds, contentHash: hashes?.agreement },
  );
  await write(
    DOCUMENT_TYPES.CHECKOUT_PRIVACY_ELECTRONIC_CONSENT,
    CHECKOUT_PRIVACY_ACCEPTANCE_TEXT,
    { trigger, relatedIds, contentHash: hashes?.privacy },
  );
}
