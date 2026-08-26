export type ListingMode = "rent" | "sale";

export interface ConciergeListingInput {
  mode?: unknown;
  category?: unknown;
  title?: unknown;
  description?: unknown;
  price_daily?: unknown;
  price_weekly?: unknown;
  price_monthly?: unknown;
  price_hourly?: unknown;
  city?: unknown;
  state?: unknown;
  postal_code?: unknown;
  image_urls?: unknown;
  cover_image_url?: unknown;
  subcategory?: unknown;
  fulfillment_type?: unknown;
}

const ALLOWED_MODES = new Set<ListingMode>(["rent", "sale"]);
const ALLOWED_CATEGORIES = new Set(["food_truck", "food_trailer"]);
const ALLOWED_FULFILLMENT = new Set(["pickup", "delivery", "both", "on_site"]);

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("Text fields must be strings.");
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error(`Text exceeds ${maxLength} characters.`);
  return normalized;
}

function optionalPrice(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${field} must be a positive number when provided.`);
  }
  return Math.round(numberValue * 100) / 100;
}

function imageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error("image_urls must be an array.");
  if (value.length > 30) throw new Error("A listing may contain at most 30 images.");

  return value.map((entry) => {
    if (typeof entry !== "string") throw new Error("Every image URL must be a string.");
    const normalized = entry.trim();
    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new Error("Every image must use a valid URL.");
    }
    if (parsed.protocol !== "https:") throw new Error("Every image must use HTTPS.");
    return normalized;
  });
}

/**
 * Builds the only listing payload the concierge endpoint may write.
 *
 * The intentionally narrow allowlist prevents inferred dimensions, equipment,
 * amenities, condition, pricing, and other claims from being copied from a
 * photo or added as an undocumented assumption. Unknown fields stay null.
 */
export function buildConciergeListing(input: ConciergeListingInput) {
  const mode = typeof input.mode === "string" ? input.mode.trim() as ListingMode : "";
  if (!ALLOWED_MODES.has(mode as ListingMode)) throw new Error("mode must be rent or sale.");

  const category = optionalText(input.category, 40);
  if (!category || !ALLOWED_CATEGORIES.has(category)) {
    throw new Error("category must be food_truck or food_trailer.");
  }

  const title = optionalText(input.title, 140);
  const description = optionalText(input.description, 5000);
  if (!title) throw new Error("A customer-provided title is required.");
  if (!description) throw new Error("A customer-provided description is required.");

  const images = imageUrls(input.image_urls);
  const cover = optionalText(input.cover_image_url, 2048);
  if (cover && !images.includes(cover)) {
    throw new Error("cover_image_url must also be present in image_urls.");
  }

  const fulfillmentType = optionalText(input.fulfillment_type, 30);
  if (fulfillmentType && !ALLOWED_FULFILLMENT.has(fulfillmentType)) {
    throw new Error("fulfillment_type is invalid.");
  }

  const listing = {
    mode,
    category,
    status: "draft",
    title,
    description,
    subcategory: optionalText(input.subcategory, 100),
    city: optionalText(input.city, 120),
    state: optionalText(input.state, 40),
    postal_code: optionalText(input.postal_code, 20),
    price_daily: optionalPrice(input.price_daily, "price_daily"),
    price_weekly: optionalPrice(input.price_weekly, "price_weekly"),
    price_monthly: optionalPrice(input.price_monthly, "price_monthly"),
    price_hourly: optionalPrice(input.price_hourly, "price_hourly"),
    image_urls: images,
    cover_image_url: cover ?? images[0] ?? null,
    fulfillment_type: fulfillmentType,
    // Explicit safe defaults; all unlisted structured fields remain blank.
    instant_book: false,
    featured_enabled: false,
    accepts_offers: false,
    accept_cash_payment: false,
    accept_paypal_checkout: false,
  };

  if (mode === "sale" && Object.values({
    daily: listing.price_daily,
    weekly: listing.price_weekly,
    monthly: listing.price_monthly,
    hourly: listing.price_hourly,
  }).some((value) => value !== null)) {
    throw new Error("Rental rates cannot be supplied for a sale listing.");
  }

  return listing;
}

export function randomUnsharedPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}