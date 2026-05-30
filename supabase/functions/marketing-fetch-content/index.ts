// marketing-fetch-content — Pulls 6 latest for-sale + 1 featured rental
// for "The Vendibook Report" admin compose panel.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { VENDIBOOK_BASE_URL } from "../_shared/marketing-templates/constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function priceLabel(row: any): string {
  if (row.mode === "for_sale" && row.price_sale) return `$${Number(row.price_sale).toLocaleString()}`;
  if (row.price_hourly) return `$${row.price_hourly}/hr`;
  if (row.price_daily) return `$${row.price_daily}/day`;
  if (row.price_weekly) return `$${row.price_weekly}/wk`;
  if (row.price_monthly) return `$${row.price_monthly}/mo`;
  return "Inquire";
}

function shortDetail(row: any): string {
  const parts: string[] = [];
  if (row.category) parts.push(String(row.category).replace(/_/g, " "));
  if (row.subcategory) parts.push(row.subcategory);
  return parts.slice(0, 3).join(" · ") || "Listing";
}

function locationLabel(row: any): string {
  return [row.city, row.state].filter(Boolean).join(", ") || "Location available on request";
}

function cardUrl(id: string): string {
  return `${VENDIBOOK_BASE_URL}/listing/${id}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 6 most-recently-published for-sale listings, excluding demo
    const { data: sale, error: saleErr } = await supabase
      .from("listings")
      .select("id,title,city,state,price_sale,cover_image_url,image_urls,category,subcategory,mode,published_at")
      .eq("status", "published")
      .eq("mode", "for_sale")
      .not("published_at", "is", null)
      .not("title", "ilike", "DEMO%")
      .order("published_at", { ascending: false })
      .limit(6);
    if (saleErr) throw saleErr;

    // Most recent rental: prefer featured_enabled and not expired
    const now = new Date().toISOString();
    let { data: rental } = await supabase
      .from("listings")
      .select("id,title,city,state,price_hourly,price_daily,price_weekly,price_monthly,cover_image_url,image_urls,category,amenities,mode,featured_enabled,featured_expires_at,published_at")
      .eq("status", "published")
      .eq("mode", "for_rent")
      .eq("featured_enabled", true)
      .or(`featured_expires_at.is.null,featured_expires_at.gt.${now}`)
      .not("title", "ilike", "DEMO%")
      .order("featured_at", { ascending: false, nullsFirst: false })
      .limit(1);
    if (!rental || rental.length === 0) {
      const { data: fallback } = await supabase
        .from("listings")
        .select("id,title,city,state,price_hourly,price_daily,price_weekly,price_monthly,cover_image_url,image_urls,category,amenities,mode,published_at")
        .eq("status", "published")
        .eq("mode", "for_rent")
        .not("title", "ilike", "DEMO%")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(1);
      rental = fallback ?? [];
    }

    const saleListings = (sale ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      location: locationLabel(r),
      price: priceLabel(r),
      detail: shortDetail(r),
      image: r.cover_image_url || r.image_urls?.[0] || `${VENDIBOOK_BASE_URL}/placeholder.svg`,
      url: cardUrl(r.id),
    }));

    const r = rental?.[0];
    const featuredRental = r
      ? {
          id: r.id,
          title: r.title,
          location: locationLabel(r),
          price: priceLabel(r),
          amenities: (r.amenities ?? []).slice(0, 3),
          image: r.cover_image_url || r.image_urls?.[0] || `${VENDIBOOK_BASE_URL}/placeholder.svg`,
          url: cardUrl(r.id),
        }
      : null;

    return new Response(JSON.stringify({ saleListings, featuredRental }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-fetch-content error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
