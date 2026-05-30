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
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-booking-confirmation]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
