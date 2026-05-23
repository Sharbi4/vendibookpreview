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

interface ExclusionReason {
  reason: string;
  count: number;
}

const INVALID_BRAND_VALUES = new Set([
  "", "n/a", "na", "unknown", "undefined", "null", "none", "other", "test", "-", "—",
]);

// Remove emojis from text
function removeEmojis(text: string): string {
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
}

// Remove HTML tags from text
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

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

function buildMerchantFeed(listings: SaleListing[]): { tsv: string; stats: { total: number; eligible: number; excluded: number; reasons: ExclusionReason[] } } {
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
  ].join("\t");

  const exclusionReasons: Map<string, number> = new Map();
  const trackExclusion = (reason: string) => {
    exclusionReasons.set(reason, (exclusionReasons.get(reason) || 0) + 1);
  };

  const rows = listings
    .filter((l) => {
      // Strict eligibility checks with reason tracking
      if (!l.title) {
        trackExclusion("Missing title");
        return false;
      }
      if (!l.description) {
        trackExclusion("Missing description");
        return false;
      }
      if (!l.price_sale) {
        trackExclusion("Missing price");
        return false;
      }
      if (!l.cover_image_url) {
        trackExclusion("Missing image");
        return false;
      }
      if (l.price_sale <= 0) {
        trackExclusion("Invalid price (<= 0)");
        return false;
      }
      if (l.description.length < 20) {
        trackExclusion("Description too short (< 20 chars)");
        return false;
      }
      if (!/^https?:\/\//i.test(l.cover_image_url)) {
        trackExclusion("Invalid image URL (not https)");
        return false;
      }
      // Exclude rentals (should be filtered by query, but double-check)
      if (l.mode !== "sale") {
        trackExclusion("Not a sale listing");
        return false;
      }
      // Exclude wrong categories
      if (l.category !== "food_truck" && l.category !== "food_trailer") {
        trackExclusion("Invalid category (not food_truck or food_trailer)");
        return false;
      }
      return true;
    })
    .map((l) => {
      const categoryLabel = l.category === "food_truck" ? "Food Truck" : "Food Trailer";
      const location = [l.city, l.state].filter(Boolean).join(", ");
      const condition = l.condition === "new" ? "new" : l.condition === "refurbished" ? "refurbished" : "used";
      const brandName = resolveListingBrand(l);

      // Build clean title: "{{title}} - {{Category}} for Sale in {{city, state}}"
      // Remove emojis, limit to 150 chars
      const cleanTitle = removeEmojis(l.title);
      const title = location
        ? `${cleanTitle} - ${categoryLabel} for Sale in ${location}`
        : `${cleanTitle} - ${categoryLabel} for Sale`;

      // Clean description: remove HTML, remove emojis, remove excessive whitespace, max 5000 chars
      const description = stripHtml(l.description || "");
      const cleanDescription = removeEmojis(description)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000);

      const productType = l.category === "food_truck"
        ? "Food Trucks > Food Trucks for Sale"
        : "Food Trailers > Food Trailers for Sale";

      const cols = [
        l.id,                                                       // id
        tsvEscape(title.slice(0, 150)),                             // title (max 150 chars)
        tsvEscape(cleanDescription),                                 // description
        `${BASE_URL}/listing/${l.id}`,                              // link
        l.cover_image_url,                                          // image_link
        "in_stock",                                                 // availability
        `${Number(l.price_sale).toFixed(2)} USD`,                   // price (format: 45000.00 USD)
        condition,                                                  // condition
        tsvEscape(brandName),                                       // brand
        productType,                                                // product_type
      ];

      return cols.join("\t");
    });

  const tsv = [HEADER, ...rows].join("\n") + "\n";

  const reasons: ExclusionReason[] = Array.from(exclusionReasons.entries()).map(([reason, count]) => ({ reason, count }));

  return {
    tsv,
    stats: {
      total: listings.length,
      eligible: rows.length,
      excluded: listings.length - rows.length,
      reasons,
    },
  };
}

