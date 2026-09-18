import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Transaction documents for one order or booking.
 *
 * The card is not a static preview: on open it asks the backend to prepare the
 * documents that belong to this stage of the transaction, then hands each
 * signer a real, short-lived SignNow signing session. Lifecycle rules live on
 * the server — anything not yet due comes back as a skip reason, never as an
 * error. Signing records the agreement; it never moves money.
 */
export type DocumentScope = { booking_id: string } | { transaction_id: string };

export type DocumentKind =
  | 'purchase_sale_agreement'
  | 'sale_handoff'
  | 'rental_agreement'
  | 'rental_checkin'
  | 'rental_checkout';

export interface DocumentSigner {
  role: string;
  user_id: string | null;
  email: string;
  first_name?: string;
  last_name?: string;
  signed_at?: string | null;
}

export interface DocumentRow {
  id: string;
  document_type: string;
  status: 'draft' | 'sent' | 'partially_signed' | 'completed' | 'voided';
  signers: DocumentSigner[];
  signed_pdf_path: string | null;
  created_at: string;
  template_version: string | null;
  agreement_version: string | null;
  superseded_by_document_id: string | null;
}

const SALE_KINDS: DocumentKind[] = ['purchase_sale_agreement', 'sale_handoff'];
const RENTAL_KINDS: DocumentKind[] = ['rental_agreement', 'rental_checkin', 'rental_checkout'];

/** Plain-language reasons a document is not available yet. */
const SKIP_COPY: Record<string, string> = {
  not_payment_authorized: 'Documents are prepared once payment is authorized.',
  booking_not_binding: 'Documents are prepared once the booking is confirmed.',
  rental_period_not_started: 'The check-out condition report is prepared at the end of the rental.',
  missing_party_email: 'A document can’t be prepared until both parties have an email on file.',
  signnow_not_configured: 'Document signing is temporarily unavailable. Vendibook Support can help.',
  template_not_configured: 'This document is still being prepared. Check back shortly.',
};

export function useTransactionDocuments(scope: DocumentScope) {
  const scopeKey = JSON.stringify(scope);
  const kinds = useMemo(() => ('booking_id' in scope ? RENTAL_KINDS : SALE_KINDS), [scopeKey]);

  const [docs, setDocs] = useState<DocumentRow[] | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const preparedFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    const query = supabase
      .from('documents')
      .select('id,document_type,status,signers,signed_pdf_path,created_at,template_version,agreement_version,superseded_by_document_id')
      .order('created_at', { ascending: false });
    const { data, error } = 'booking_id' in scope
      ? await query.eq('booking_id', (scope as any).booking_id)
      : await query.eq('transaction_id', (scope as any).transaction_id);
    if (error) { console.error('[documents] load failed', error.message); return []; }
    const rows = (data ?? []) as unknown as DocumentRow[];
    setDocs(rows);
    return rows;
  }, [scopeKey]);

  /** Ask the backend to prepare every document due at this stage. */
  const prepare = useCallback(async () => {
    setPreparing(true);
    const skips: string[] = [];
    try {
      for (const kind of kinds) {
        try {
          const { data, error } = await supabase.functions.invoke('signnow-ensure-document', {
            body: { kind, ...scope },
          });
          if (error) continue; // not a participant, or a transient backend error
          const skipped = (data as any)?.skipped;
          if (typeof skipped === 'string' && SKIP_COPY[skipped]) skips.push(SKIP_COPY[skipped]);
        } catch {
          // A single document failing must never break the card.
        }
      }
      const rows = await load();
      setNotice(rows.length ? null : (skips[0] ?? null));
    } finally {
      setPreparing(false);
    }
  }, [kinds, scopeKey, load]);

  /**
   * Prepare one specific document on demand (handoff, check-in, check-out).
   * Returns a plain-language reason when the stage is not due yet.
   */
  const prepareKind = useCallback(async (kind: DocumentKind): Promise<string | null> => {
    setPreparing(true);
    try {
      const { data, error } = await supabase.functions.invoke('signnow-ensure-document', {
        body: { kind, ...scope },
      });
      if (error) return 'We could not prepare that document right now. Please try again.';
      const skipped = (data as any)?.skipped;
      await load();
      if (typeof skipped === 'string') return SKIP_COPY[skipped] ?? 'This document is not due yet.';
      return null;
    } catch {
      return 'We could not prepare that document right now. Please try again.';
    } finally {
      setPreparing(false);
    }
  }, [scopeKey, load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await load();
      if (cancelled || preparedFor.current === scopeKey) return;
      preparedFor.current = scopeKey;
      // Documents already exist for every kind that can exist right now? Still
      // ask: later stages (handoff, check-in, check-out) become due over time.
      await prepare();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  /** Reload a few times after a signing session so webhook updates show up. */
  const refreshAfterSigning = useCallback(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((r) => setTimeout(r, attempt === 0 ? 1500 : 4000));
      const rows = await load();
      if (rows.some((d) => d.status === 'completed' || d.status === 'partially_signed')) break;
    }
  }, [load]);

  return { docs, preparing, notice, kinds, reload: load, prepare, prepareKind, refreshAfterSigning };
}

/** Short-lived embedded signing URL for the current user on one document. */
export async function createSigningSession(documentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('signnow-create-embedded-session', {
    body: { document_id: documentId },
  });
  if (error) throw new Error(error.message || 'Could not open the signing session');
  const url = (data as any)?.url;
  if (!url) throw new Error('Could not open the signing session');
  return String(url);
}

/** Private, expiring link to the completed PDF. */
export async function getSignedPdfUrl(documentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('signnow-download-signed', {
    body: { document_id: documentId },
  });
  if (error) throw new Error(error.message || 'Could not open the signed PDF');
  const url = (data as any)?.url;
  if (!url) throw new Error('Could not open the signed PDF');
  return String(url);
}
