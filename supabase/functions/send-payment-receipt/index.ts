// Thin proxy: routes payment receipts through Lovable Emails queue.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCaller, isAdminUser, unauthorizedResponse, forbiddenResponse } from "../_shared/callerGuard.ts";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function fmtMoney(n?: number) {
  if (n == null || isNaN(Number(n))) return '';
  return `$${Number(n).toFixed(2)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const d = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (!d?.transactionId) {
      return new Response(JSON.stringify({ error: 'transactionId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const caller = await getCaller(req);
    if (!caller?.email) return unauthorizedResponse(corsHeaders);
    const ref = String(d.transactionId);
    const isUuid = /^[0-9a-f-]{36}$/i.test(ref);
    const { data: record } = await supabase.from('payment_records')
      .select('buyer_id, reference, sale_transaction_id, booking_request_id, listing_id, gross_amount_cents, captured_amount_cents, payment_status')
      .or(isUuid ? `sale_transaction_id.eq.${ref},reference.eq.${ref}` : `reference.eq.${ref.replace(/[^A-Za-z0-9_-]/g, '')}`)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!record || record.payment_status !== 'completed') {
      return new Response(JSON.stringify({ error: 'Receipt not available yet.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (record.buyer_id !== caller.id && !(await isAdminUser(caller.id))) return forbiddenResponse(corsHeaders);
    const { data: listingRow } = record.listing_id
      ? await supabase.from('listings').select('title').eq('id', record.listing_id).maybeSingle()
      : { data: null };
    // Receipts always go to the signed-in buyer, with amounts from our records.
    d.email = caller.email;
    d.amount = (record.captured_amount_cents || record.gross_amount_cents || 0) / 100;
    d.listingTitle = listingRow?.title ?? d.listingTitle;
    d.transactionType = record.booking_request_id ? 'rental' : 'sale';

    const templateData = {
      customerName: d.fullName?.split(' ')[0] || d.fullName,
      orderNumber: `VB-${String(d.transactionId).slice(0, 8).toUpperCase()}`,
      amount: fmtMoney(d.amount),
      paymentMethod: d.paymentMethod || 'Card',
      paidAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      listingTitle: d.listingTitle || d.itemName,
      description: d.transactionType === 'rental'
        ? `Rental${d.startDate ? ` (${d.startDate} → ${d.endDate})` : ''}`
        : 'Purchase',
    };

    const { error } = await invokeTransactionalEmail({
        templateName: 'payment-receipt',
        recipientEmail: d.email,
        idempotencyKey: `receipt-${d.transactionId}`,
        templateData,
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-payment-receipt]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
