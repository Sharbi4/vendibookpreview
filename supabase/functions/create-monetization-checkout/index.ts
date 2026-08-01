import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alreadyEntitledError, jsonError } from "../_shared/jsonError.ts";
import { classifyProduct } from "../_shared/productEntitlement.ts";
import { resolveHostTier, tierAtLeast } from "../_shared/resolveHostTier.ts";
import { resolveToolAccess } from "../_shared/toolAccess.ts";

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
    if (!product) {
      return new Response(
        JSON.stringify({
          error: `The product "${body.product_slug}" is not available. Please refresh and try again.`,
          code: "product_not_found",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      );
    }

    // Stripe is closed to new business. Recurring memberships are sold only
    // through PayPal Subscriptions (`paypal-subscription-create`); existing
    // Stripe subscribers keep their plan and are managed read-only.
    if (product.billing_type === "recurring") {
      return jsonError(
        409,
        "provider_retired",
        "Memberships are now purchased through PayPal. Please reload the page and try again.",
      );
    }

    // Entitlement guard: never charge a user for something they already own.
    // Uses the unified server-side helpers (resolveHostTier + resolveToolAccess).
    // Add-on SKUs (featured stack, notary, freight...) are pass-through — they
    // don't grant a persistent capability and are allowed to re-purchase.
    const classified = classifyProduct({
      slug: product.slug,
      billing_type: product.billing_type,
      metadata: product.metadata ?? null,
    });
    if (classified.kind === "subscription" || classified.kind === "weekly_pass") {
      if (classified.grantsTier) {
        const currentTier = await resolveHostTier(user.id);
        if (tierAtLeast(currentTier, classified.grantsTier)) {
          log("already entitled — tier", { current: currentTier, wants: classified.grantsTier });
          return alreadyEntitledError({
            current: currentTier,
            message:
              classified.kind === "weekly_pass"
                ? "Your current plan already includes this. No need to buy the weekly pass."
                : "You're already on this plan or better. Manage or upgrade from your account.",
          });
        }
      }
    } else if (classified.kind === "tool_unlock" && classified.toolSlug) {
      const access = await resolveToolAccess(user.id, classified.toolSlug);
      if (access.unlocked) {
        log("already entitled — tool", { tool: classified.toolSlug, reason: access.reason });
        return alreadyEntitledError({
          current: access.tier,
          message: "This tool is already unlocked on your account.",
        });
      }
    }



    // ROSCA / California AB 2863: recurring subscriptions require an affirmative
    // consent record captured before checkout. Validate:
    //   - artifact exists, belongs to this user, and matches this SKU
    //   - document_version matches the CURRENT active subscription_terms row
    //   - price shown at consent matches the price we are about to charge
    //   - artifact has not been consumed by a prior checkout attempt (replay)
    // Then mark it consumed before creating the Stripe session so a duplicate
    // click cannot re-use the same consent for a second/third session.
    let validatedConsentId: string | null = null;
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
        .select("id, user_id, document_type, document_version, related_ids, trigger_action, consumed_at")
        .eq("id", body.consent_id)
        .maybeSingle();
      if (consentErr) throw consentErr;

      const related = (consent?.related_ids as Record<string, string> | null) ?? {};
      const relatedSlug = related.product_slug ?? null;
      const relatedPrice = Number(related.price_cents_shown ?? NaN);

      // Compute effective price BEFORE discounts so we compare against what the
      // consent dialog actually displayed to the user (list price, not discounted).
      const nowMs = Date.now();
      const inPromoNow =
        product.promo_price_cents != null &&
        (!product.promo_starts_at || new Date(product.promo_starts_at).getTime() <= nowMs) &&
        (!product.promo_ends_at || new Date(product.promo_ends_at).getTime() > nowMs);
      const shownPriceCents: number = inPromoNow ? product.promo_price_cents : product.price_cents;

      // Look up current active subscription_terms version.
      const { data: activeDoc } = await supabase
        .from("legal_documents")
        .select("version")
        .eq("document_type", "subscription_terms")
        .eq("status", "active")
        .order("effective_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const activeVersion = activeDoc?.version ?? null;

      const failReasons: string[] = [];
      if (!consent) failReasons.push("not_found");
      if (consent && consent.user_id !== user.id) failReasons.push("user_mismatch");
      if (consent && consent.document_type !== "subscription_terms") failReasons.push("wrong_doc_type");
      if (consent && consent.trigger_action !== "subscription_start") failReasons.push("wrong_trigger");
      if (relatedSlug && relatedSlug !== product.slug) failReasons.push("sku_mismatch");
      if (Number.isFinite(relatedPrice) && relatedPrice !== shownPriceCents) failReasons.push("price_drift");
      if (activeVersion && consent && consent.document_version !== activeVersion) failReasons.push("stale_version");
      if (consent?.consumed_at) failReasons.push("replayed");

      if (failReasons.length > 0) {
        log("subscription consent rejected", { reasons: failReasons, consent_id: body.consent_id });
        return new Response(
          JSON.stringify({
            error:
              "Subscription consent could not be verified. Please re-accept the current terms and try again.",
            code: "invalid_subscription_consent",
            reasons: failReasons,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
        );
      }
      validatedConsentId = consent!.id;
      log("subscription consent verified", { consent_id: validatedConsentId, version: activeVersion });
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

    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "").split("/").slice(0, 3).join("/") ||
      "https://vendibook.com";
    // Default: land in the in-app success flow so the buyer immediately sees
    // what was provisioned + a "receipt on the way" confirmation. Callers may
    // override with success_path; we safely append session_id regardless of
    // whether the override already contains a query string.
    const defaultSuccess = "/payment-success?monetization=true";
    const rawSuccess = `${origin}${body.success_path ?? defaultSuccess}`;
    const successUrl = `${rawSuccess}${rawSuccess.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${body.cancel_path ?? "/dashboard?purchase=cancelled"}`;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    // Idempotency key derived from the FULL parameter set of this logical
    // checkout operation. Same parameters => same key (safe retry/reuse);
    // any change (price, promo, listing, customer, URLs) => new key, new
    // session. Never time-bucketed — that caused provider key-reuse errors.
    const idempotencyKey = await buildCheckoutIdempotencyKey({
      userId: user.id,
      productId: product.id,
      productSlug: product.slug,
      mode: "payment",
      amountCents: priceCents,
      currency: product.currency,
      quantity: 1,
      listingId: body.listing_id ?? null,
      discountCodeId: discountCodeId,
      discountAppliedCents: discountAppliedCents + memberDiscountCents,
      customerRef: customerId ?? user.email,
      priceRef: product.stripe_price_id ?? null,
      successUrl,
      cancelUrl,
    });

    // Reuse existing pending purchase only when the parameters match exactly
    // (guaranteed by the hash above).
    const { data: existing } = await supabase
      .from("monetization_purchases")
      .select("id, stripe_session_id, status")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing?.stripe_session_id && existing.status === "pending") {
      log("reusing pending session", { id: existing.id, session: existing.stripe_session_id });
      const sess = await stripe.checkout.sessions.retrieve(existing.stripe_session_id);
      if (sess.url && sess.status !== "expired") {
        return new Response(JSON.stringify({ url: sess.url, purchase_id: existing.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

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

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(
        {
          customer: customerId,
          customer_email: customerId ? undefined : user.email,
          line_items: [lineItem as Stripe.Checkout.SessionCreateParams.LineItem],
          mode: "payment",
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: sessionMetadata,
        },
        { idempotencyKey },
      );
    } catch (providerErr) {
      const detail = providerErr instanceof Error ? providerErr.message : String(providerErr);
      log("provider error", { correlation_id: correlationId, idempotencyKey, detail });
      return jsonError(
        502,
        "provider_error",
        "We couldn't start that checkout. Please try again in a moment.",
        { correlation_id: correlationId, retryable: true },
      );
    }


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

    // D2: consume the recurring-billing consent artifact so a duplicate click,
    // a replay from another tab, or a swap to a different SKU cannot re-use
    // it. Duplicate-click idempotency is still preserved because we detect an
    // existing pending session for the same idempotencyKey earlier and reuse
    // it BEFORE reaching this point.
    if (validatedConsentId) {
      await supabase
        .from("user_consents")
        .update({
          consumed_at: new Date().toISOString(),
          consumed_by_ref: session.id,
        })
        .eq("id", validatedConsentId)
        .is("consumed_at", null);
    }

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
