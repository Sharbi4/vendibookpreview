import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[MONETIZATION-CHECKOUT] ${step}${details ? " - " + JSON.stringify(details) : ""}`);

interface Body {
  product_slug: string;
  listing_id?: string;
  discount_code?: string;
  success_path?: string;
  cancel_path?: string;
  /**
   * user_consents.id captured client-side via SubscriptionConsentDialog.
   * REQUIRED for products where billing_type === "recurring"
   * (ROSCA + California AB 2863 affirmative-consent record).
   */
  consent_id?: string;
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
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr) throw new Error(`Authentication error: ${userErr.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = (await req.json()) as Body;
    if (!body.product_slug) throw new Error("Missing product_slug");
    log("start", { userId: user.id, slug: body.product_slug, listing: body.listing_id });

    // Load product
    const { data: product, error: prodErr } = await supabase
      .from("monetization_products")
      .select("*")
      .eq("slug", body.product_slug)
      .eq("is_active", true)
      .maybeSingle();
    if (prodErr) throw prodErr;
    if (!product) throw new Error("Product not available");

    // ROSCA / California AB 2863: recurring subscriptions require an affirmative
    // consent record captured before checkout. Reject the request if the client
    // did not pass a consent_id or if the consent row does not belong to this
    // user / match the product they consented to.
    if (product.billing_type === "recurring") {
      if (!body.consent_id) {
        return new Response(
          JSON.stringify({
            error:
              "Missing subscription consent. Please review the terms and check the agreement box, then try again.",
            code: "missing_subscription_consent",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }
      const { data: consent, error: consentErr } = await supabase
        .from("user_consents")
        .select("id, user_id, document_type, related_ids, trigger_action")
        .eq("id", body.consent_id)
        .maybeSingle();
      if (consentErr) throw consentErr;
      const relatedSlug =
        (consent?.related_ids as Record<string, string> | null)?.product_slug ?? null;
      const validConsent =
        !!consent &&
        consent.user_id === user.id &&
        consent.document_type === "subscription_terms" &&
        consent.trigger_action === "subscription_start" &&
        (relatedSlug === null || relatedSlug === product.slug);
      if (!validConsent) {
        return new Response(
          JSON.stringify({
            error:
              "Subscription consent could not be verified. Please re-accept the terms and try again.",
            code: "invalid_subscription_consent",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }
      log("subscription consent verified", { consent_id: consent.id });
    }


    // Effective price (respect promo window)
    const now = Date.now();
    const inPromo =
      product.promo_price_cents != null &&
      (!product.promo_starts_at || new Date(product.promo_starts_at).getTime() <= now) &&
      (!product.promo_ends_at || new Date(product.promo_ends_at).getTime() > now);
    let priceCents: number = inPromo ? product.promo_price_cents : product.price_cents;
    if (typeof priceCents !== "number" || priceCents < 0) throw new Error("Invalid product price");

    // Optional discount code
    let discountAppliedCents = 0;
    let discountCodeId: string | null = null;
    if (body.discount_code) {
      const codeUpper = body.discount_code.trim().toUpperCase();
      const { data: code } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", codeUpper)
        .eq("active", true)
        .maybeSingle();
      if (code) {
        const okCategory =
          !code.applicable_categories?.length ||
          code.applicable_categories.includes(product.category);
        const okProduct =
          !code.applicable_product_ids?.length ||
          code.applicable_product_ids.includes(product.id);
        const okWindow =
          (!code.starts_at || new Date(code.starts_at).getTime() <= now) &&
          (!code.ends_at || new Date(code.ends_at).getTime() > now);
        const okUses = !code.max_uses || code.uses < code.max_uses;
        if (okCategory && okProduct && okWindow && okUses) {
          discountCodeId = code.id;
          discountAppliedCents = code.amount_off_cents
            ? Math.min(code.amount_off_cents, priceCents)
            : Math.floor((priceCents * code.percent_off) / 100);
          priceCents = Math.max(0, priceCents - discountAppliedCents);
          log("discount applied", { code: codeUpper, discountAppliedCents });
        } else {
          log("discount rejected", { code: codeUpper });
        }
      }
    }

    // Automatic member discount for active subscribers (only on one-time add-ons, and only
    // when no explicit discount code already applied — codes and member perks don't stack).
    let memberDiscountCents = 0;
    if (
      discountAppliedCents === 0 &&
      product.billing_type === "one_time" &&
      (product.member_discount_pct ?? 0) > 0
    ) {
      const { data: activeSub } = await supabase
        .from("host_subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .limit(1)
        .maybeSingle();
      if (activeSub) {
        memberDiscountCents = Math.floor((priceCents * product.member_discount_pct) / 100);
        priceCents = Math.max(0, priceCents - memberDiscountCents);
        log("member discount applied", {
          pct: product.member_discount_pct,
          memberDiscountCents,
        });
      }
    }

    // Prevent overlapping active same-type promo on this listing
    if (body.listing_id && product.promo_type) {
      const { data: overlap } = await supabase
        .from("listing_promotions")
        .select("id, ends_at")
        .eq("listing_id", body.listing_id)
        .eq("promo_type", product.promo_type)
        .eq("active", true)
        .maybeSingle();
      if (overlap) {
        return new Response(
          JSON.stringify({
            error: "This promotion is already active on this listing.",
            already_active: true,
            ends_at: overlap.ends_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
        );
      }
    }

    // Idempotency key scoped to (user, product, listing, hour) — bursty double-clicks reuse the session.
    const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
    const idempotencyKey = `mon-${user.id}-${product.id}-${body.listing_id ?? "none"}-${hourBucket}`;

    // Reuse existing pending purchase if one already exists for this key
    const { data: existing } = await supabase
      .from("monetization_purchases")
      .select("id, stripe_session_id, status")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "").split("/").slice(0, 3).join("/") ||
      "https://vendibook.com";
    const successUrl = `${origin}${body.success_path ?? "/dashboard?purchase=success"}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${body.cancel_path ?? "/dashboard?purchase=cancelled"}`;

    if (existing?.stripe_session_id && existing.status === "pending") {
      log("reusing pending session", { id: existing.id, session: existing.stripe_session_id });
      // Retrieve the URL from Stripe
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const sess = await stripe.checkout.sessions.retrieve(existing.stripe_session_id);
      if (sess.url && sess.status !== "expired") {
        return new Response(JSON.stringify({ url: sess.url, purchase_id: existing.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    // Prefer stored price ID; else inline price_data.
    const lineItem = product.stripe_price_id
      ? { price: product.stripe_price_id, quantity: 1 }
      : {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: product.description ?? undefined,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        };

    const sessionMetadata: Record<string, string> = {
      product_id: product.id,
      product_slug: product.slug,
      user_id: user.id,
      listing_id: body.listing_id ?? "",
      idempotency_key: idempotencyKey,
    };
    if (body.consent_id) sessionMetadata.consent_id = body.consent_id;

    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [lineItem as Stripe.Checkout.SessionCreateParams.LineItem],
        mode: product.billing_type === "recurring" ? "subscription" : "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: sessionMetadata,
        // Mirror the consent + product context onto the Subscription itself so
        // handleSubscriptionChange can link host_subscriptions.consent_id even
        // on downstream events (renewals, updates) where session metadata is
        // not attached.
        ...(product.billing_type === "recurring"
          ? {
              subscription_data: {
                metadata: {
                  product_slug: product.slug,
                  user_id: user.id,
                  tier: product.slug,
                  ...(body.consent_id ? { consent_id: body.consent_id } : {}),
                },
              },
            }
          : {}),
      },
      { idempotencyKey: `stripe-${idempotencyKey}` },
    );

    // Insert / upsert pending purchase row
    const purchaseRow = {
      user_id: user.id,
      product_id: product.id,
      listing_id: body.listing_id ?? null,
      stripe_session_id: session.id,
      stripe_customer_id: customerId ?? null,
      amount_cents: priceCents,
      currency: product.currency,
      discount_code_id: discountCodeId,
      discount_applied_cents: discountAppliedCents + memberDiscountCents,
      status: "pending" as const,
      idempotency_key: idempotencyKey,
      metadata: { source: "checkout", member_discount_cents: memberDiscountCents },
    };
    const { data: purchase, error: insErr } = await supabase
      .from("monetization_purchases")
      .upsert(purchaseRow, { onConflict: "idempotency_key" })
      .select("id")
      .single();
    if (insErr) throw insErr;

    log("checkout created", { session: session.id, purchase: purchase?.id });
    return new Response(
      JSON.stringify({ url: session.url, purchase_id: purchase?.id, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
