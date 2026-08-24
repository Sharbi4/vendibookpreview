import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingRequests, error: queryError } = await supabaseClient
      .from('booking_requests')
      .select(`id, created_at, start_date, end_date, total_price, host_id, host_nudge_sent_at, listing:listings(title)`)
      .eq('status', 'pending')
      .lt('created_at', sixtyMinutesAgo)
      .gt('created_at', twentyFourHoursAgo)
      .or(`host_nudge_sent_at.is.null,host_nudge_sent_at.lt.${sixtyMinutesAgo}`);

    if (queryError) throw new Error(`Database query error: ${queryError.message}`);
    if (!pendingRequests?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const requestsByHost = new Map<string, typeof pendingRequests>();
    for (const r of pendingRequests) {
      const arr = requestsByHost.get(r.host_id) || [];
      arr.push(r);
      requestsByHost.set(r.host_id, arr);
    }

    const hostIds = [...requestsByHost.keys()];
    const { data: hosts, error: hostsError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name')
      .in('id', hostIds);

    if (hostsError) throw new Error(`Failed to fetch hosts: ${hostsError.message}`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const host of hosts || []) {
      if (!host.email) continue;
      const hostRequests = requestsByHost.get(host.id) || [];
      const firstName = host.full_name?.split(' ')[0] || 'there';
      const firstReq = hostRequests[0] as any;
      const listingTitle = firstReq?.listing?.title || 'Your listing';

      try {
        const { error: emailError } = await invokeTransactionalEmail({
            templateName: "booking-request-host",
            recipientEmail: host.email,
            idempotencyKey: `pending-reminder-${host.id}-${new Date().toISOString().slice(0,13)}`,
            templateData: {
              name: firstName,
              listingTitle,
              pendingCount: hostRequests.length,
              startDate: firstReq?.start_date,
              endDate: firstReq?.end_date,
              totalPrice: firstReq?.total_price,
            },
          });
        if (emailError) {
          errors.push(`Host ${host.id}: ${emailError.message}`);
          continue;
        }
        const nowIso = new Date().toISOString();
        for (const r of hostRequests) {
          await supabaseClient.from('booking_requests')
            .update({ host_nudge_sent_at: nowIso })
            .eq('id', r.id);
        }
        sentCount++;
      } catch (e: any) {
        errors.push(`Host ${host.id}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount, errors: errors.length ? errors : undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
