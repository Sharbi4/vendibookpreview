import { supabase } from '@/integrations/supabase/client';
import { recordLegalAcceptance, hasCurrentAcceptance } from '@/lib/legal/recordAcceptance';
import type { LegalDocumentSlug } from '@/lib/legal/versions';
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
 * The platform documents the server-side checkout gate (`paypal-create-order`,
 * `create-sale-intent`) checks in `legal_acceptances`. Ticking the checkout
 * agreement box must satisfy that gate, so we mirror the acceptance there in
 * addition to the versioned `user_consents` rows.
 */
const PLATFORM_SLUGS: LegalDocumentSlug[] = ['terms-of-service', 'payments-terms', 'privacy-policy'];

const mirrorPlatformAcceptance = async (
  mode: RecordArgs['mode'],
  relatedIds: RecordArgs['relatedIds'],
) => {
  const { data, error: authError } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (authError || !userId) throw new Error('Please sign in again before accepting the checkout agreements.');
  if (await hasCurrentAcceptance(userId, PLATFORM_SLUGS)) return;
  const { error } = await recordLegalAcceptance({
    userId,
    slugs: PLATFORM_SLUGS,
    surface: mode === 'sale' ? 'sale_checkout' : 'rental_checkout',
    relatedEntityType: 'listing',
    relatedEntityId: (relatedIds.listing_id as string | undefined) ?? null,
  });
  if (error) throw error;
};

/**
 * Persists both checkout consents server-side. Each row stores the document
 * type, the frozen version, the exact acceptance sentence, the transaction
 * context, the route, locale, and user agent. Append-only — never updated.
 */
export async function recordCheckoutAgreements({ mode, trigger, relatedIds, hashes }: RecordArgs) {
  await mirrorPlatformAcceptance(mode, relatedIds);
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
