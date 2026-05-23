/**
 * Generates google-merchant-feed.tsv for Google Merchant Center.
 * Runs at predev + prebuild alongside sitemap generation.
 *
 * Only includes SALE listings for food_truck and food_trailer categories
 * that are published, non-demo, have price, image, and description.
 *
 * Output: public/google-merchant-feed.tsv
 *
 * After deployment, paste this URL into Google Merchant Center:
 *   https://vendibook.com/google-merchant-feed.tsv
 *
 * Merchant Center steps:
 *   1. Go to Products > Data sources
 *   2. Choose "Add product source"
 *   3. Choose "Add products from a file"
 *   4. Choose "Enter a link to your file"
 *   5. Paste https://vendibook.com/google-merchant-feed.tsv
 *   6. Set schedule to fetch every 24 hours
 *   7. Save and review diagnostics
 */
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://vendibook.com";
const SUPABASE_URL = "https://nbrehbwfsmedbelzntqs.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30.EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU";

interface SaleListing {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  mode: string | null;
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
  price_sale: number | null;
  condition: string | null;
  brand: string | null;
  make: string | null;
  manufacturer: string | null;
  updated_at: string | null;
}

const INVALID_BRAND_VALUES = new Set([
  "", "n/a", "na", "unknown", "undefined", "null", "none", "other", "test", "-", "—",
]);

function sanitizeBrand(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed.length === 0 || INVALID_BRAND_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed.slice(0, 100);
}

function resolveListingBrand(listing: SaleListing): string {
  const brand = sanitizeBrand(listing.brand);
  if (brand) return brand;
  const make = sanitizeBrand(listing.make);
  if (make) return make;
  const manufacturer = sanitizeBrand(listing.manufacturer);
  if (manufacturer) return manufacturer;

  switch (listing.category) {
    case "food_truck": return "Custom Food Truck";
    case "food_trailer": return "Custom Food Trailer";
    default: return "Commercial Food Business Asset";
  }
}

function tsvEscape(val: string): string {
  // TSV: replace tabs and newlines with spaces, no quoting needed per Google spec
  return val.replace(/[\t\r\n]+/g, " ").trim();
}

async function fetchSaleListings(): Promise<SaleListing[]> {
  // Fetch only published sale listings for food_truck and food_trailer
  // Note: condition, brand, make, manufacturer may not exist in DB yet — handled gracefully
  const url = `${SUPABASE_URL}/rest/v1/listings?select=id,title,description,category,mode,city,state,cover_image_url,price_sale,updated_at&status=eq.published&mode=eq.sale&published_at=not.is.null&title=not.ilike.demo*&price_sale=not.is.null&cover_image_url=not.is.null&category=in.(food_truck,food_trailer)&limit=1000`;
  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  }
  const raw = (await res.json()) as any[];
  // Map to SaleListing with defaults for potentially missing columns
  return raw.map((r) => ({
    ...r,
    condition: r.condition ?? null,
    brand: r.brand ?? null,
    make: r.make ?? null,
    manufacturer: r.manufacturer ?? null,
  })) as SaleListing[];
}

function buildMerchantFeed(listings: SaleListing[]): string {
  const HEADER = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    "availability",
    "price",
    "condition",
    "brand",
    "product_type",
    "google_product_category",
    "custom_label_0",
    "custom_label_1",
  ].join("\t");

  const rows = listings
    .filter((l) => {
      // Final eligibility checks
      if (!l.title || !l.description || !l.price_sale || !l.cover_image_url) return false;
      if (l.price_sale <= 0) return false;
      if (l.description.length < 20) return false;
      if (!/^https?:\/\//i.test(l.cover_image_url)) return false;
      return true;
    })
    .map((l) => {
      const categoryLabel = l.category === "food_truck" ? "Food Truck" : "Food Trailer";
      const location = [l.city, l.state].filter(Boolean).join(", ");
      const condition = l.condition === "new" ? "new" : l.condition === "refurbished" ? "refurbished" : "used";
      const brandName = resolveListingBrand(l);

      // Build rich title: "{{title}} - {{Category}} for Sale in {{city, state}}"
      const title = location
        ? `${l.title} - ${categoryLabel} for Sale in ${location}`
        : `${l.title} - ${categoryLabel} for Sale`;

      // Clean description: remove excessive whitespace, max 5000 chars
      const description = (l.description || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000);

      const productType = l.category === "food_truck"
        ? "Food Trucks > Food Trucks for Sale"
        : "Food Trailers > Food Trailers for Sale";

      const cols = [
        l.id,                                                       // id
        tsvEscape(title.slice(0, 150)),                             // title
        tsvEscape(description),                                     // description
        `${BASE_URL}/listing/${l.id}`,                              // link
        l.cover_image_url,                                          // image_link
        "in_stock",                                                 // availability
        `${Number(l.price_sale).toFixed(2)} USD`,                   // price
        condition,                                                  // condition
        tsvEscape(brandName),                                       // brand
        productType,                                                // product_type
        "Business & Industrial > Food Service > Food Service Equipment", // google_product_category
        l.category === "food_truck" ? "food-truck" : "food-trailer", // custom_label_0
        location || "US",                                           // custom_label_1
      ];

      return cols.join("\t");
    });

  return [HEADER, ...rows].join("\n") + "\n";
}

async function main() {
  try {
    const listings = await fetchSaleListings();
    const tsv = buildMerchantFeed(listings);

    const eligibleCount = tsv.split("\n").length - 2; // minus header and trailing newline

    mkdirSync(resolve("public"), { recursive: true });
    writeFileSync(resolve("public/google-merchant-feed.tsv"), tsv);

    console.log(
      `[merchant-feed] wrote google-merchant-feed.tsv (${eligibleCount} eligible sale listings)`,
    );
  } catch (err) {
    // Never fail the build over merchant feed generation
    console.warn(`[merchant-feed] generation failed: ${(err as Error).message}`);
    // Write empty valid TSV with header only
    try {
      mkdirSync(resolve("public"), { recursive: true });
      writeFileSync(
        resolve("public/google-merchant-feed.tsv"),
        "id\ttitle\tdescription\tlink\timage_link\tavailability\tprice\tcondition\tbrand\tproduct_type\tgoogle_product_category\tcustom_label_0\tcustom_label_1\n",
      );
    } catch {
      /* ignore */
    }
  }
}

main();
