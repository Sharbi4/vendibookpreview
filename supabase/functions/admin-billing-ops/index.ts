// Admin billing operations for Vendibook's PayPal subscriptions:
//   - resync_user: re-read a user's PayPal subscription and mirror it onto
//     `paypal_subscriptions` + `host_subscriptions`.
//   - retry_event: re-process a stored PayPal webhook event row.
//
// Vendibook processes recurring billing through PayPal only. Stripe (and
// Stripe Connect / Stripe Identity) is permanently retired; legacy Stripe rows
// are read-only accounting history and are never re-synced against an API.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getPayPalSubscription } from "../_shared/paypal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) =>
  console.log(`[ADMIN-BILLING-OPS] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

interface Action {
  action: "resync_user" | "retry_event";
  user_id?: string;
  event_row_id?: string;
}

/** Maps a PayPal subscription status onto our entitlement status. */
function mapStatus(paypalStatus: string): string {
  switch (paypalStatus.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "SUSPENDED":
      return "paused";
    case "CANCELLED":
    case "EXPIRED":
      return "canceled";
    case "APPROVAL_PENDING":
    case "APPROVED":
      return "incomplete";
    default:
      return "incomplete";
  }
}

async function resyncUser(supabase: any, userId: string) {
  const { data: row, error } = await supabase
    .from("paypal_subscriptions")
    .select("id, paypal_subscription_id, tier, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!row?.paypal_subscription_id) {
    return {
      resynced: 0,
      note:
        "No PayPal subscription on file for this user. Legacy subscriptions from our retired processor are read-only and settled by support.",
    };
  }

  const sub = await getPayPalSubscription(row.paypal_subscription_id);
  const paypalStatus = String(sub?.status ?? "").toLowerCase();
  const nextBilling = sub?.billing_info?.next_billing_time ?? null;

  await supabase
    .from("paypal_subscriptions")
    .update({
      status: paypalStatus,
      next_billing_time: nextBilling,
      last_reconciled_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  const mapped = mapStatus(String(sub?.status ?? ""));
  const { data: existing } = await supabase
    .from("host_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const payload = {
    user_id: userId,
    tier: row.tier,
    status: mapped,
    payment_provider: "paypal",
    paypal_subscription_id: row.paypal_subscription_id,
    current_period_end: nextBilling,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from("host_subscriptions").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("host_subscriptions").insert(payload);
  }

  return { resynced: 1, status: mapped, next_billing_time: nextBilling };
}

async function retryEvent(supabase: any, eventRowId: string) {
  const { data: row, error } = await supabase
    .from("paypal_webhook_events")
    .select("id, event_id, event_type, raw_event, resource_id")
    .eq("id", eventRowId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Webhook event row not found");

  const subId = (row.resource_id ?? (row.raw_event as any)?.resource?.id) as string | undefined;
  if (!subId || !String(row.event_type ?? "").startsWith("BILLING.SUBSCRIPTION")) {
    return { note: "Event is not a subscription event — nothing to replay." };
  }

  const sub = await getPayPalSubscription(subId);
  const paypalStatus = String(sub?.status ?? "").toLowerCase();

  await supabase
    .from("paypal_subscriptions")
    .update({
      status: paypalStatus,
      next_billing_time: sub?.billing_info?.next_billing_time ?? null,
      last_reconciled_at: new Date().toISOString(),
    })
    .eq("paypal_subscription_id", subId);

  const { data: subRow } = await supabase
    .from("paypal_subscriptions")
    .select("user_id, tier")
    .eq("paypal_subscription_id", subId)
    .maybeSingle();

  if (subRow?.user_id) {
    await resyncUser(supabase, subRow.user_id);
  }

  await supabase
    .from("paypal_webhook_events")
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
      processing_error: null,
    })
    .eq("id", row.id);

  return { note: `Replayed ${row.event_type} against PayPal`, status: paypalStatus };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");
    const { data: userData, error: uErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
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

    let result: unknown;
    if (body.action === "resync_user") {
      if (!body.user_id) throw new Error("user_id required");
      result = await resyncUser(supabase, body.user_id);
    } else if (body.action === "retry_event") {
      if (!body.event_row_id) throw new Error("event_row_id required");
      result = await retryEvent(supabase, body.event_row_id);
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
