/**
 * Legal document registry (client-side).
 *
 * Every document type Vendibook can ask a user to accept is listed here with
 * its currently-shipping version. The version strings match rows seeded in
 * the `legal_documents` DB table so the ConsentModal can look up the actual
 * copy via the `current_legal_document` RPC and the acceptance write can
 * reference the exact frozen version.
 *
 * IMPORTANT: bump the CURRENT_VERSIONS entry whenever a new frozen row is
 * inserted into `legal_documents` for that type. Old versions stay in the DB
 * so historical `user_consents` rows always resolve to the copy the user
 * actually saw.
 */
export const DOCUMENT_TYPES = {
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY_POLICY: 'privacy_policy',
  MARKETPLACE_RULES: 'marketplace_rules',
  SELLER_TERMS: 'seller_terms',
  RENTER_TERMS: 'renter_terms',
  PAY_IN_PERSON_ACKNOWLEDGMENT: 'pay_in_person_acknowledgment',
  FEATURED_LISTING_TERMS: 'featured_listing_terms',
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const CURRENT_VERSIONS: Record<DocumentType, string> = {
  [DOCUMENT_TYPES.TERMS_OF_SERVICE]: 'v1',
  [DOCUMENT_TYPES.PRIVACY_POLICY]: 'v1',
  [DOCUMENT_TYPES.MARKETPLACE_RULES]: 'v1',
  [DOCUMENT_TYPES.SELLER_TERMS]: 'v1',
  [DOCUMENT_TYPES.RENTER_TERMS]: 'v1',
  [DOCUMENT_TYPES.PAY_IN_PERSON_ACKNOWLEDGMENT]: 'v1',
  [DOCUMENT_TYPES.FEATURED_LISTING_TERMS]: 'v1',
};

/** Slugs used in `/legal/:slug` URLs — must match `legal_documents.slug`. */
export const DOCUMENT_SLUGS: Record<DocumentType, string> = {
  [DOCUMENT_TYPES.TERMS_OF_SERVICE]: 'terms',
  [DOCUMENT_TYPES.PRIVACY_POLICY]: 'privacy',
  [DOCUMENT_TYPES.MARKETPLACE_RULES]: 'marketplace-rules',
  [DOCUMENT_TYPES.SELLER_TERMS]: 'seller-terms',
  [DOCUMENT_TYPES.RENTER_TERMS]: 'renter-terms',
  [DOCUMENT_TYPES.PAY_IN_PERSON_ACKNOWLEDGMENT]: 'pay-in-person-terms',
  [DOCUMENT_TYPES.FEATURED_LISTING_TERMS]: 'featured-listing-terms',
};

/**
 * Canonical trigger names — anything writing a consent MUST use one of these
 * so admin/analytics queries stay clean.
 */
export const CONSENT_TRIGGERS = {
  SIGNUP: 'signup',
  PUBLISH_LISTING: 'publish_listing',
  PURCHASE_REVIEW: 'purchase_review',
  PAY_IN_PERSON: 'pay_in_person',
  RENTAL_REQUEST: 'rental_request',
  INSTANT_BOOK: 'instant_book',
  BOOKING_REVIEW: 'booking_review',
  FEATURED_ACTIVATION: 'featured_activation',
  STRIPE_CONNECT: 'stripe_connect',
  IDENTITY_VERIFICATION: 'identity_verification',
  REFERRAL: 'referral',
  REVIEW_SUBMISSION: 'review_submission',
  CANCELLATION: 'cancellation',
} as const;

export type ConsentTrigger =
  (typeof CONSENT_TRIGGERS)[keyof typeof CONSENT_TRIGGERS];

export interface LegalDocumentRow {
  id: string;
  document_type: string;
  version: string;
  status: string;
  title: string;
  slug: string;
  summary: string | null;
  body_markdown: string;
  content_hash: string;
  effective_at: string;
  change_summary: string | null;
}
