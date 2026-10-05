import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import {
  DRAFT_MAX_AGE_MS,
  DRAFT_MIN_AGE_MS,
  draftFinishPath,
  isDueForNudge,
  isInternalEmail,
  isQaTitle,
} from '../_shared/draftReminderPolicy.ts'

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

    const now = Date.now();
    const newestAllowed = new Date(now - DRAFT_MIN_AGE_MS).toISOString();
    const oldestAllowed = new Date(now - DRAFT_MAX_AGE_MS).toISOString();

    // Newest first, so each host is nudged about their most recent draft.
    const { data: rawDrafts, error: queryError } = await supabaseClient
      .from('listings')
      .select('id, title, host_id, created_at, category, image_urls')
      .eq('status', 'draft')
      .is('deleted_at', null)
      .lt('created_at', newestAllowed)
      .gt('created_at', oldestAllowed)
      .order('created_at', { ascending: false });

    if (queryError) throw new Error(`Database query error: ${queryError.message}`);
    const draftListings = (rawDrafts ?? []).filter((l) => !isQaTitle(l.title));
    if (!draftListings.length) {
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

    const { data: allHosts, error: hostsError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name, draft_nudge_sent_at')
      .in('id', hostIds);

    if (hostsError) throw new Error(`Failed to fetch hosts: ${hostsError.message}`);

    const { data: adminRows } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .in('user_id', hostIds)
      .eq('role', 'admin');
    const adminIds = new Set((adminRows ?? []).map((r) => r.user_id));

    const hosts = (allHosts ?? []).filter((h) => {
      if (adminIds.has(h.id) || isInternalEmail(h.email)) return false;
      const newest = draftListings.find((l) => l.host_id === h.id);
      return !!newest && isDueForNudge(newest.created_at, h.draft_nudge_sent_at, now);
    });
    logStep("Eligible hosts", { drafts: draftListings.length, hosts: hosts.length });

    let sentCount = 0;
    const errors: string[] = [];

    for (const host of hosts || []) {
      if (!host.email) continue;
      const hostDrafts = draftListings.filter(l => l.host_id === host.id);
      const mostRecentDraft = hostDrafts[0];
      const firstName = host.full_name?.split(' ')[0] || 'there';

      try {
        const { error: emailError } = await invokeTransactionalEmail({
            templateName: "listing-draft-nudge",
            recipientEmail: host.email,
            idempotencyKey: `draft-reminder-${host.id}-${new Date().toISOString().slice(0,10)}`,
            templateData: {
              name: firstName,
              hostName: firstName === 'there' ? undefined : firstName,
              category: mostRecentDraft?.category || 'Food Trailer',
              photoCount: mostRecentDraft?.image_urls?.length || 0,
              listingId: mostRecentDraft?.id,
              listingTitle: mostRecentDraft?.title || undefined,
              finishPath: mostRecentDraft
                ? draftFinishPath(mostRecentDraft.id, mostRecentDraft.image_urls?.length || 0)
                : undefined,
              lastStep: 'getting started',
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
