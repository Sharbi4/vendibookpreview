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
];

const CATEGORY_LABELS: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
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

export async function fetchMerchantRows(): Promise<string[][]> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, description, cover_image_url, price_sale, category, mode, city, state, condition, updated_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .is("deleted_at", null)
    .eq("moderation_status", "clear")
    .eq("mode", "sale")
    .in("category", ["food_truck", "food_trailer"])
    .not("title", "ilike", "demo%")
    .not("price_sale", "is", null)
    .not("cover_image_url", "is", null)
    .gt("price_sale", 0)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  return (listings || [])
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

      const description = sanitizeField(removeEmojis(stripHtml(l.description || "")).slice(0, 5000));

      return [
        sanitizeField(l.id),
        sanitizeField(title.slice(0, 150)),
        description,
        "in_stock",
        "",
        "",
        `${SITE_URL}/listing/${l.id}`,
        "",
        l.cover_image_url || "",
        `${Number(l.price_sale).toFixed(2)} USD`,
        "",
        "",
        "no",
        "",
        "",
        sanitizeField(brandName),
        "",
        "",
        "",
        condition,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "1",
      ];
    });
}
