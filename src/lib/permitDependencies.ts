/**
 * Hard-coded permit ordering + dependency map per business type.
 *
 * Matching is fuzzy: we look at lowercased item title + category for keyword hits.
 * This means it works against both the AI's response and our baseline checklist
 * without needing perfectly stable titles.
 *
 * Order of `SEQUENCE` is the order of operations — earlier items unlock later ones.
 */

export type PermitNodeKey =
  | 'business_entity'
  | 'ein'
  | 'sales_tax'
  | 'food_handler'
  | 'food_manager'
  | 'commissary'
  | 'health_permit'
  | 'fire_inspection'
  | 'mobile_vendor_license'
  | 'city_business_license'
  | 'vending_permit'
  | 'general_liability'
  | 'commercial_auto'
  | 'workers_comp'
  | 'vehicle_registration'
  | 'other';

interface MatchRule {
  key: PermitNodeKey;
  any: RegExp[];
}

// Order matters — first match wins.
const RULES: MatchRule[] = [
  { key: 'business_entity', any: [/llc/i, /dba/i, /business entity/i, /sole prop/i, /corporation commission/i, /secretary of state/i] },
  { key: 'ein', any: [/\bein\b/i, /federal tax id/i, /irs/i] },
  { key: 'sales_tax', any: [/sales tax/i, /transaction privilege/i, /\btpt\b/i, /seller'?s permit/i, /resale/i] },
  { key: 'food_handler', any: [/food handler/i] },
  { key: 'food_manager', any: [/food (protection )?manager/i, /servsafe/i, /certified food protection/i] },
  { key: 'commissary', any: [/commissary/i, /base of operations/i, /base-of-operations/i, /commercial kitchen agreement/i] },
  { key: 'health_permit', any: [/health permit/i, /plan review/i, /mobile food permit/i, /mobile food unit/i, /health department permit/i] },
  { key: 'fire_inspection', any: [/fire (marshal|inspection|department)/i, /lp[- ]?gas/i, /suppression/i, /hood/i] },
  { key: 'mobile_vendor_license', any: [/mobile vendor/i, /street vendor/i, /peddler/i, /dshs (license|permit)/i, /statewide.*license/i] },
  { key: 'city_business_license', any: [/business license/i, /city license/i, /business services/i] },
  { key: 'vending_permit', any: [/vending/i, /right[- ]?of[- ]?way/i, /park.*permit/i, /sidewalk/i] },
  { key: 'general_liability', any: [/general liability/i, /\bgl\b insurance/i, /liability insurance/i] },
  { key: 'commercial_auto', any: [/commercial auto/i, /auto insurance/i] },
  { key: 'workers_comp', any: [/workers'? comp/i] },
  { key: 'vehicle_registration', any: [/vehicle registration/i, /dmv/i, /commercial vehicle/i] },
];

export function classifyPermit(title: string, category?: string): PermitNodeKey {
  const haystack = `${title} ${category || ''}`;
  for (const rule of RULES) {
    if (rule.any.some((re) => re.test(haystack))) return rule.key;
  }
  return 'other';
}

/**
 * Standard order of operations for a food-truck-style business.
 * Earlier items are prerequisites for the later ones (in roadmap order).
 */
const FOOD_TRUCK_SEQUENCE: PermitNodeKey[] = [
  'business_entity',
  'ein',
  'sales_tax',
  'food_handler',
  'food_manager',
  'commissary',
  'fire_inspection',
  'health_permit',
  'mobile_vendor_license',
  'city_business_license',
  'vending_permit',
  'vehicle_registration',
  'commercial_auto',
  'general_liability',
  'workers_comp',
];

/**
 * Explicit hard dependencies (what blocks what).
 * Key = blocked node, value = list of nodes that must complete first.
 * Anything not listed here only follows soft sequence ordering.
 */
const FOOD_TRUCK_DEPS: Partial<Record<PermitNodeKey, PermitNodeKey[]>> = {
  sales_tax: ['business_entity'],
  health_permit: ['commissary', 'food_handler'],
  mobile_vendor_license: ['health_permit', 'fire_inspection'],
  city_business_license: ['business_entity'],
  vending_permit: ['city_business_license'],
  commercial_auto: ['vehicle_registration'],
};

const COTTAGE_FOOD_SEQUENCE: PermitNodeKey[] = [
  'business_entity', 'ein', 'sales_tax', 'food_handler', 'health_permit', 'general_liability',
];

const COTTAGE_FOOD_DEPS: Partial<Record<PermitNodeKey, PermitNodeKey[]>> = {
  sales_tax: ['business_entity'],
  health_permit: ['food_handler'],
};

const CATERING_SEQUENCE: PermitNodeKey[] = [
  'business_entity', 'ein', 'sales_tax', 'food_handler', 'food_manager', 'commissary',
  'health_permit', 'city_business_license', 'general_liability', 'workers_comp',
];

const CATERING_DEPS: Partial<Record<PermitNodeKey, PermitNodeKey[]>> = {
  sales_tax: ['business_entity'],
  health_permit: ['commissary', 'food_handler'],
  city_business_license: ['business_entity'],
};

export function getDependencyMap(businessType?: string): {
  sequence: PermitNodeKey[];
  deps: Partial<Record<PermitNodeKey, PermitNodeKey[]>>;
} {
  const bt = (businessType || '').toLowerCase();
  if (bt.includes('cottage')) return { sequence: COTTAGE_FOOD_SEQUENCE, deps: COTTAGE_FOOD_DEPS };
  if (bt.includes('catering')) return { sequence: CATERING_SEQUENCE, deps: CATERING_DEPS };
  // food_truck / food_trailer / food_cart / ghost_kitchen / vendor_lot default
  return { sequence: FOOD_TRUCK_SEQUENCE, deps: FOOD_TRUCK_DEPS };
}

/**
 * Operator-voice pro tips by permit type. These are hard-won insights —
 * the differentiator vs a generic government lookup.
 */
export const PERMIT_PRO_TIPS: Record<PermitNodeKey, string> = {
  business_entity: "Form the LLC online — most states issue same-week. Don't pay a third-party service hundreds for what's a $50–$150 state filing.",
  ein: "Free, instant, online at IRS.gov. Skip any site that charges for this — it's a scam.",
  sales_tax: "Most food trucks miss this until their first audit. Register before your first sale, even pop-ups.",
  food_handler: "Pima and Maricopa County (AZ) only accept accredited training (ANSI). The free $7 online cards from other states won't be honored — check before you pay.",
  food_manager: "ServSafe Manager is good for 5 years and accepted nationwide. Take it once, keep the cert in your truck.",
  commissary: "Get this signed and emailed before you apply for the health permit. Most counties won't even open your application without it. Call 3 commissaries — pricing varies wildly.",
  health_permit: "Plan review is the slow step (2–4 weeks). Submit drawings of your truck layout, equipment list, and water/waste system early.",
  fire_inspection: "The #1 failure point: clearance around the propane tank, K-class extinguisher, and Ansul system tag inside 12 months. Pre-inspect yourself with the checklist your fire marshal publishes.",
  mobile_vendor_license: "In Texas after July 2026 this replaces local permits statewide (HB 2844). In Arizona, there's no state-level equivalent — it's all county.",
  city_business_license: "Cheap and quick, but often required to be visible inside the truck. Print and laminate.",
  vending_permit: "Only needed if you're on public property (sidewalks, parks, public events). Private events and brewery lots don't require this.",
  general_liability: "$1M/$2M general liability is the standard ask from breweries, festivals, and commissaries. FLIP is the most common food-vendor-specific policy.",
  commercial_auto: "Personal auto won't cover a commercial truck. If you get pulled over and they see signage, expect a citation. Get a commercial policy before you drive it for business.",
  workers_comp: "Required in most states the moment you hire your first W-2 employee. Family members on payroll often count.",
  vehicle_registration: "Most states require commercial plates for trucks operating for business. Some allow regular plates for trailers — check your DMV.",
  other: '',
};

/**
 * Friendly unlock reason shown on locked items.
 */
export function unlockReason(blockingTitles: string[]): string {
  if (blockingTitles.length === 0) return '';
  if (blockingTitles.length === 1) return `Unlocks after: ${blockingTitles[0]}`;
  return `Unlocks after: ${blockingTitles.slice(0, -1).join(', ')} and ${blockingTitles.slice(-1)[0]}`;
}
