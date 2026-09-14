import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveListingBrand } from "./resolveListingBrand.ts";

const SITE_URL = "https://vendibook.com";

export const MERCHANT_HEADER = [
  "id",
  "title",
  "description",
  "availability",
  "availability date",
  "expiration date",
  "link",
  "mobile link",
  "image link",
  "price",
  "sale price",
  "sale price effective date",
  "identifier exists",
  "gtin",
  "mpn",
  "brand",
  "product highlight",
  "product detail",
  "additional image link",
  "condition",
  "adult",
  "color",
  "size",
  "size type",
  "size system",
  "gender",
  "material",
  "pattern",
  "age group",
  "multipack",
  "is bundle",
  "unit pricing measure",
  "unit pricing base measure",
  "energy efficiency class",
  "min energy efficiency class",
  "min energy efficiency class",
  "item group id",
  "sell on google quantity",
  "google product category",
  "product type",
];

const CATEGORY_LABELS: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
};

// Google product taxonomy: Business & Industrial > Food Service
const GOOGLE_PRODUCT_CATEGORY = "Business & Industrial > Food Service";

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  needs_work: "Needs work",
};

function removeEmojis(text: string): string {
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

export function sanitizeField(val: string): string {
  if (!val) return "";
  let cleaned = val.replace(/[\t\r\n]/g, " ");
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  cleaned = cleaned.replace(/\s+/g, " ");
  return cleaned.trim();
}

// Values inside "product highlight" / "product detail" are comma-separated,
// so commas must not appear inside an individual value.
function noCommas(val: string): string {
  return sanitizeField(val).replace(/,/g, " -").replace(/\s+/g, " ").trim();
}

function inches(val: unknown): string | null {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  const feet = n / 12;
  return `${feet.toFixed(feet % 1 === 0 ? 0 : 1)} ft`;
}

export async function fetchMerchantRows(): Promise<string[][]> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: listings, error } = await supabase
    .from("listings")
    .select(
      "id, title, description, cover_image_url, image_urls, highlights, price_sale, category, subcategory, mode, city, state, postal_code, condition, operational_status, title_status, kitchen_build_year, length_inches, width_inches, height_inches, updated_at",
    )
    .eq("status", "published")
    .not("published_at", "is", null)
    .is("deleted_at", null)
    .eq("moderation_status", "clear")
    .eq("mode", "sale")
    .in("category", ["food_truck", "food_trailer"])
    .not("title", "ilike", "demo%")
    .not("title", "ilike", "test%")
    .not("title", "ilike", "sample%")
    .not("title", "ilike", "qa %")
    .not("price_sale", "is", null)
    .not("cover_image_url", "is", null)
    .gt("price_sale", 0)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  return (listings || [])
    .filter((l: any) => l.title && l.description && l.description.length >= 20)
    // Exclude seeded/mock listings that use stock photo libraries rather than real photos.
    .filter((l: any) => !/images\.unsplash\.com|pexels\.com|placehold|picsum\.photos/i.test(l.cover_image_url || ""))
    .map((l: any) => {
      const categoryLabel = CATEGORY_LABELS[l.category] || "Mobile Food Asset";
      const location = [l.city, l.state].filter(Boolean).join(", ");
      const brandName = resolveListingBrand(l);
      const condition = l.condition === "new" ? "new" : l.condition === "refurbished" ? "refurbished" : "used";

      const cleanTitle = removeEmojis(l.title || "");
      const title = location
        ? `${cleanTitle} - ${categoryLabel} for Sale in ${location}`
        : `${cleanTitle} - ${categoryLabel} for Sale`;

      const description = sanitizeField(removeEmojis(stripHtml(l.description || "")).slice(0, 5000));
      const link = `${SITE_URL}/listing/${l.id}`;

      const gallery: string[] = Array.isArray(l.image_urls) ? l.image_urls : [];
      const additionalImages = gallery
        .filter((u) => typeof u === "string" && u && u !== l.cover_image_url)
        .slice(0, 10)
        .join(",");

      const highlightSource: string[] = Array.isArray(l.highlights) ? l.highlights : [];
      const highlights = highlightSource
        .filter((h) => typeof h === "string" && h.trim().length > 0)
        .slice(0, 10)
        .map((h) => noCommas(h).slice(0, 150))
        .join(",");
      const fallbackHighlights = [
        `${categoryLabel} ready for business`,
        location ? `Located in ${noCommas(location)}` : "",
        l.condition ? `Condition: ${CONDITION_LABELS[l.condition] ?? "Used"}` : "",
      ].filter(Boolean).join(",");

      const details = [
        ["General", "Type", categoryLabel],
        ["General", "Condition", CONDITION_LABELS[l.condition] ?? "Used"],
        l.kitchen_build_year ? ["General", "Build year", String(l.kitchen_build_year)] : null,
        location ? ["General", "Location", location] : null,
        l.title_status ? ["General", "Title status", String(l.title_status).replace(/_/g, " ")] : null,
        l.operational_status ? ["General", "Operational status", String(l.operational_status).replace(/_/g, " ")] : null,
        inches(l.length_inches) ? ["Dimensions", "Length", inches(l.length_inches)!] : null,
        inches(l.width_inches) ? ["Dimensions", "Width", inches(l.width_inches)!] : null,
        inches(l.height_inches) ? ["Dimensions", "Height", inches(l.height_inches)!] : null,
      ]
        .filter(Boolean)
        .map((d) => (d as string[]).map(noCommas).join(":"))
        .join(",");

      const productType = `Food Trucks & Trailers > ${categoryLabel}s for Sale${location ? ` > ${noCommas(location)}` : ""}`;

      return [
        sanitizeField(l.id),
        sanitizeField(title.slice(0, 150)),
        description,
        "in_stock",
        "",
        "",
        link,
        link,
        l.cover_image_url || "",
        `${Number(l.price_sale).toFixed(2)} USD`,
        "",
        "",
        "no",
        "",
        "",
        sanitizeField(brandName),
        highlights || fallbackHighlights,
        details,
        additionalImages,
        condition,
        "no",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "no",
        "",
        "",
        "",
        "",
        "",
        "",
        "1",
        GOOGLE_PRODUCT_CATEGORY,
        sanitizeField(productType),
      ];
    });
}
