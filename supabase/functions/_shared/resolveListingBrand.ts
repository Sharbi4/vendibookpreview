/**
 * Shared brand resolution logic for Supabase Edge Functions.
 * Used by seo-prerender and google-merchant-feed to ensure consistency.
 *
 * Rules:
 * - Never invent GTIN, MPN, or VIN.
 * - Never claim Vendibook is the brand unless Vendibook actually owns/manufactures the item.
 * - Sanitize output: no "N/A", "unknown", "undefined", "null", or empty strings.
 */

const INVALID_BRAND_VALUES = new Set([
  "", "n/a", "na", "unknown", "undefined", "null", "none", "other", "test", "-", "—",
]);

function sanitize(val: string | null | undefined): string | null {
  if (!val) return null;
  const t = val.trim();
  if (t.length === 0 || INVALID_BRAND_VALUES.has(t.toLowerCase())) return null;
  return t.slice(0, 100);
}

export function resolveListingBrand(listing: any): string {
  const brand = sanitize(listing.brand);
  if (brand) return brand;

  const make = sanitize(listing.make);
  if (make) return make;

  const manufacturer = sanitize(listing.manufacturer);
  if (manufacturer) return manufacturer;

  // Note: host_business_name is on the profiles table, not listings.
  // If you need this, join profiles in your query first.

  switch (listing.category) {
    case "food_truck": return "Custom Food Truck";
    case "food_trailer": return "Custom Food Trailer";
    case "ghost_kitchen": return "Shared Kitchen";
    case "vendor_lot":
    case "vendor_space": return "Vendor Space";
    default: return "Commercial Food Business Asset";
  }
}
