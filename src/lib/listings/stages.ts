/**
 * Phase 2 — Canonical six-stage self-service listing model.
 *
 * This module is the single source of truth for:
 *  - the six seller-facing stages,
 *  - how the wizard's existing internal steps roll up into those stages,
 *  - which basics/requirements apply to which category + mode.
 *
 * It intentionally does NOT create a new wizard. The production PublishWizard
 * keeps its internal step machine; this layer groups those steps so sellers see
 * six stages instead of nine screens.
 */

import type { ListingCategory } from '@/types/listing';

/**
 * Re-exported so listing modules (publish parity, wizard steps, Vendi) can pull
 * the category union from this stage layer without reaching past it.
 * `@/types/listing` remains the single definition.
 */
export type { ListingCategory };


export type ListingStageId =
  | 'what'
  | 'account'
  | 'details'
  | 'photos'
  | 'location'
  | 'confirm';

/** Internal wizard steps (must stay in sync with PublishWizard's PublishStep). */
export type WizardStepId =
  | 'basics'
  | 'photos'
  | 'headline'
  | 'includes'
  | 'pricing'
  | 'details'
  | 'location'
  | 'availability'
  | 'documents'
  | 'review';

export interface ListingStage {
  id: ListingStageId;
  label: string;
  shortLabel: string;
  helper: string;
}

export const LISTING_STAGES: ListingStage[] = [
  {
    id: 'what',
    label: 'What you have',
    shortLabel: 'What',
    helper:
      'Choose the option that best describes your equipment so we can ask only the questions that apply to it.',
  },
  {
    id: 'account',
    label: 'Your account',
    shortLabel: 'Account',
    helper:
      'Create an account or sign in so your answers are saved to you. Nothing you have entered is lost.',
  },
  {
    id: 'details',
    label: 'Details & price',
    shortLabel: 'Details',
    helper:
      'Describe what makes your equipment useful, what is included, and anything a buyer should know before contacting you.',
  },
  {
    id: 'photos',
    label: 'Photos',
    shortLabel: 'Photos',
    helper:
      'Clear photos help buyers understand the layout, equipment, condition, and overall value before scheduling a viewing.',
  },
  {
    id: 'location',
    label: 'Location & delivery',
    shortLabel: 'Location',
    helper:
      'Let buyers know where the equipment is located and how it can be picked up or delivered. Your complete address will remain private.',
  },
  {
    id: 'confirm',
    label: 'Confirm & publish',
    shortLabel: 'Confirm',
    helper: 'Review the buyer-facing listing, confirm the disclosures, and go live.',
  },
];

/** Roll-up from the wizard's internal steps to the seller-facing stage. */
export const STEP_TO_STAGE: Record<WizardStepId, ListingStageId> = {
  basics: 'what',
  headline: 'details',
  includes: 'details',
  pricing: 'details',
  details: 'details',
  photos: 'photos',
  location: 'location',
  availability: 'location',
  documents: 'location',
  review: 'confirm',
};

export function stageForStep(step: WizardStepId): ListingStageId {
  return STEP_TO_STAGE[step] ?? 'what';
}

/**
 * Stage order actually shown to a seller. The account stage only appears while
 * signed out, so signed-in sellers never see a blank screen or an inflated
 * progress count.
 */
export function visibleStages(opts: { signedIn: boolean }): ListingStage[] {
  return LISTING_STAGES.filter((s) => (s.id === 'account' ? !opts.signedIn : true));
}

// ─────────────────────────── Category capabilities ───────────────────────────

export const MOBILE_VEHICLE_CATEGORIES: ListingCategory[] = ['food_truck'];
export const TOWABLE_CATEGORIES: ListingCategory[] = ['food_trailer'];
export const STATIC_CATEGORIES: ListingCategory[] = [
  'ghost_kitchen',
  'vendor_lot',
  'vendor_space',
];

export interface CategoryBasics {
  /** Vehicle or trailer model year applies. */
  modelYear: boolean;
  /** Interior kitchen build/conversion year applies (separate from model year). */
  kitchenBuildYear: boolean;
  /** Exterior dimensions are essential for this category. */
  dimensions: boolean;
  /** Titled asset → title status + lien disclosure apply (sale only). */
  titled: boolean;
  /** Which operational-readiness question to ask. */
  readiness: 'drivable' | 'towable' | 'operational';
}

