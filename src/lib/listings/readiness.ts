/**
 * Post-publish listing depth: structured spec sections, scoring and readiness
 * labels. None of this is required to publish — it only deepens a listing that
 * is already live.
 */

export type SpecFieldType = 'text' | 'number' | 'boolean' | 'select';

export interface SpecField {
  key: string;
  label: string;
  type: SpecFieldType;
  help?: string;
  unit?: string;
  options?: string[];
  placeholder?: string;
}

export interface SpecSection {
  key: string;
  title: string;
  blurb: string;
  /** Listing categories this section applies to. Empty = all. */
  categories?: string[];
  /** 'rent' | 'sale' | undefined (both) */
  mode?: 'rent' | 'sale';
  weight: number;
  fields: SpecField[];
}

const MOBILE = ['food_truck', 'food_trailer'];
const KITCHEN = ['food_truck', 'food_trailer', 'ghost_kitchen'];
const SITE = ['vendor_lot', 'vendor_space'];

export const SPEC_SECTIONS: SpecSection[] = [
  {
    key: 'cooking',
    title: 'Cooking equipment',
    blurb: 'What a buyer can actually cook on, as it sits today.',
    categories: KITCHEN,
    weight: 12,
    fields: [
      { key: 'griddle', label: 'Griddle', type: 'text', placeholder: 'e.g. 36" flat top', help: 'Include size if you know it.' },
      { key: 'fryers', label: 'Fryers', type: 'text', placeholder: 'e.g. two 40 lb fryers' },
      { key: 'range_burners', label: 'Range burners', type: 'number', help: 'Number of open burners.' },
      { key: 'oven', label: 'Oven', type: 'text', placeholder: 'e.g. convection oven' },
      { key: 'other', label: 'Other cooking equipment', type: 'text' },
    ],
  },
  {
    key: 'refrigeration',
    title: 'Refrigeration',
    blurb: 'Cold storage tends to be the first question buyers ask.',
    categories: KITCHEN,
    weight: 10,
    fields: [
      { key: 'reach_in', label: 'Reach-in coolers', type: 'number' },
      { key: 'freezers', label: 'Freezers', type: 'number' },
      { key: 'prep_table', label: 'Refrigerated prep table', type: 'boolean' },
      { key: 'condition_notes', label: 'Condition notes', type: 'text', help: 'Anything a buyer should expect, good or bad.' },
    ],
  },
  {
    key: 'electrical',
    title: 'Electrical',
    blurb: 'Power tells a buyer where this unit can operate.',
    weight: 10,
    fields: [
      { key: 'shore_power', label: 'Shore power', type: 'select', options: ['None', '30 amp', '50 amp', '100 amp', 'Other'] },
      { key: 'generator', label: 'Generator', type: 'text', placeholder: 'e.g. 7kW Onan, 1,200 hours' },
      { key: 'inverter_battery', label: 'Inverter / battery bank', type: 'text' },
      { key: 'panel_notes', label: 'Panel notes', type: 'text' },
    ],
  },
  {
    key: 'propane',
    title: 'Propane',
    blurb: 'Tank sizes and whether tanks convey with the sale.',
    categories: KITCHEN,
    weight: 8,
    fields: [
      { key: 'tank_count', label: 'Number of tanks', type: 'number' },
      { key: 'tank_size_lbs', label: 'Tank size', type: 'number', unit: 'lb' },
      { key: 'tanks_included', label: 'Tanks included in sale', type: 'boolean' },
      { key: 'last_inspection', label: 'Last propane inspection', type: 'text' },
    ],
  },
  {
    key: 'plumbing',
    title: 'Water and plumbing',
    blurb: 'Tank capacities and sink configuration.',
    categories: KITCHEN,
    weight: 10,
    fields: [
      { key: 'fresh_water_gal', label: 'Fresh water tank', type: 'number', unit: 'gal' },
      { key: 'grey_water_gal', label: 'Grey water tank', type: 'number', unit: 'gal' },
      { key: 'water_heater', label: 'Water heater', type: 'text' },
      { key: 'sinks', label: 'Sink configuration', type: 'text', placeholder: 'e.g. 3-compartment plus hand sink' },
    ],
  },
  {
    key: 'hood',
    title: 'Hood and fire suppression',
    blurb: 'Health departments ask about this first.',
    categories: KITCHEN,
    weight: 10,
    fields: [
      { key: 'hood_type', label: 'Hood type', type: 'select', options: ['None', 'Type I', 'Type II'] },
      { key: 'hood_width_in', label: 'Hood width', type: 'number', unit: 'in' },
      { key: 'suppression_system', label: 'Fire suppression system', type: 'text', placeholder: 'e.g. Ansul, tagged 2025' },
      { key: 'grease_trap', label: 'Grease trap', type: 'boolean' },
    ],
  },
  {
    key: 'dimensions',
    title: 'Size and weight',
    blurb: 'Helps buyers plan towing, parking and permitting.',
    weight: 8,
    fields: [
      { key: 'box_length_ft', label: 'Box / usable length', type: 'number', unit: 'ft' },
      { key: 'overall_length_ft', label: 'Overall length', type: 'number', unit: 'ft' },
      { key: 'width_ft', label: 'Width', type: 'number', unit: 'ft' },
      { key: 'height_ft', label: 'Height', type: 'number', unit: 'ft' },
      { key: 'gvwr_lbs', label: 'GVWR', type: 'number', unit: 'lb', help: 'Gross vehicle weight rating from the door or tongue plate.' },
    ],
  },
  {
    key: 'mechanical',
    title: 'Mechanical and towing',
    blurb: 'Engine, drivetrain or trailer hardware.',
    categories: MOBILE,
    weight: 10,
    fields: [
      { key: 'engine', label: 'Engine', type: 'text' },
      { key: 'transmission', label: 'Transmission', type: 'text' },
      { key: 'axles', label: 'Axles', type: 'number' },
      { key: 'hitch_type', label: 'Hitch type', type: 'select', options: ['Bumper pull', 'Gooseneck', 'Fifth wheel', 'Not applicable'] },
      { key: 'tire_condition', label: 'Tire condition', type: 'text' },
    ],
  },
  {
    key: 'site',
    title: 'Site details',
    blurb: 'What a vendor gets when they pull onto the space.',
    categories: SITE,
    weight: 12,
    fields: [
      { key: 'surface', label: 'Surface', type: 'select', options: ['Paved', 'Gravel', 'Dirt', 'Grass', 'Mixed'] },
      { key: 'power_available', label: 'Power available', type: 'text' },
      { key: 'water_available', label: 'Water available', type: 'boolean' },
      { key: 'restrooms', label: 'Restrooms', type: 'boolean' },
      { key: 'foot_traffic', label: 'Typical foot traffic', type: 'text' },
    ],
  },
  {
    key: 'inspections',
    title: 'Inspections and paperwork',
    blurb: 'Only list what you actually have on hand.',
    weight: 10,
    fields: [
      { key: 'title_status', label: 'Title status', type: 'select', options: ['Clean title in hand', 'Lien on title', 'Bill of sale only', 'Not applicable'] },
      { key: 'health_permit', label: 'Current health permit', type: 'text' },
      { key: 'fire_inspection', label: 'Fire inspection date', type: 'text' },
      { key: 'service_records', label: 'Service records available', type: 'boolean' },
    ],
  },
  {
    key: 'inclusions',
    title: 'What conveys',
    blurb: 'Set expectations so nothing is a surprise at handoff.',
    weight: 8,
    fields: [
      { key: 'smallwares', label: 'Smallwares and pans', type: 'boolean' },
      { key: 'pos_system', label: 'POS system', type: 'text' },
      { key: 'signage_wrap', label: 'Signage / wrap included', type: 'boolean' },
      { key: 'excluded_items', label: 'Items not included', type: 'text' },
    ],
  },
  {
    key: 'viewing',
    title: 'Viewing and handoff',
    blurb: 'How a serious buyer can see it in person.',
    weight: 6,
    fields: [
      { key: 'viewing_availability', label: 'When it can be viewed', type: 'text' },
      { key: 'test_drive', label: 'Test drive or power-up allowed', type: 'boolean' },
      { key: 'transport_help', label: 'Transport help available', type: 'text' },
    ],
  },
];

