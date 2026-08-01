// marketing-fetch-content — Pulls listings + featured rental for "The Vendibook Report"
// with full fallback logic: never returns empty card slots, never repeats rentals
// consecutively, and substitutes recruitment/browse CTAs when supply is too thin.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { VENDIBOOK_BASE_URL } from "../_shared/marketing-templates/constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function priceLabel(row: any): string {
  if (row.mode === "sale" && row.price_sale) return `$${Number(row.price_sale).toLocaleString()}`;
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
function cardUrl(id: string): string { return `${VENDIBOOK_BASE_URL}/listing/${id}`; }

function mapSale(r: any) {
  return {
    id: r.id, title: r.title, location: locationLabel(r), price: priceLabel(r),
    detail: shortDetail(r),
    image: r.cover_image_url || r.image_urls?.[0] || `${VENDIBOOK_BASE_URL}/placeholder.svg`,
    url: cardUrl(r.id),
  };
}
function mapRental(r: any, extraTagline?: string | null) {
  return {
    id: r.id, title: r.title, location: locationLabel(r), price: priceLabel(r),
    amenities: (r.amenities ?? []).slice(0, 3),
    image: r.cover_image_url || r.image_urls?.[0] || `${VENDIBOOK_BASE_URL}/placeholder.svg`,
    url: cardUrl(r.id),
    extraTagline: extraTagline ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ----- Determine "since last send" timestamp + previous featured rental -----
    const { data: lastSend } = await supabase
      .from("email_sends")
      .select("sent_at, featured_rental_id")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sinceIso = lastSend?.sent_at ?? new Date(Date.now() - 7 * 86400_000).toISOString();
    const lastRentalId: string | null = lastSend?.featured_rental_id ?? null;

    // ----- FOR SALE -----
    // Step 1: new for-sale listings since last send
    const { data: newSale } = await supabase
      .from("listings")
      .select("id,title,city,state,price_sale,cover_image_url,image_urls,category,subcategory,mode,published_at")
      .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear").eq("mode", "sale")
      .not("title", "ilike", "DEMO%")
      .not("published_at", "is", null)
      .gte("published_at", sinceIso)
      .order("published_at", { ascending: false })
      .limit(6);

    const newCount = newSale?.length ?? 0;

    // Section label rules
    let sectionLabelSale = "JUST LISTED";
    if (newCount >= 6) sectionLabelSale = "JUST LISTED";
    else if (newCount >= 1) sectionLabelSale = "RECENTLY LISTED";
    else sectionLabelSale = "FEATURED LISTINGS";

    // Fill remaining slots if needed
    let saleRows: any[] = newSale ?? [];
    if (saleRows.length < 6) {
      const need = 6 - saleRows.length;
      const excludeIds = saleRows.map(r => r.id);
      let fillQuery = supabase
        .from("listings")
        .select("id,title,city,state,price_sale,cover_image_url,image_urls,category,subcategory,mode,published_at")
        .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear").eq("mode", "sale")
        .not("title", "ilike", "DEMO%")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(need + 10);
      const { data: fill } = await fillQuery;
      const filtered = (fill ?? []).filter(r => !excludeIds.includes(r.id)).slice(0, need);
      saleRows = [...saleRows, ...filtered];
    }

    // Check overall active inventory
    const { count: totalActiveSale } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear").eq("mode", "sale")
      .not("title", "ilike", "DEMO%")
      .not("published_at", "is", null);

    let listingsSectionReplaced = false;
    let saleListings: any[] = [];
    let listingsReplacement: any = null;

    if ((totalActiveSale ?? 0) < 3) {
      listingsSectionReplaced = true;
      saleListings = [];
      listingsReplacement = {
        headline: "New listings dropping soon.",
        body: "Browse everything currently available on Vendibook.",
        ctaLabel: "Browse All Listings →",
        ctaUrl: `${VENDIBOOK_BASE_URL}/browse`,
      };
    } else {
      saleListings = saleRows.slice(0, 6).map(mapSale);
    }

    const usedFallbackListings = newCount < 6 && !listingsSectionReplaced;

    // ----- FEATURED RENTAL -----
    let sectionLabelRental = "FEATURED RENTAL — READY TO ROLL";
    let usedFallbackRental = false;
    let rentalSectionReplaced = false;
    let featuredRental: any = null;
    let rentalReplacement: any = null;

    // Step 1: new rental since last send
    const { data: newRental } = await supabase
      .from("listings")
      .select("id,title,city,state,price_hourly,price_daily,price_weekly,price_monthly,cover_image_url,image_urls,category,amenities,mode,published_at")
      .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear").eq("mode", "rent")
      .not("title", "ilike", "DEMO%")
      .not("published_at", "is", null)
      .gte("published_at", sinceIso)
      .order("published_at", { ascending: false })
      .limit(1);

    if (newRental && newRental.length > 0) {
      featuredRental = mapRental(newRental[0]);
      sectionLabelRental = "FEATURED RENTAL — READY TO ROLL";
    } else {
      // Step 2: most-recent active rental that wasn't featured last send
      const { data: candidates } = await supabase
        .from("listings")
        .select("id,title,city,state,price_hourly,price_daily,price_weekly,price_monthly,cover_image_url,image_urls,category,amenities,mode,published_at")
        .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear").eq("mode", "rent")
        .not("title", "ilike", "DEMO%")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(10);

      const list = candidates ?? [];
      if (list.length === 0) {
        // Zero rentals → host recruitment block
        rentalSectionReplaced = true;
        rentalReplacement = {
          headline: "Have a kitchen, trailer, or vendor space sitting idle?",
          body: "List it on Vendibook and start earning. Setup takes minutes.",
          ctaLabel: "List Your Space Free →",
          ctaUrl: `${VENDIBOOK_BASE_URL}/list-your-space`,
        };
      } else if (list.length === 1) {
        // Only one rental — feature it even if repeated
        featuredRental = mapRental(list[0], "Still available — inquire today");
        sectionLabelRental = "AVAILABLE NOW";
        usedFallbackRental = true;
      } else {
        const notLast = list.find(r => r.id !== lastRentalId) ?? list[0];
        featuredRental = mapRental(notLast);
        sectionLabelRental = "AVAILABLE NOW";
        usedFallbackRental = true;
      }
    }

    const bothThin = listingsSectionReplaced && rentalSectionReplaced;

    return new Response(JSON.stringify({
      saleListings,
      featuredRental,
      sectionLabelSale,
      sectionLabelRental,
      listingsReplacement,
      rentalReplacement,
      meta: {
        sinceIso,
        newSaleCount: newCount,
        totalActiveSale: totalActiveSale ?? 0,
        usedFallbackListings,
        usedFallbackRental,
        listingsSectionReplaced,
        rentalSectionReplaced,
        bothThin,
        lastRentalId,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-fetch-content error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
