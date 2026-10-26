// Safety net: make sure every paid sale and every binding booking actually has
// its agreement out for signature, even when the browser-side trigger never
// fired (tab closed, network drop, host approved from a flaky connection).
//
// Purely idempotent: it only calls the same ensure* helpers used elsewhere,
// which no-op when a live document already exists or the record is not yet
// eligible. It never moves money and never changes payout state.
//
// It also catches signatures whose SignNow webhook never arrived (failed
// subscription, missed delivery): open documents are checked against SignNow,
// and any signing progress is replayed through signnow-webhook itself so the
// same status, PDF and release logic runs exactly once per signing step.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import {
  ensurePurchaseSaleAgreement,
  ensureRentalAgreement,
} from '../_shared/signnowDocuments.ts';
import { isAdminOrBackendCaller, forbiddenResponse } from "../_shared/callerGuard.ts";
import { getDocument } from '../_shared/signnow.ts';

const SALE_STATUSES = ['paid', 'buyer_confirmed', 'seller_confirmed', 'completed'];
const BOOKING_STATUSES = ['approved', 'completed'];
/** Only look back far enough to catch recent misses; keeps each run cheap. */
const LOOKBACK_DAYS = 30;
const MAX_PER_RUN = 50;

function svc() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

/** Open agreements older than this are checked against SignNow directly. */
const SYNC_AFTER_MINUTES = 30;

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function syncMissedSignatures(supabase: ReturnType<typeof svc>) {
  const secret = Deno.env.get('SIGNNOW_WEBHOOK_SECRET');
  if (!secret) return [];
  const { data: open } = await supabase
    .from('documents')
    .select('id,signnow_document_id,status')
    .in('status', ['sent', 'partially_signed'])
    .is('superseded_by_document_id', null)
    .lt('updated_at', new Date(Date.now() - SYNC_AFTER_MINUTES * 60_000).toISOString())
    .gte('created_at', new Date(Date.now() - 2 * LOOKBACK_DAYS * 86_400_000).toISOString())
    .order('updated_at', { ascending: true })
    .limit(MAX_PER_RUN);

  const synced: Record<string, unknown>[] = [];
  for (const doc of open ?? []) {
    if (!doc.signnow_document_id) continue;
    try {
      const remote = await getDocument(doc.signnow_document_id);
      const invites: any[] = remote?.field_invites ?? [];
      const fulfilled = invites.filter((i) => String(i.status ?? '').toLowerCase() === 'fulfilled').length;
      const allSigned = invites.length > 0 && fulfilled === invites.length;
      const behind = (doc.status === 'sent' && fulfilled > 0) || (allSigned && doc.status !== 'completed');
      if (!behind) continue;
      // One event id per signing step keeps replays idempotent in signnow_webhook_events.
      const body = JSON.stringify({
        event_id: `sweep-sync:${doc.signnow_document_id}:${fulfilled}`,
        event: 'document.sync',
        meta: { document_id: doc.signnow_document_id },
      });
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/signnow-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-neap-signature': await hmacHex(secret, body) },
        body,
      });
      synced.push({ document_id: doc.id, fulfilled, of: invites.length, webhook_status: res.status });
    } catch (e) {
      console.error('[signnow-agreement-sweep] sync failed', doc.id, (e as Error).message);
    }
  }
  return synced;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!(await isAdminOrBackendCaller(req))) return forbiddenResponse();

  try {
    const supabase = svc();
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();

    // Documents already live for these parents — anything voided or superseded
    // does not count, matching findLiveDocument().
    const { data: docs } = await supabase
      .from('documents')
      .select('transaction_id,booking_id,document_type')
      .in('document_type', [
        'purchase_sale_agreement',
        'bill_of_sale',
        'rental_agreement',
      ])
      .neq('status', 'voided')
      .is('superseded_by_document_id', null);

    const coveredSales = new Set(
      (docs ?? []).filter((d: any) => d.transaction_id).map((d: any) => d.transaction_id),
    );
    const coveredBookings = new Set(
      (docs ?? []).filter((d: any) => d.booking_id).map((d: any) => d.booking_id),
    );

    const { data: sales } = await supabase
      .from('sale_transactions')
      .select('id')
      .in('status', SALE_STATUSES)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500);

    const { data: bookings } = await supabase
      .from('booking_requests')
      .select('id')
      .in('status', BOOKING_STATUSES)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500);

    const saleTargets = (sales ?? [])
      .map((r: any) => r.id)
      .filter((id: string) => !coveredSales.has(id))
      .slice(0, MAX_PER_RUN);
    const bookingTargets = (bookings ?? [])
      .map((r: any) => r.id)
      .filter((id: string) => !coveredBookings.has(id))
      .slice(0, MAX_PER_RUN);

    const results: Record<string, unknown>[] = [];
    let created = 0;
    let skipped = 0;

    for (const id of saleTargets) {
      try {
        const res: any = await ensurePurchaseSaleAgreement(id);
        if (res.created) created++;
        else skipped++;
        results.push({ kind: 'purchase_sale_agreement', id, ...res });
      } catch (e) {
        skipped++;
        console.error('[signnow-agreement-sweep] sale failed', id, (e as Error).message);
      }
    }

    for (const id of bookingTargets) {
      try {
        const res: any = await ensureRentalAgreement(id);
        if (res.created) created++;
        else skipped++;
        results.push({ kind: 'rental_agreement', id, ...res });
      } catch (e) {
        skipped++;
        console.error('[signnow-agreement-sweep] booking failed', id, (e as Error).message);
      }
    }

    const synced = await syncMissedSignatures(supabase);

    console.log('[signnow-agreement-sweep]', {
      synced: synced.length,
      sales: saleTargets.length,
      bookings: bookingTargets.length,
      created,
      skipped,
    });

    return jsonResponse(200, {
      checked_sales: saleTargets.length,
      checked_bookings: bookingTargets.length,
      created,
      skipped,
      results,
      synced,
    });
  } catch (e) {
    console.error('[signnow-agreement-sweep]', e);
    return unknownErrorResponse(e);
  }
});
