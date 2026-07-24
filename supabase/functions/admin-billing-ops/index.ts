// Admin billing operations: resync a user's subscription from Stripe,
// or retry a stored webhook event by re-fetching the underlying object.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[ADMIN-BILLING] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

type Action =
  | { action: "resync_user"; user_id: string }
  | { action: "retry_event"; event_row_id: string };

function tierFromPrice(priceId: string | null | undefined, metaTier?: string | null): string | null {
  if (metaTier) return metaTier;
  if (!priceId) return null;
  const p = priceId.toLowerCase();
  if (p.includes("premium")) return "premium";
  if (p.includes("pro")) return "pro";
  if (p.includes("starter")) return "starter";
  return null;
}

async function upsertSubscription(
  supabase: ReturnType<typeof createClient>,
  sub: Stripe.Subscription,
  fallbackUserId?: string | null,
) {
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const userId = (sub.metadata?.user_id as string) || fallbackUserId || null;
  const tier = tierFromPrice(priceId, sub.metadata?.tier as string | undefined);

  // Stripe API 2025-08-27.basil moved current_period_* onto the subscription item.
  // deno-lint-ignore no-explicit-any
  const itemAny = item as any;
  const periodStartUnix: number | null =
    itemAny?.current_period_start ?? sub.current_period_start ?? null;
  const periodEndUnix: number | null =
    itemAny?.current_period_end ?? sub.current_period_end ?? null;

  const patch = {
    user_id: userId,
    tier: tier ?? "starter",
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    status: sub.status,
    current_period_start: periodStartUnix ? new Date(periodStartUnix * 1000).toISOString() : null,
    current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  // deno-lint-ignore no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("host_subscriptions")
    .select("id")
    .or(`stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${sub.customer as string}`)
    .maybeSingle();

  if (existing) {
    await supabase.from("host_subscriptions").update(patch).eq("id", existing.id);
  } else {
    if (!patch.user_id) throw new Error("Cannot create host_subscriptions row without user_id");
    await supabase.from("host_subscriptions").insert(patch);
  }
  return patch;
}

async function resyncUser(supabase: ReturnType<typeof createClient>, stripe: Stripe, userId: string) {
  // deno-lint-ignore no-explicit-any
  const { data: row } = await (supabase as any)
    .from("host_subscriptions")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row?.stripe_customer_id && !row?.stripe_subscription_id) {
    // Try to find by user email
    const { data: userRes } = await supabase.auth.admin.getUserById(userId);
    const email = userRes.user?.email;
    if (!email) throw new Error("No Stripe customer on file and no email for user");
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) throw new Error("No Stripe customer found for this email");
    const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "all", limit: 5 });
    if (!subs.data.length) return { ok: true, resynced: 0, note: "Customer found, no subscriptions" };
    for (const s of subs.data) await upsertSubscription(supabase, s, userId);
    return { ok: true, resynced: subs.data.length };
  }

  if (row.stripe_subscription_id) {
    const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
    await upsertSubscription(supabase, sub, userId);
    return { ok: true, resynced: 1, subscription_status: sub.status };
  }

  const subs = await stripe.subscriptions.list({ customer: row.stripe_customer_id, status: "all", limit: 5 });
  for (const s of subs.data) await upsertSubscription(supabase, s, userId);
  return { ok: true, resynced: subs.data.length };
}

async function retryEvent(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  eventRowId: string,
) {
  // deno-lint-ignore no-explicit-any
  const { data: row, error } = await (supabase as any)
    .from("stripe_webhook_events")
    .select("id, stripe_event_id, event_type, retry_count")
    .eq("id", eventRowId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Event row not found");

  // Refetch the live Stripe event so we operate on current state
  const event = await stripe.events.retrieve(row.stripe_event_id);
  const t = event.type;
  let note = `Refetched ${t}`;
  try {
    if (t.startsWith("customer.subscription")) {
      const sub = event.data.object as Stripe.Subscription;
      const fresh = await stripe.subscriptions.retrieve(sub.id);
      await upsertSubscription(supabase, fresh);
    } else if (t === "invoice.paid" || t === "invoice.payment_failed") {
      const inv = event.data.object as Stripe.Invoice;
      const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
      if (subId) {
        const fresh = await stripe.subscriptions.retrieve(subId);
        await upsertSubscription(supabase, fresh);
      } else {
        note = "Invoice not tied to a subscription; nothing to do";
      }
    } else if (t === "checkout.session.completed") {
      const sess = event.data.object as Stripe.Checkout.Session;
      if (sess.mode === "subscription" && sess.subscription) {
        const subId = typeof sess.subscription === "string" ? sess.subscription : sess.subscription.id;
        const fresh = await stripe.subscriptions.retrieve(subId);
        const uid = (sess.client_reference_id ?? (sess.metadata?.user_id as string | undefined)) ?? null;
        await upsertSubscription(supabase, fresh, uid);
      } else {
        note = "Non-subscription checkout; retry skipped";
      }
    } else if (t.startsWith("charge.refund") || t.startsWith("charge.dispute")) {
      // Flag related subscription for revoke at period end
      const obj = event.data.object as { customer?: string | Stripe.Customer };
      const custId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      if (custId) {
        await supabase
          .from("host_subscriptions")
          .update({
            flagged_at: new Date().toISOString(),
            flag_reason: t,
            revoke_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", custId);
        note = `Flagged customer ${custId} for revoke-at-period-end`;
      }
    } else {
      note = `No retry handler for ${t}`;
    }

    await supabase
      .from("stripe_webhook_events")
      .update({
        status: "processed",
        error_message: null,
        retry_count: (row.retry_count ?? 0) + 1,
        last_retry_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    return { ok: true, note, event_type: t };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("stripe_webhook_events")
      .update({
        status: "failed",
        error_message: msg,
        retry_count: (row.retry_count ?? 0) + 1,
        last_retry_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");
    const { data: userData, error: uErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (uErr) throw new Error(uErr.message);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Action;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let result: unknown;
    if (body.action === "resync_user") {
      if (!body.user_id) throw new Error("user_id required");
      result = await resyncUser(supabase, stripe, body.user_id);
    } else if (body.action === "retry_event") {
      if (!body.event_row_id) throw new Error("event_row_id required");
      result = await retryEvent(supabase, stripe, body.event_row_id);
    } else {
      throw new Error("Unknown action");
    }

    log("ok", result);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