export function getCategoryBasics(category: ListingCategory): CategoryBasics {
  if (MOBILE_VEHICLE_CATEGORIES.includes(category)) {
    return {
      modelYear: true,
      kitchenBuildYear: true,
      dimensions: true,
      titled: true,
      readiness: 'drivable',
    };
  }
  if (TOWABLE_CATEGORIES.includes(category)) {
    return {
      modelYear: true,
      kitchenBuildYear: true,
      dimensions: true,
      titled: true,
      readiness: 'towable',
    };
  }
  return {
    modelYear: false,
    kitchenBuildYear: category === 'ghost_kitchen',
    dimensions: false,
    titled: false,
    readiness: 'operational',
  };
}

export function isTitledAsset(category: ListingCategory, mode: 'rent' | 'sale'): boolean {
  return mode === 'sale' && getCategoryBasics(category).titled;
}

export function isStaticCategory(category: ListingCategory): boolean {
  return STATIC_CATEGORIES.includes(category);
}

// ───────────────────────────── Option catalogues ─────────────────────────────

export const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'needs_work', label: 'Needs work' },
] as const;

export const READINESS_OPTIONS: Record<
  CategoryBasics['readiness'],
  { value: string; label: string }[]
> = {
  drivable: [
    { value: 'runs_drives', label: 'Starts, runs and drives' },
    { value: 'runs_not_drivable', label: 'Starts and runs, not road ready' },
    { value: 'not_running', label: 'Does not currently run' },
    { value: 'unknown', label: 'Not sure' },
  ],
  towable: [
    { value: 'towable', label: 'Road ready and towable' },
    { value: 'not_towable', label: 'Not currently towable' },
    { value: 'unknown', label: 'Not sure' },
  ],
  operational: [
    { value: 'operational', label: 'Operational and usable today' },
    { value: 'needs_work', label: 'Needs work or approvals' },
    { value: 'unknown', label: 'Not sure' },
  ],
};

export const TITLE_STATUS_OPTIONS = [
  { value: 'clean', label: 'Clean title' },
  { value: 'salvage', label: 'Salvage title' },
  { value: 'rebuilt', label: 'Rebuilt / reconstructed title' },
  { value: 'bonded', label: 'Bonded title' },
  { value: 'no_title', label: 'No title' },
  { value: 'not_sure', label: 'Not sure' },
] as const;

export const LIEN_OPTIONS = [
  { value: 'no', label: 'No lien — owned outright' },
  { value: 'yes', label: 'Yes, there is a lien or loan' },
  { value: 'not_sure', label: 'Not sure' },
] as const;

export const KNOWN_PROBLEM_CATEGORIES = [
  { value: 'engine_drivetrain', label: 'Engine or drivetrain' },
  { value: 'generator_power', label: 'Generator or electrical' },
  { value: 'plumbing_water', label: 'Plumbing or water system' },
  { value: 'propane_gas', label: 'Propane or gas system' },
  { value: 'cooking_equipment', label: 'Cooking equipment' },
  { value: 'refrigeration', label: 'Refrigeration' },
  { value: 'hvac', label: 'Heating / cooling / ventilation' },
  { value: 'body_structure', label: 'Body, structure or leaks' },
  { value: 'tires_brakes', label: 'Tires or brakes' },
  { value: 'permits_compliance', label: 'Permits or compliance work needed' },
  { value: 'other', label: 'Other' },
] as const;

export interface KnownProblem {
  category: string;
  note: string;
  photo_url?: string | null;
}

export function parseKnownProblems(value: unknown): KnownProblem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
    .map((v) => ({
      category: String(v.category ?? ''),
      note: String(v.note ?? ''),
      photo_url: typeof v.photo_url === 'string' ? v.photo_url : null,
    }))
    .filter((p) => p.category.length > 0);
}

// ─────────────────────────── Requirement matrix ──────────────────────────────

export interface StageRequirementInput {
  mode: 'rent' | 'sale';
  category: ListingCategory;
  condition: string | null;
  operationalStatus: string | null;
  titleStatus: string | null;
  hasLien: string | null;
  noKnownProblems: boolean;
  knownProblems: KnownProblem[];
  includedItems: string | null;
  photosExclusionsAnswered: boolean;
  /** Stored in inches (the wizard collects feet and converts). */
  lengthInches?: number | null;
  heightInches?: number | null;
}

/**
 * Mobile assets sold on Vendibook must ship with real measurements: buyers
 * size doors, garages and freight quotes off them. Width stays optional.
 */
