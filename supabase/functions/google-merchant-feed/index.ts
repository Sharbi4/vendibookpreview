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

const INVALID_BRAND_VALUES = new Set([
  "", "n/a", "na", "unknown", "undefined", "null", "none", "other", "test", "-", "—",
]);

function sanitizeBrand(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed.length === 0 || INVALID_BRAND_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed.slice(0, 100);
}

// Remove emojis from text
function removeEmojis(text: string): string {
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
}

// Remove HTML tags from text
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

// Strict TSV sanitization: remove tabs, line breaks, control characters
function sanitizeTsvField(val: string): string {
  if (!val) return "";
  let cleaned = val.replace(/[\t\r\n]/g, " ");
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  cleaned = cleaned.replace(/\s+/g, " ");
  return cleaned.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only include sale listings for food_truck and food_trailer with price and image
    const { data: listings, error } = await supabase
      .from("listings")
      .select("id, title, description, cover_image_url, price_sale, category, mode, city, state, updated_at")
      .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear")
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

    const HEADER = "id\ttitle\tdescription\tavailability\tavailability date\texpiration date\tlink\tmobile link\timage link\tprice\tsale price\tsale price effective date\tidentifier exists\tgtin\tmpn\tbrand\tproduct highlight\tproduct detail\tadditional image link\tcondition\tadult\tcolor\tsize\tsize type\tsize system\tgender\tmaterial\tpattern\tage group\tmultipack\tis bundle\tunit pricing measure\tunit pricing base measure\tenergy efficiency class\tmin energy efficiency class\tmin energy efficiency class\titem group id\tsell on google quantity";

    const rows = (listings || [])
      .filter((l: any) => l.title && l.description && l.description.length >= 20)
      .map((l: any) => {
        const categoryLabel = CATEGORY_LABELS[l.category] || "Mobile Food Asset";
        const location = [l.city, l.state].filter(Boolean).join(", ");
        const brandName = resolveListingBrand(l);
        const condition = l.condition === "new" ? "new" : l.condition === "refurbished" ? "refurbished" : "used";
        
        const cleanTitle = removeEmojis(l.title || "");
        const title = location
          ? `${cleanTitle} - ${categoryLabel} for Sale in ${location}`
          : `${cleanTitle} - ${categoryLabel} for Sale`;

        const description = stripHtml(l.description || "");
        const cleanDescription = sanitizeTsvField(removeEmojis(description).slice(0, 5000));

        const cols = [
          sanitizeTsvField(l.id),                                     // id
          sanitizeTsvField(title.slice(0, 150)),                      // title
          cleanDescription,                                           // description
          "in_stock",                                                 // availability
          "",                                                         // availability date
          "",                                                         // expiration date
          `${SITE_URL}/listing/${l.id}`,                              // link
          "",                                                         // mobile link
          l.cover_image_url || "",                                    // image link
          `${Number(l.price_sale).toFixed(2)} USD`,                   // price
          "",                                                         // sale price
          "",                                                         // sale price effective date
          "no",                                                       // identifier exists
          "",                                                         // gtin
          "",                                                         // mpn
          sanitizeTsvField(brandName),                                // brand
          "",                                                         // product highlight
          "",                                                         // product detail
          "",                                                         // additional image link
          condition,                                                  // condition
          "",                                                         // adult
          "",                                                         // color
          "",                                                         // size
          "",                                                         // size type
          "",                                                         // size system
          "",                                                         // gender
          "",                                                         // material
          "",                                                         // pattern
          "",                                                         // age group
          "",                                                         // multipack
          "",                                                         // is bundle
          "",                                                         // unit pricing measure
          "",                                                         // unit pricing base measure
          "",                                                         // energy efficiency class
          "",                                                         // min energy efficiency class
          "",                                                         // min energy efficiency class
          "",                                                         // item group id
          "1",                                                        // sell on google quantity
        ];

        return cols.join("\t");
      });

    const tsv = [HEADER, ...rows].join("\n") + "\n";

    return new Response(tsv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Merchant feed error:", error);
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