export const sectionsForListing = (category?: string | null, mode?: string | null): SpecSection[] =>
  SPEC_SECTIONS.filter(
    (s) =>
      (!s.categories || (category ? s.categories.includes(category) : true)) &&
      (!s.mode || s.mode === mode),
  );

export type SpecValues = Record<string, Record<string, unknown>>;

const filled = (v: unknown) =>
  v !== undefined && v !== null && v !== '' && !(typeof v === 'boolean' && v === false);

export const sectionFilledCount = (section: SpecSection, values: SpecValues): number => {
  const bucket = values[section.key] ?? {};
  return section.fields.filter((f) => filled(bucket[f.key])).length;
};

export type ReadinessLevel = 'published' | 'buyer_ready' | 'highly_detailed';

export interface ReadinessResult {
  score: number;
  level: ReadinessLevel;
  missingSections: string[];
  version: number;
}

/**
 * Deterministic scoring definition version. Bump whenever section weights,
 * fields or thresholds change so stored scores can be recomputed instead of
 * silently compared across definitions.
 */
export const READINESS_SCORE_VERSION = 1;

/** Score thresholds, part of the versioned definition. */
export const READINESS_THRESHOLDS = { buyer_ready: 40, highly_detailed: 80 } as const;

export const READINESS_LABELS: Record<ReadinessLevel, string> = {
  published: 'Published',
  buyer_ready: 'Buyer ready',
  highly_detailed: 'Highly detailed',
};

