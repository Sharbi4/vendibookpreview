// Thin proxy: routes refund notification emails through Lovable Emails queue.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { isAdminOrBackendCaller, forbiddenResponse } from "../_shared/callerGuard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!(await isAdminOrBackendCaller(req))) return forbiddenResponse();
  try {
    const b = await req.json();
    const bookingId = typeof b?.bookingId === 'string' ? b.bookingId.trim() : '';
    const recipientType = b?.recipientType === 'host' ? 'host' : 'shopper';
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
      return new Response(JSON.stringify({ error: 'bookingId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // The recipient is always the booking's own shopper or host, looked up
    // here — never an address taken from the request.
    const { data: booking } = await supabase
      .from('booking_requests')
      .select('id, shopper_id, host_id, listings(title)')
      .eq('id', bookingId)
      .maybeSingle();
    if (!booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const recipientId = recipientType === 'host' ? booking.host_id : booking.shopper_id;
    const { data: profile } = recipientId
      ? await supabase.from('profiles').select('email, full_name').eq('id', recipientId).maybeSingle()
      : { data: null };
    if (!profile?.email) {
      return new Response(JSON.stringify({ error: 'No email on file for this booking participant' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const fullName = profile.full_name || (recipientType === 'host' ? 'Host' : 'Valued Customer');
    const listingTitle = (booking as any).listings?.title || 'Booking';
    const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);

    const { error } = await invokeTransactionalEmail({
        templateName: 'refund-processed',
        recipientEmail: profile.email,
        idempotencyKey: `refund-${bookingId}-${recipientType}`,
        templateData: {
          recipientName: fullName.split(' ')[0] || fullName,
          listingTitle,
          refundAmount: Math.max(0, Number(b.refundAmount) || 0),
          reason: text(b.reason, 500),
          recipientType,
          initiatedBy: text(b.initiatedBy, 40),
          bookingId,
        },
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-refund-notification]', e);
    return new Response(JSON.stringify({ error: 'Refund notice could not be sent' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