const DIMENSION_REQUIRED_CATEGORIES: ListingCategory[] = ['food_truck', 'food_trailer'];

export const requiresSaleDimensions = (
  mode: 'rent' | 'sale',
  category: ListingCategory,
): boolean => mode === 'sale' && DIMENSION_REQUIRED_CATEGORIES.includes(category);


export interface StageRequirement {
  /** Stable id used to focus/scroll to the exact field. */
  fieldId: string;
  label: string;
  stage: ListingStageId;
  step: WizardStepId;
}

/**
 * Required-field matrix for the fields introduced in Phase 2 only. Photos,
 * price, title, description and location requirements stay owned by the
 * wizard's existing validation so legacy drafts keep behaving identically.
 */
export function getStageRequirements(input: StageRequirementInput): StageRequirement[] {
  const basics = getCategoryBasics(input.category);
  const missing: StageRequirement[] = [];

  if (!input.condition) {
    missing.push({
      fieldId: 'listing-condition',
      label: 'Select the overall condition',
      stage: 'what',
      step: 'basics',
    });
  }

  if (!input.operationalStatus) {
    missing.push({
      fieldId: 'listing-operational-status',
      label:
        basics.readiness === 'drivable'
          ? 'Tell buyers whether it starts, runs and drives'
          : basics.readiness === 'towable'
            ? 'Tell buyers whether it is currently towable'
            : 'Tell buyers whether the space is operational',
      stage: 'what',
      step: 'basics',
    });
  }

  if (isTitledAsset(input.category, input.mode)) {
    if (!input.titleStatus) {
      missing.push({
        fieldId: 'listing-title-status',
        label: 'Select the title status',
        stage: 'details',
        step: 'includes',
      });
    }
    if (!input.hasLien) {
      missing.push({
        fieldId: 'listing-lien',
        label: 'Disclose whether there is a lien on the asset',
        stage: 'details',
        step: 'includes',
      });
    }
  }

  if (!input.noKnownProblems && input.knownProblems.length === 0) {
    missing.push({
      fieldId: 'listing-known-problems',
      label: 'Select any known problems, or confirm there are none',
      stage: 'details',
      step: 'includes',
    });
  }

  // When "no known problems" is confirmed, any leftover rows are ignored —
  // otherwise a stale saved problem could block the step with no visible field.
  const unexplained = input.noKnownProblems
    ? []
    : input.knownProblems.filter((p) => (p.note ?? '').trim().length < 3);
  if (unexplained.length > 0) {
    missing.push({
      fieldId: `known-problem-${unexplained[0].category}`,
      label: 'Add a short explanation for each problem you selected',
      stage: 'details',
      step: 'includes',
    });
  }

  if (!input.includedItems || input.includedItems.trim().length < 3) {
    missing.push({
      fieldId: 'listing-included-items',
      label: 'Describe what is included in the advertised price',
      stage: 'details',
      step: 'includes',
    });
  }

  if (requiresSaleDimensions(input.mode, input.category)) {
    if (!input.lengthInches || input.lengthInches <= 0) {
      missing.push({
        fieldId: 'length_ft',
        label: 'Enter the overall length in feet',
        stage: 'details',
        step: 'includes',
      });
    }
    if (!input.heightInches || input.heightInches <= 0) {
      missing.push({
        fieldId: 'height_ft',
        label: 'Enter the overall height in feet',
        stage: 'details',
        step: 'includes',
      });
    }
  }

  if (!input.photosExclusionsAnswered) {
    missing.push({
      fieldId: 'listing-photo-exclusions',
      label: 'Answer whether anything shown in the photos is not included',
      stage: 'details',
      step: 'includes',
    });
  }

  return missing;
}

/** Guided photo prompts by category — minimum set is the first three. */
export function getPhotoPrompts(category: ListingCategory): string[] {
  if (isStaticCategory(category)) {
    return [
      'Wide shot of the overall space',
      'Work area or prep line',
      'Utilities: power, water, ventilation',
      'Entry, parking or loading access',
      'Any disclosed damage or wear',
    ];
  }
  return [
    'Full exterior from the front corner',
    'Interior / work area',
    'Cooking line and main equipment',
    'Utilities: generator, propane, water tanks',
    'Identification plate or serial tag (hide personal details)',
    'Any disclosed damage or wear',
  ];
}

export const MIN_GUIDED_PHOTOS = 3;
