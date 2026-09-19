// Safety net: make sure every paid sale and every binding booking actually has
// its agreement out for signature, even when the browser-side trigger never
// fired (tab closed, network drop, host approved from a flaky connection).
//
// Purely idempotent: it only calls the same ensure* helpers used elsewhere,
// which no-op when a live document already exists or the record is not yet
// eligible. It never moves money and never changes payout state.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders, jsonResponse, unknownErrorResponse } from '../_shared/jsonError.ts';
import {
  ensurePurchaseSaleAgreement,
  ensureRentalAgreement,
} from '../_shared/signnowDocuments.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

    console.log('[signnow-agreement-sweep]', {
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
    });
  } catch (e) {
    console.error('[signnow-agreement-sweep]', e);
    return unknownErrorResponse(e);
  }
});