export const READINESS_LEVEL_BLURBS: Record<ReadinessLevel, string> = {
  published: 'Live with the essential information buyers need to reach you.',
  buyer_ready: 'Live with the major details most buyers ask about.',
  highly_detailed: 'Live with comprehensive details for this type of listing.',
};

/** Required, reusable seller-information disclaimer. */
export const READINESS_DISCLAIMER =
  'Information provided by the seller. Buyers must independently verify condition, ownership, title, permits, inspections, and local requirements.';

export const computeReadiness = (
  sections: SpecSection[],
  values: SpecValues,
): ReadinessResult => {
  // Only sections relevant to this listing's category and mode are passed in,
  // so non-applicable fields can never lower the score.
  const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0) || 1;
  let earned = 0;
  const missing: string[] = [];

  for (const section of sections) {
    const count = sectionFilledCount(section, values);
    const ratio = section.fields.length ? count / section.fields.length : 0;
    earned += ratio * section.weight;
    if (ratio < 0.5) missing.push(section.key);
  }

  const score = Math.round((earned / totalWeight) * 100);
  const level: ReadinessLevel =
    score >= READINESS_THRESHOLDS.highly_detailed
      ? 'highly_detailed'
      : score >= READINESS_THRESHOLDS.buyer_ready
        ? 'buyer_ready'
        : 'published';

  return { score, level, missingSections: missing, version: READINESS_SCORE_VERSION };
};

/**
 * Highest-value next actions for a live listing. Each one explains the buyer
 * benefit and deep-links into a single section that saves independently.
 */
export interface NextAction {
  /** Spec section key, or 'rental_terms' for the rental terms editor. */
  section: string;
  title: string;
  why: string;
}

const NEXT_ACTION_LIBRARY: NextAction[] = [
  {
    section: 'electrical',
    title: 'Add power information',
    why: 'Buyers need to know what power this runs on before they can plan where to operate it.',
  },
  {
    section: 'plumbing',
    title: 'Add water capacity',
    why: 'Fresh and grey water capacity decides which events and health departments will accept it.',
  },
  {
    section: 'cooking',
    title: 'Describe installed equipment',
    why: 'The equipment list is the first thing a buyer compares against their menu.',
  },
  {
    section: 'hood',
    title: 'Add hood and fire suppression',
    why: 'Health and fire inspectors ask about this first, so buyers ask too.',
  },
  {
    section: 'inclusions',
    title: 'Confirm what is included',
    why: 'Setting expectations early prevents surprises and back-and-forth at handoff.',
  },
  {
    section: 'inspections',
    title: 'Add inspection and maintenance',
    why: 'Recent service and inspection history gives serious buyers confidence.',
  },
  {
    section: 'viewing',
    title: 'Add viewing and testing',
    why: 'Buyers move faster when they know how they can see and test it in person.',
  },
  {
    section: 'rental_terms',
    title: 'Complete rental terms',
    why: 'Clear terms let renters book without messaging you for the basics.',
  },
];

/** Returns the ordered next actions that still apply to this listing. */
export const nextActionsForListing = (
  category: string | null | undefined,
  mode: string | null | undefined,
  values: SpecValues,
  rentalTermsConfirmed = false,
): NextAction[] => {
  const applicable = new Set(sectionsForListing(category, mode).map((s) => s.key));
  return NEXT_ACTION_LIBRARY.filter((action) => {
    if (action.section === 'rental_terms') {
      return mode === 'rent' && !rentalTermsConfirmed;
    }
    if (!applicable.has(action.section)) return false;
    const section = SPEC_SECTIONS.find((s) => s.key === action.section);
    if (!section) return false;
    return sectionFilledCount(section, values) < Math.ceil(section.fields.length / 2);
  });
};

