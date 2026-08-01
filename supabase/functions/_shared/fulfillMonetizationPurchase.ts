/**
 * Provider-agnostic fulfilment for a paid `monetization_purchases` row.
 *
 * The Stripe webhook historically owned this logic. It now lives here so the
 * PayPal capture path grants exactly the same entitlements (access windows,
 * listing promotions, featured columns, buyer notification).
 *
 * Safe to call repeatedly — every write is either idempotent or guarded.
 */

const FEATURED_PROMOS = new Set(["featured_7", "featured_30", "top_of_search"]);

export async function fulfillMonetizationPurchase(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  purchaseId: string,
): Promise<{ fulfilled: boolean; reason?: string }> {
  const { data: purchase } = await supabase
    .from("monetization_purchases")
    .select("*, product:monetization_products(*)")
    .eq("id", purchaseId)
    .maybeSingle();

  if (!purchase) return { fulfilled: false, reason: "purchase_not_found" };
  if (purchase.fulfillment_status === "active" || purchase.status === "fulfilled") {
    return { fulfilled: true, reason: "already_fulfilled" };
  }

  // deno-lint-ignore no-explicit-any
  const product: any = purchase.product;
  const now = new Date();
  const nowMs = now.getTime();

  const grantsTier: string | null = product?.metadata?.grants_tier ?? null;
  const durationDays: number | null =
    typeof product?.duration_days === "number" ? product.duration_days : null;
  const isAccountScopedPass = !purchase.listing_id && !!grantsTier && !!durationDays;

  if (isAccountScopedPass) {
    await supabase
      .from("monetization_purchases")
      .update({
        access_starts_at: now.toISOString(),
        access_ends_at: new Date(nowMs + durationDays! * 86_400_000).toISOString(),
        fulfillment_status: "active",
      })
      .eq("id", purchase.id);
  }

  // ---- listing promotion (featured boosts, highlights, top of search) ----
  if (purchase.listing_id && product?.promo_type && product?.duration_days) {
    const durationMs = product.duration_days * 86_400_000;
    const isFeatured = FEATURED_PROMOS.has(product.promo_type);

    let currentFeaturedExpiresMs = 0;
    if (isFeatured) {
      const { data: listingRow } = await supabase
        .from("listings")
        .select("featured_enabled, featured_expires_at")
        .eq("id", purchase.listing_id)
        .maybeSingle();
      if (listingRow?.featured_enabled && listingRow?.featured_expires_at) {
        currentFeaturedExpiresMs = new Date(listingRow.featured_expires_at).getTime();
      }
    }

    const { data: existingPromo } = await supabase
      .from("listing_promotions")
      .select("id, ends_at")
      .eq("listing_id", purchase.listing_id)
      .eq("promo_type", product.promo_type)
      .eq("active", true)
      .maybeSingle();

    const existingEndsMs = existingPromo?.ends_at ? new Date(existingPromo.ends_at).getTime() : 0;
    const promoEndMs = (existingEndsMs > nowMs ? existingEndsMs : nowMs) + durationMs;

    if (existingPromo) {
      await supabase
        .from("listing_promotions")
        .update({ ends_at: new Date(promoEndMs).toISOString(), purchase_id: purchase.id })
        .eq("id", existingPromo.id);
    } else {
      const { error: promoErr } = await supabase.from("listing_promotions").insert({
        listing_id: purchase.listing_id,
        product_id: product.id,
        purchase_id: purchase.id,
        promo_type: product.promo_type,
        starts_at: now.toISOString(),
        ends_at: new Date(promoEndMs).toISOString(),
        active: true,
      });
      // 23505 = a concurrent capture/webhook already inserted it.
      if (promoErr && (promoErr as { code?: string }).code !== "23505") {
        return { fulfilled: false, reason: promoErr.message };
      }
    }

    if (isFeatured) {
      const featuredStartMs = currentFeaturedExpiresMs > nowMs ? currentFeaturedExpiresMs : nowMs;
      await supabase
        .from("listings")
        .update({
          featured_enabled: true,
          ...(currentFeaturedExpiresMs > nowMs ? {} : { featured_at: now.toISOString() }),
          featured_expires_at: new Date(featuredStartMs + durationMs).toISOString(),
          featured_source: "paid",
        })
        .eq("id", purchase.listing_id);
    }

    await supabase
      .from("monetization_purchases")
      .update({ status: "fulfilled", fulfillment_status: "active" })
      .eq("id", purchase.id);
  }

  // ---- buyer notification (deduped by purchase id) ----------------------
  if (purchase.user_id) {
    await supabase
      .from("notifications")
      .insert({
        user_id: purchase.user_id,
        type: "purchase",
        title: "Upgrade purchased",
        message: `${product?.name ?? "Your upgrade"} is now active on your account.`,
        link: purchase.listing_id ? `/listing/${purchase.listing_id}` : "/dashboard",
        dedupe_key: `monetization-fulfilled:${purchase.id}`,
      })
      .then(
        () => {},
        () => {},
      );
  }

  return { fulfilled: true };
}