function validateFeed(tsv: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = tsv.split("\n").filter(line => line.trim());

  if (lines.length < 1) {
    errors.push("Feed is empty");
    return { valid: false, errors };
  }

  const header = lines[0].split("\t");
  const expectedHeader = ["id", "title", "description", "link", "image_link", "availability", "price", "condition", "brand", "product_type"];

  if (header.length !== expectedHeader.length) {
    errors.push(`Header column count mismatch: expected ${expectedHeader.length}, got ${header.length}`);
  }

  for (let i = 0; i < expectedHeader.length; i++) {
    if (header[i] !== expectedHeader[i]) {
      errors.push(`Header column ${i} mismatch: expected "${expectedHeader[i]}", got "${header[i]}"`);
    }
  }

  // Validate data rows
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length !== header.length) {
      errors.push(`Row ${i} column count mismatch: expected ${header.length}, got ${cols.length}`);
      continue;
    }

    const [id, title, description, link, imageLink, availability, price, condition, brand] = cols;

    // Check required fields
    if (!id || !title || !description || !link || !imageLink || !availability || !price || !condition || !brand) {
      errors.push(`Row ${i}: missing required field(s)`);
    }

    // Validate price format: 45000.00 USD
    if (!/^\d+\.\d{2} USD$/.test(price)) {
      errors.push(`Row ${i}: invalid price format "${price}" (expected "45000.00 USD")`);
    }

    // Validate availability
    if (!["in_stock", "out_of_stock", "preorder", "backorder"].includes(availability)) {
      errors.push(`Row ${i}: invalid availability "${availability}"`);
    }

    // Validate condition
    if (!["new", "used", "refurbished"].includes(condition)) {
      errors.push(`Row ${i}: invalid condition "${condition}"`);
    }

    // Validate link format
    if (!link.startsWith("https://vendibook.com/listing/")) {
      errors.push(`Row ${i}: invalid link format "${link}"`);
    }

    // Validate image link format
    if (!imageLink.startsWith("https://")) {
      errors.push(`Row ${i}: invalid image link format "${imageLink}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

async function main() {
  try {
    const listings = await fetchSaleListings();
    const { tsv, stats } = buildMerchantFeed(listings);

    // Validate the feed
    const validation = validateFeed(tsv);

    mkdirSync(resolve("public"), { recursive: true });
    writeFileSync(resolve("public/google-merchant-feed.tsv"), tsv);

    // Feed report
    console.log("\n=== Google Merchant Feed Report ===");
    console.log(`Total listings checked: ${stats.total}`);
    console.log(`Eligible listings included: ${stats.eligible}`);
    console.log(`Excluded listings: ${stats.excluded}`);
    if (stats.reasons.length > 0) {
      console.log("\nExclusion reasons:");
      stats.reasons.forEach(({ reason, count }) => {
        console.log(`  - ${reason}: ${count}`);
      });
    }
    console.log(`\nFeed path: public/google-merchant-feed.tsv`);
    console.log(`Public URL: https://vendibook.com/google-merchant-feed.tsv`);

    if (!validation.valid) {
      console.log("\n=== Feed Validation Errors ===");
      validation.errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log("\n✓ Feed validation passed");
    }
    console.log("===================================\n");
  } catch (err) {
    // Never fail the build over merchant feed generation
    console.warn(`[merchant-feed] generation failed: ${(err as Error).message}`);
    // Write empty valid TSV with header only
    try {
      mkdirSync(resolve("public"), { recursive: true });
      writeFileSync(
        resolve("public/google-merchant-feed.tsv"),
        "id\ttitle\tdescription\tlink\timage_link\tavailability\tprice\tcondition\tbrand\tproduct_type\n",
      );
      console.log("[merchant-feed] wrote empty feed (header only)");
    } catch {
      /* ignore */
    }
  }
}

main();
