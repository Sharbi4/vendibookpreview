// Sends the 24-hour "Get the most out of [Tier]" follow-up exactly once per
// subscription. Skips if the subscription was cancelled within 24h, or if
// getting_started_sent_at is already stamped. Intended to run hourly via pg_cron.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) =>
  console.log(`[SUB-GETTING-STARTED] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

const TIER_NAMES: Record<string, string> = {
  starter: "Vendibook Starter",
  pro: "Vendibook Growth",
  premium: "Vendibook Operator",
};

const TIER_ACTIONS: Record<string, { label: string; href: string; blurb?: string }[]> = {
  starter: [
    { label: 'Publish your first listing', href: '/dashboard/listings', blurb: 'Photos + AI description = live in ~5 minutes.' },
    { label: 'Set your booking calendar', href: '/dashboard/bookings', blurb: 'Block dates and turn on inquiry auto-replies.' },
    { label: 'Review analytics on your dashboard', href: '/dashboard/insights', blurb: 'See views, saves, and inquiries over time.' },
  ],
  pro: [
    { label: 'Feature your first listing', href: '/dashboard/promote', blurb: 'Pin to the top of relevant searches for 7 days.' },
    { label: 'Generate a stronger description with Listing Studio', href: '/dashboard/tools', blurb: 'AI rewrites your listing for conversion.' },
    { label: 'Map your permits with PermitPath Plus', href: '/dashboard/permits', blurb: 'City-by-city requirements in one view.' },
  ],
  premium: [
    { label: 'Open the portfolio dashboard', href: '/dashboard', blurb: 'One view across every listing you manage.' },
    { label: 'Set custom intake questions per listing', href: '/dashboard/listings', blurb: 'Qualify renters before they book.' },
    { label: 'Talk to your dedicated support contact', href: '/support', blurb: 'Priority queue — expect hours, not days.' },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Fetch subs older than 24h that haven't received the follow-up, still active/trialing.
  // deno-lint-ignore no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("host_subscriptions")
    .select("id, user_id, tier, status, cancel_at_period_end, created_at, getting_started_sent_at")
    .is("getting_started_sent_at", null)
    .lt("created_at", cutoff)
    .in("status", ["active", "trialing"])
    .limit(200);

  if (error) {
    log("query failed", { msg: error.message });
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  let sent = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    // Skip if scheduled to cancel within 24h — respect the user's decision.
    if (row.cancel_at_period_end) {
      skipped++;
      await supabase.from("host_subscriptions")
        .update({ getting_started_sent_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    if (!row.user_id) { skipped++; continue; }

    // deno-lint-ignore no-explicit-any
    const { data: prof } = await (supabase as any)
      .from("profiles")
      .select("email, first_name, full_name")
      .eq("id", row.user_id)
      .maybeSingle();
    if (!prof?.email) { skipped++; continue; }

    const tier = (row.tier as string) || "pro";
    const planName = TIER_NAMES[tier] ?? "Vendibook Growth";
    const actions = TIER_ACTIONS[tier] ?? TIER_ACTIONS.pro;

    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "subscription-getting-started",
          recipientEmail: prof.email,
          idempotencyKey: `sub-getting-started-${row.id}`,
          templateData: {
            firstName: (prof.first_name as string) || (prof.full_name as string)?.split(" ")[0],
            planName,
            actions,
          },
        },
      });
      await supabase.from("host_subscriptions")
        .update({ getting_started_sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    } catch (e) {
      log("send failed", { id: row.id, msg: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({ ok: true, scanned: rows?.length ?? 0, sent, skipped }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
