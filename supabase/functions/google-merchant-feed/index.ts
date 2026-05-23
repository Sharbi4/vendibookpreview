import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveListingBrand } from "../_shared/resolveListingBrand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://vendibook.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CATEGORY_LABELS: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only include sale listings for food_truck and food_trailer with price and image
    // Note: condition, brand, make, manufacturer may not exist in DB yet — omit from select
    // to avoid PostgREST 400 errors; resolveListingBrand handles nulls gracefully.
    const { data: listings, error } = await supabase
      .from("listings")
      .select("id, title, description, cover_image_url, price_sale, category, mode, city, state, updated_at")
      .eq("status", "published")
      .eq("mode", "sale")
      .in("category", ["food_truck", "food_trailer"])
      .not("published_at", "is", null)
      .not("title", "ilike", "demo%")
      .not("price_sale", "is", null)
      .not("cover_image_url", "is", null)
      .gt("price_sale", 0)
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) {
      throw error;
    }

    const items = (listings || [])
      .filter((l: any) => l.title && l.description && l.description.length >= 20)
      .map((l: any) => {
        const categoryLabel = CATEGORY_LABELS[l.category] || "Mobile Food Asset";
        const condition = l.condition === "new" ? "new" : l.condition === "refurbished" ? "refurbished" : "used";
        const location = [l.city, l.state].filter(Boolean).join(", ");
        const brandName = resolveListingBrand(l);
        const title = location
          ? `${l.title} - ${categoryLabel} for Sale in ${location}`
          : `${l.title} - ${categoryLabel} for Sale`;

        return `  <item>
    <g:id>${escapeXml(l.id)}</g:id>
    <g:title>${escapeXml(title.slice(0, 150))}</g:title>
    <g:description>${escapeXml((l.description || "").slice(0, 5000))}</g:description>
    <g:link>${SITE_URL}/listing/${l.id}</g:link>
    <g:image_link>${escapeXml(l.cover_image_url)}</g:image_link>
    <g:availability>in_stock</g:availability>
    <g:price>${Number(l.price_sale).toFixed(2)} USD</g:price>
    <g:condition>${condition}</g:condition>
    <g:brand>${escapeXml(brandName)}</g:brand>
    <g:google_product_category>Business &amp; Industrial &gt; Food Service &gt; Food Service Equipment</g:google_product_category>
    <g:product_type>Commercial Kitchen Equipment &gt; ${escapeXml(categoryLabel)}</g:product_type>
  </item>`;
      });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Vendibook - Food Trucks &amp; Trailers for Sale</title>
  <link>${SITE_URL}</link>
  <description>Marketplace listings for food trucks and food trailers for sale on Vendibook.</description>
${items.join("\n")}
</channel>
</rss>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Merchant feed error:", error);
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
