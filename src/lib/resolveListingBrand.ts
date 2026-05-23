/**
 * Resolves a safe, truthful brand name for a listing's Product JSON-LD.
 *
 * Rules:
 * - Never invent GTIN, MPN, or VIN.
 * - Never claim Vendibook is the brand unless Vendibook actually owns/manufactures the item.
 * - Sanitize output: no "N/A", "unknown", "undefined", "null", or empty strings.
 * - The resolved brand should also be visible somewhere on the listing page.
 *
 * NOTE: Core logic is mirrored in supabase/functions/_shared/resolveListingBrand.ts for edge functions.
 * When updating the core fallback logic here, also update the shared module to keep them in sync.
 */

export interface BrandInput {
  category: string;
  brand?: string | null;
  make?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  host_business_name?: string | null;
  host_display_name?: string | null;
}

const INVALID_VALUES = new Set([
  '', 'n/a', 'na', 'unknown', 'undefined', 'null', 'none', 'other', 'test', '-', '—',
]);

function sanitize(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 100) return trimmed.slice(0, 100);
  if (INVALID_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

export function resolveListingBrand(input: BrandInput): string {
  const { category } = input;

  // Priority 1: Explicit brand/make/manufacturer fields
  const brand = sanitize(input.brand);
  if (brand) return brand;

  const make = sanitize(input.make);
  if (make) return make;

  const manufacturer = sanitize(input.manufacturer);
  if (manufacturer) return manufacturer;

  // Priority 2: Host/seller business name (for all categories)
  const hostBiz = sanitize(input.host_business_name);
  if (hostBiz) return hostBiz;

  const hostName = sanitize(input.host_display_name);
  if (hostName) return hostName;

  // Priority 3: Category-specific safe fallback
  switch (category) {
    case 'food_truck':
      return 'Custom Food Truck';
    case 'food_trailer':
      return 'Custom Food Trailer';
    case 'ghost_kitchen':
      return 'Shared Kitchen';
    case 'vendor_lot':
    case 'vendor_space':
      return 'Vendor Space';
    default:
      return 'Commercial Food Business Asset';
  }
}

/**
 * Returns a human-readable label for the brand field based on category.
 * Used for visible display on listing pages.
 */
export function getBrandFieldLabel(category: string): string {
  switch (category) {
    case 'food_truck':
    case 'food_trailer':
      return 'Brand / Maker';
    case 'ghost_kitchen':
    case 'vendor_lot':
    case 'vendor_space':
      return 'Host / Business';
    default:
      return 'Listing Type';
  }
}
