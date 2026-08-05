import {
  ListingFormData,
  isMobileAsset,
  isStaticLocation,
} from '@/types/listing';

/**
 * Guided listing flow.
 *
 * One question (or one tight group of related questions) per screen.
 * The path is conditional: screens that cannot apply to the seller's
 * answers are never shown, and the progress indicator counts only the
 * screens that are actually on their path.
 */
export type GuidedStepId =
  | 'intent'
  | 'category'
  | 'specs'
  | 'ownership'
  | 'story'
  | 'features'
  | 'pricing'
  | 'location'
  | 'documents'
  | 'photos'
  | 'review';

/** Short, friendly names used by the progress indicator. */
export const STEP_NAMES: Record<GuidedStepId, string> = {
  intent: 'Goal',
  category: 'Type',
  specs: 'Details',
  ownership: 'Ownership',
  story: 'Listing',
  features: 'Features',
  pricing: 'Pricing',
  location: 'Location',
  documents: 'Documents',
  photos: 'Photos',
  review: 'Review',
};

/** Title/ownership only applies to titled mobile equipment being sold. */
export const needsOwnershipStep = (formData: ListingFormData): boolean =>
  formData.mode === 'sale' && isMobileAsset(formData.category);

/** Guest document requirements are a rental-side concept only. */
export const needsDocumentsStep = (formData: ListingFormData): boolean =>
  formData.mode === 'rent';

/**
 * The conditional screen path for the current answers.
 * Before intent/category are answered we project the most common path so the
 * progress indicator does not jump around.
 */
export function computeFlow(formData: ListingFormData): GuidedStepId[] {
  const tail: GuidedStepId[] = ['story', 'features', 'pricing', 'location'];

  if (!formData.mode || !formData.category) {
    return ['intent', 'category', 'specs', ...tail, 'photos', 'review'];
  }

  const steps: GuidedStepId[] = ['intent', 'category', 'specs'];
  if (needsOwnershipStep(formData)) steps.push('ownership');
  steps.push(...tail);
  if (needsDocumentsStep(formData)) steps.push('documents');
  steps.push('photos', 'review');
  return steps;
}

export interface StepIssue {
  /** Field key used to focus/scroll to the offending control. */
  field: string;
  message: string;
}

/**
 * Inline issues for a screen. These mirror the previous wizard's validation
 * semantics exactly — nothing was relaxed or tightened for publishing.
 */
export function getStepIssues(id: GuidedStepId, formData: ListingFormData): StepIssue[] {
  const issues: StepIssue[] = [];

  switch (id) {
    case 'intent':
      if (!formData.mode) issues.push({ field: 'mode', message: 'Choose whether you want to sell or rent out.' });
      break;

    case 'category':
      if (!formData.category) issues.push({ field: 'category', message: 'Pick the type that best matches your listing.' });
      break;

    case 'specs':
      // Specifications are helpful but were never required to publish.
      break;

    case 'ownership':
      if (!formData.title_status) {
        issues.push({ field: 'title_status', message: 'Let buyers know the title situation.' });
      }
      break;

    case 'story':
      if (formData.title.trim().length < 5) {
        issues.push({ field: 'title', message: 'Add a title with at least 5 characters.' });
      }
      if (formData.description.trim().length === 0) {
        issues.push({ field: 'description', message: 'Add a description so buyers know what they are getting.' });
      }
      break;

    case 'features':
      // Features and highlights are optional.
      break;

    case 'pricing':
      if (formData.mode === 'sale') {
        const price = parseFloat(formData.price_sale);
        if (!formData.price_sale.trim() || !(price > 0)) {
          issues.push({ field: 'price_sale', message: 'Enter your asking price.' });
        }
        if (!formData.accept_cash_payment && !formData.accept_card_payment) {
          issues.push({ field: 'payment_methods', message: 'Choose at least one way to get paid.' });
        }
      } else {
        const daily = parseFloat(formData.price_daily);
        if (!formData.price_daily.trim() || !(daily > 0)) {
          issues.push({ field: 'price_daily', message: 'Enter a daily rate.' });
        }
      }
      break;

    case 'location': {
      const isStatic = isStaticLocation(formData.category) || formData.is_static_location;

      if (formData.zip_code.trim().length < 5) {
        issues.push({ field: 'zip_code', message: 'Enter a 5-digit ZIP code.' });
      }
      if (!formData.city.trim() || !formData.state.trim()) {
        issues.push({ field: 'city', message: 'Confirm the city and state for this ZIP code.' });
      }
      if (formData.latitude === null || formData.longitude === null) {
        issues.push({ field: 'zip_code', message: 'We could not place this location yet — re-check the ZIP code.' });
      }
      if (isStatic) {
        if (!formData.access_instructions.trim()) {
          issues.push({ field: 'access_instructions', message: 'Tell guests how to access the space.' });
        }
      } else if (!formData.fulfillment_type) {
        issues.push({ field: 'fulfillment_type', message: 'Choose pickup, delivery, or both.' });
      }
      break;
    }

    case 'documents':
      // Required documents remain optional for the host to configure.
      break;

    case 'photos': {
      const total = formData.images.length + formData.existingImages.length;
      if (total < 3) {
        issues.push({ field: 'photos', message: `Add at least 3 photos (${total} so far).` });
      }
      break;
    }

    case 'review':
      break;
  }

  return issues;
}

export function validateGuidedStep(id: GuidedStepId, formData: ListingFormData): boolean {
  return getStepIssues(id, formData).length === 0;
}

/**
 * Steps that gate Publish. Deliberately matches the previous wizard's
 * canPublish() so publish eligibility is unchanged: type, story, pricing,
 * location and photos. Ownership is a continue-gate only.
 */
export const PUBLISH_GATED_STEPS: GuidedStepId[] = [
  'intent',
  'category',
  'story',
  'pricing',
  'location',
  'photos',
];

/** Human label for the step a missing review item belongs to. */
export function stepForIssueField(field: string): GuidedStepId {
  switch (field) {
    case 'mode':
      return 'intent';
    case 'category':
      return 'category';
    case 'title':
    case 'description':
      return 'story';
    case 'price_sale':
    case 'price_daily':
    case 'payment_methods':
      return 'pricing';
    case 'zip_code':
    case 'city':
    case 'access_instructions':
    case 'fulfillment_type':
      return 'location';
    case 'photos':
      return 'photos';
    default:
      return 'review';
  }
}
