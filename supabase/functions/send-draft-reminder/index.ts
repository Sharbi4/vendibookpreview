import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[DRAFT-REMINDER] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    logStep("Function started");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30-day recovery window

    const { data: draftListings, error: queryError } = await supabaseClient
      .from('listings')
      .select('id, title, host_id, created_at, category, image_urls')
      .eq('status', 'draft')
      .lt('created_at', twentyFourHoursAgo)
      .gt('created_at', sevenDaysAgo);

    if (queryError) throw new Error(`Database query error: ${queryError.message}`);
    if (!draftListings?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const hostIds = [...new Set(draftListings.map(l => l.host_id).filter((id): id is string => id !== null))];
    if (!hostIds.length) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const { data: hosts, error: hostsError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name, draft_nudge_sent_at')
      .in('id', hostIds)
      .or(`draft_nudge_sent_at.is.null,draft_nudge_sent_at.lt.${twentyFourHoursAgo}`);

    if (hostsError) throw new Error(`Failed to fetch hosts: ${hostsError.message}`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const host of hosts || []) {
      if (!host.email) continue;
      const hostDrafts = draftListings.filter(l => l.host_id === host.id);
      const mostRecentDraft = hostDrafts[0];
      const firstName = host.full_name?.split(' ')[0] || 'there';

      try {
        const { error: emailError } = await supabaseClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "listing-draft-nudge",
            recipientEmail: host.email,
            idempotencyKey: `draft-reminder-${host.id}-${new Date().toISOString().slice(0,10)}`,
            templateData: {
              name: firstName,
              category: mostRecentDraft?.category || 'Food Trailer',
              photoCount: mostRecentDraft?.image_urls?.length || 0,
              listingId: mostRecentDraft?.id,
              lastStep: 'getting started',
            },
          },
        });
        if (emailError) {
          errors.push(`Host ${host.id}: ${emailError.message}`);
          continue;
        }
        await supabaseClient.from('profiles')
          .update({ draft_nudge_sent_at: new Date().toISOString() })
          .eq('id', host.id);
        sentCount++;
      } catch (e: any) {
        errors.push(`Host ${host.id}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount, total: hosts?.length ?? 0, errors: errors.length ? errors : undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
