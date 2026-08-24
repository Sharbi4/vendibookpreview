// Thin proxy: routes booking confirmation emails through the Lovable Emails
// queue (send-transactional-email) so they get suppression checks, retries,
// unsubscribe footers, and email_send_log tracking.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

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
    let termsSnapshot: any = null;
    let termsVersion = 'v1';
    try {
      const { data: termsRow } = await supabase
        .from('transaction_terms')
        .select('snapshot, terms_version')
        .eq('booking_id', b.bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (termsRow) {
        termsSnapshot = (termsRow as any).snapshot;
        termsVersion = (termsRow as any).terms_version || 'v1';
      }
    } catch (e) {
      console.warn('[send-booking-confirmation] terms lookup failed', e);
    }

    // The email is state-aware: payment is captured, but the booking may still
    // be awaiting host approval. Read the live status rather than assuming.
    let bookingStatus: string | null = b.bookingStatus ?? null;
    let isInstantBook = false;
    try {
      const { data: bookingRow } = await supabase
        .from('booking_requests')
        .select('status, is_instant_book')
        .eq('id', b.bookingId)
        .maybeSingle();
      if (bookingRow) {
        bookingStatus = bookingStatus ?? (bookingRow as any).status ?? null;
        isInstantBook = Boolean((bookingRow as any).is_instant_book);
      }
    } catch (e) {
      console.warn('[send-booking-confirmation] status lookup failed', e);
    }

    const templateData = {
      guestName: b.fullName?.split(' ')[0] || b.fullName,
      listingTitle: b.listingTitle,
      startDate: fmtDate(b.startDate),
      endDate: fmtDate(b.endDate),
      totalPrice: fmtMoney(b.totalPrice),
      orderNumber: `VB-${String(b.bookingId).slice(0, 8).toUpperCase()}`,
      hostName: b.hostName,
      bookingId: b.bookingId,
      bookingStatus,
      isInstantBook,
      fulfillmentType: b.fulfillmentType,
      address: b.address,
      deliveryAddress: b.deliveryAddress,
      depositAmount: b.depositAmount ? fmtMoney(b.depositAmount) : undefined,
      termsSnapshot,
      termsVersion,
    };

    const { error } = await invokeTransactionalEmail({
        templateName: 'booking-confirmation',
        recipientEmail: b.email,
        idempotencyKey: `booking-confirm-${b.bookingId}`,
        templateData,
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, termsIncluded: Boolean(termsSnapshot) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-booking-confirmation]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
