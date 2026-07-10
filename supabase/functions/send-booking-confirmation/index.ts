// Thin proxy: routes booking confirmation emails through the Lovable Emails
// queue (send-transactional-email) so they get suppression checks, retries,
// unsubscribe footers, and email_send_log tracking.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function fmtMoney(n?: number) {
  if (n == null || isNaN(Number(n))) return '';
  return `$${Number(n).toFixed(2)}`;
}
function fmtDate(d?: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Render the "What you agreed to" block from a persisted transaction_terms
 * snapshot. Mirrors renderTermsEmailBlock in src/lib/transactionTerms.ts.
 */
function renderTermsBlock(snap: any, version: string) {
  if (!snap || !Array.isArray(snap?.pricing?.lines)) return '';
  const money = (c: number) => `$${(Number(c || 0) / 100).toFixed(2)}`;
  const rows = snap.pricing.lines
    .map((l: any) => {
      const bold = l.kind === 'total' ? 600 : 400;
      const color = l.kind === 'total' ? '#111827' : '#374151';
      return `<tr><td style="padding:4px 0;color:#374151;">${esc(String(l.label ?? ''))}</td>` +
        `<td style="padding:4px 0;text-align:right;color:${color};font-weight:${bold};">${money(Number(l.amountCents || 0))}</td></tr>`;
    })
    .join('');
  const acks = Array.isArray(snap.policies?.acknowledgements)
    ? snap.policies.acknowledgements.map((a: string) => `<li style="margin:4px 0;">${esc(String(a))}</li>`).join('')
    : '';
  return `
<div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0;background:#ffffff;">
  <div style="font-weight:600;color:#111827;margin-bottom:8px;">What you agreed to</div>
  <table style="width:100%;font-size:14px;border-collapse:collapse;">${rows}</table>
  <div style="font-size:13px;color:#374151;margin-top:12px;">
    <div style="font-weight:600;margin-bottom:4px;">Cancellation policy</div>
    <div>${esc(String(snap.policies?.cancellation ?? ''))}</div>
  </div>
  ${acks ? `<ul style="font-size:13px;color:#374151;margin-top:12px;padding-left:18px;">${acks}</ul>` : ''}
  <div style="font-size:12px;color:#6b7280;margin-top:12px;">Terms version ${esc(String(version || 'v1'))}</div>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (!b?.email || !b?.bookingId) {
      return new Response(JSON.stringify({ error: 'email and bookingId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the most recent transaction_terms snapshot for this booking.
    // If we can find one, embed the exact numbers/policies in the email so
    // the buyer sees the same record they agreed to.
    let termsBlockHtml = '';
    try {
      const { data: termsRow } = await supabase
        .from('transaction_terms')
        .select('snapshot, terms_version')
        .eq('booking_id', b.bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (termsRow) {
        termsBlockHtml = renderTermsBlock((termsRow as any).snapshot, (termsRow as any).terms_version);
      }
    } catch (e) {
      console.warn('[send-booking-confirmation] terms lookup failed', e);
    }

    const templateData = {
      guestName: b.fullName?.split(' ')[0] || b.fullName,
      listingTitle: b.listingTitle,
      startDate: fmtDate(b.startDate),
      endDate: fmtDate(b.endDate),
      totalPrice: fmtMoney(b.totalPrice),
      orderNumber: `VB-${String(b.bookingId).slice(0, 8).toUpperCase()}`,
      hostName: b.hostName,
      fulfillmentType: b.fulfillmentType,
      address: b.address,
      deliveryAddress: b.deliveryAddress,
      depositAmount: b.depositAmount ? fmtMoney(b.depositAmount) : undefined,
      termsBlockHtml,
    };

    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'booking-confirmation',
        recipientEmail: b.email,
        idempotencyKey: `booking-confirm-${b.bookingId}`,
        templateData,
      },
    });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, termsIncluded: Boolean(termsBlockHtml) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-booking-confirmation]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
