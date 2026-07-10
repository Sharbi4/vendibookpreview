// Marks expired Featured Boosts as 'expired' in the ledger and sends a one-time
// notification + email to the host. Idempotent — sets expiry_notified_at so
// re-running the function never double-sends.
//
// Trigger: invoke daily (cron). Safe to call manually.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[notify-expired-boosts] ${s}${d ? ' ' + JSON.stringify(d) : ''}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const now = new Date();
  const nowIso = now.toISOString();

  // Candidate: any listing whose featured window has expired but is still flagged enabled.
  // Covers both paid boosts (pending_featured_payment set) and admin comp grants
  // (featured_source='comp', pending_featured_payment NULL).
  const { data: candidates, error } = await supabase
    .from("listings")
    .select("id, title, host_id, featured_expires_at, featured_enabled, featured_source, pending_featured_payment")
    .eq("featured_enabled", true)
    .not("featured_expires_at", "is", null)
    .lt("featured_expires_at", nowIso);

  if (error) {
    log("ERROR fetching candidates", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  let processed = 0;
  for (const listing of candidates || []) {
    const prior = (listing.pending_featured_payment || {}) as Record<string, any>;
    if (prior.status === 'refunded') continue;
    if (prior.expiry_notified_at) continue;

    const updated = {
      ...prior,
      status: prior.status === 'paid' || prior.status === 'comped' ? 'expired' : (prior.status || 'expired'),
      expired_at: listing.featured_expires_at,
      expiry_notified_at: nowIso,
    };

    const { error: updErr } = await supabase
      .from("listings")
      .update({
        featured_enabled: false,
        pending_featured_payment: updated,
      })
      .eq("id", listing.id);

    if (updErr) {
      log("update failed", { listingId: listing.id, error: updErr.message });
      continue;
    }

    // In-app notification
    try {
      await supabase.from("notifications").insert({
        user_id: listing.host_id,
        type: "listing",
        title: "Featured Boost Ended",
        message: `Your 30-day Featured Boost for "${listing.title}" has ended. Re-boost to stay at the top.`,
        link: `/listing/${listing.id}`,
      });
    } catch (e) {
      log("notification insert failed", { error: String(e) });
    }

    // Email
    try {
      const { data: hostProfile } = await supabase
        .from("profiles")
        .select("email, first_name, full_name")
        .eq("id", listing.host_id)
        .single();

      if (hostProfile?.email) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            templateName: 'featured-boost-expired',
            recipientEmail: hostProfile.email,
            idempotencyKey: `featured-expired-${listing.id}-${listing.featured_expires_at}`,
            templateData: {
              firstName: hostProfile.first_name || hostProfile.full_name?.split(' ')[0],
              listingTitle: listing.title,
              listingId: listing.id,
              expiredAt: new Date(listing.featured_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            },
          }),
        });
      }
    } catch (e) {
      log("email failed", { error: String(e) });
    }

    processed++;
  }

  log("done", { processed, scanned: candidates?.length || 0 });
  return new Response(JSON.stringify({ ok: true, processed, scanned: candidates?.length || 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
