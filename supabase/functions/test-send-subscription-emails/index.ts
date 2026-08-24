// Fires all 7 subscription-related templates to a test address using sample data.
// Invoke with: POST /functions/v1/test-send-subscription-emails { "to": "atlasmom421@gmail.com" }
// Requires the caller to be an authenticated admin (checks user_roles.role='admin').
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TO = "atlasmom421@gmail.com";

const TEMPLATES: Array<{ name: string; data: Record<string, unknown>; label: string }> = [
  {
    name: "subscription-trial-started",
    label: "Trial start",
    data: {
      firstName: "Alex",
      planName: "Vendibook Growth",
      trialEndsAt: "August 31, 2026",
      priceAfter: "$39.00",
      interval: "month",
    },
  },
  {
    name: "subscription-activated",
    label: "Welcome / first invoice receipt",
    data: {
      firstName: "Alex",
      planName: "Vendibook Growth",
      amount: "$39.00",
      interval: "month",
      chargedOn: "August 24, 2026",
      nextBillingDate: "September 24, 2026",
      last4: "4242",
      invoiceUrl: "https://invoice.stripe.com/i/test",
      isRenewal: false,
      benefits: [
        { label: "Feature your first listing", href: "/dashboard/promote" },
        { label: "Open Premium Tools", href: "/dashboard/tools" },
        { label: "Advanced analytics", href: "/dashboard/insights" },
      ],
      manageUrl: "https://vendibook.com/account/subscription",
    },
  },
  {
    name: "subscription-activated",
    label: "Renewal receipt",
    data: {
      firstName: "Alex",
      planName: "Vendibook Growth",
      amount: "$39.00",
      interval: "month",
      chargedOn: "September 24, 2026",
      nextBillingDate: "October 24, 2026",
      last4: "4242",
      invoiceUrl: "https://invoice.stripe.com/i/test-renewal",
      isRenewal: true,
      manageUrl: "https://vendibook.com/account/subscription",
    },
  },
  {
    name: "weekly-pass-activated",
    label: "Weekly pass receipt",
    data: {
      firstName: "Alex",
      amount: "$29.00",
      chargedOn: "August 24, 2026",
      expiresOn: "August 31, 2026",
      last4: "4242",
      invoiceUrl: "https://invoice.stripe.com/i/test-pass",
    },
  },
  {
    name: "subscription-getting-started",
    label: "24h follow-up",
    data: {
      firstName: "Alex",
      planName: "Vendibook Growth",
    },
  },
  {
    name: "subscription-cancelled",
    label: "Cancellation confirmed",
    data: {
      firstName: "Alex",
      planName: "Vendibook Growth",
      accessEndsAt: "September 24, 2026",
      immediate: false,
      reactivateUrl: "https://vendibook.com/pricing?resubscribe=1",
    },
  },
  {
    name: "subscription-payment-failed",
    label: "Dunning / payment failed",
    data: {
      firstName: "Alex",
      planName: "Vendibook Growth",
      amount: "$39.00",
      nextRetryDate: "August 27, 2026",
      updatePaymentUrl: "https://invoice.stripe.com/i/test-retry",
      portalUrl: "https://vendibook.com/account/subscription",
      accessPausesOn: "September 3, 2026",
      attemptNumber: 2,
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Auth: require admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: corsHeaders });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: corsHeaders });
  }
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
  }

  let to = DEFAULT_TO;
  try {
    const body = await req.json();
    if (body?.to && typeof body.to === "string") to = body.to;
  } catch { /* default */ }

  const stamp = Date.now();
  const results: Array<{ template: string; label: string; ok: boolean; error?: string }> = [];

  for (const t of TEMPLATES) {
    try {
      const { error } = await invokeTransactionalEmail({
          templateName: t.name,
          recipientEmail: to,
          idempotencyKey: `test-${t.name}-${t.label}-${stamp}`.replace(/\s+/g, "-"),
          templateData: t.data,
        });
      if (error) throw new Error(error.message || String(error));
      results.push({ template: t.name, label: t.label, ok: true });
    } catch (e) {
      results.push({ template: t.name, label: t.label, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({ to, sent: results.length, results }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
