/**
 * Single source of truth for every versioned Vendibook legal document.
 *
 * Rules:
 *  - No page, consent gate, footer, sitemap, or edge function may hardcode a
 *    version string. Import it from here.
 *  - The version written to `legal_acceptances.document_version` is always the
 *    value exported here at the moment of acceptance.
 *  - Bump the version AND the effective date together whenever the operative
 *    text of a document materially changes.
 *
 * Compliance guardrails baked into every document referenced here:
 *  - The word fund-custody is never used. The only permitted framing is
 *    "payment protection", which is a platform policy — not insurance, not a
 *    financial guarantee, and not a custodial arrangement.
 *  - Vendibook is never described as a bank, lender, money transmitter,
 *    broker, agent, dealer, insurer, or a party to a user transaction.
 *  - No document promises that a walkthrough was recorded, that an item was
 *    inspected or verified by Vendibook, or that location data is continuous
 *    or accurate.
 */

export const LEGAL_EFFECTIVE_DATE = 'September 18, 2026';

/** Individual document versions. Referenced everywhere; never inlined. */
export const TERMS_OF_SERVICE_VERSION = '2026-09-18';
export const PRIVACY_POLICY_VERSION = '2026-09-18';
export const PAYMENTS_TERMS_VERSION = '2026-09-18';
export const HANDOFF_TERMS_VERSION = '2026-09-18';
export const FINANCING_DISCLOSURE_VERSION = '2026-09-18';
export const LOCATION_TRACKING_VERSION = '2026-09-18';
export const RECORDING_CONSENT_VERSION = '2026-09-18';

/**
 * Walkthrough documents were rewritten on 2026-09-18 (revision b). Their
 * canonical constants live in `@/lib/walkthroughConsent` for backward
 * compatibility and are re-exported through the registry below.
 */
export const WALKTHROUGH_TERMS_REGISTRY_VERSION = '2026-09-18b';
export const DEVICE_PRIVACY_REGISTRY_VERSION = '2026-09-18b';

export type LegalDocumentGroup = 'platform' | 'transactions' | 'video-device';

export type LegalDocumentSlug =
  | 'terms-of-service'
  | 'privacy-policy'
  | 'payments-terms'
  | 'handoff-terms'
  | 'financing-disclosure'
  | 'video-walkthrough-terms'
  | 'recording-consent'
  | 'device-permissions-privacy'
  | 'location-tracking';

export type LegalDocument = {
  slug: LegalDocumentSlug;
  title: string;
  route: string;
  version: string;
  effectiveDate: string;
  summary: string;
  group: LegalDocumentGroup;
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    route: '/terms',
    version: TERMS_OF_SERVICE_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    summary: 'The agreement between you and Vendibook for using the marketplace.',
    group: 'platform',
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    route: '/privacy',
    version: PRIVACY_POLICY_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    summary: 'What we collect, why we collect it, how long we keep it, and your rights.',
    group: 'platform',
  },
  {
    slug: 'payments-terms',
    title: 'Payments, Fees, Refunds & Payouts Terms',
    route: '/legal/payments-terms',
    version: PAYMENTS_TERMS_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    summary: 'How checkout, platform fees, payment protection, refunds, and payouts work.',
    group: 'transactions',
  },
  {
    slug: 'handoff-terms',
    title: 'Verified Handoff & Condition Evidence Terms',
    route: '/legal/handoff-terms',
    version: HANDOFF_TERMS_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    summary: 'What the handoff record is, what it is not, and how handoff media is used.',
    group: 'transactions',
  },
  {
    slug: 'financing-disclosure',
    title: 'Financing & Pay-Over-Time Disclosure',
    route: '/legal/financing-disclosure',
    version: FINANCING_DISCLOSURE_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    summary: 'Financing is offered by independent third-party providers. Vendibook is not a lender.',
    group: 'transactions',
  },
  {
    slug: 'video-walkthrough-terms',
    title: 'Video Walkthrough Terms of Use',
    route: '/legal/video-walkthrough-terms',
    version: WALKTHROUGH_TERMS_REGISTRY_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    summary: 'Rules for joining and taking part in a live walkthrough inside Vendibook.',
    group: 'video-device',
  },
  {
    slug: 'recording-consent',
    title: 'Recording & Monitoring Notice',
    route: '/legal/recording-consent',
    version: RECORDING_CONSENT_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    summary: 'When a session may be monitored or recorded, who can access it, and your choices.',
    group: 'video-device',
  },
  {
    slug: 'device-permissions-privacy',
    title: 'Device Permissions & Privacy Notice',
    route: '/legal/device-permissions-privacy',
    version: DEVICE_PRIVACY_REGISTRY_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    summary: 'How camera, microphone, and device permissions are requested and used.',
    group: 'video-device',
  },
  {
    slug: 'location-tracking',
    title: 'Location & Delivery Tracking Disclosure',
    route: '/legal/location-tracking',
    version: LOCATION_TRACKING_VERSION,
    effectiveDate: LEGAL_EFFECTIVE_DATE,
    summary: 'When location is collected during a delivery, who sees it, and how it stops.',
    group: 'video-device',
  },
];

export const LEGAL_GROUP_LABELS: Record<LegalDocumentGroup, { title: string; description: string }> = {
  platform: {
    title: 'Platform',
    description: 'The core agreement and privacy commitments that apply to every account.',
  },
  transactions: {
    title: 'Transactions',
    description: 'Payments, handoff records, and third-party financing.',
  },
  'video-device': {
    title: 'Video & device',
    description: 'Walkthroughs, recording, device permissions, and delivery location.',
  },
};

export function getLegalDocument(slug: LegalDocumentSlug): LegalDocument {
  const doc = LEGAL_DOCUMENTS.find((d) => d.slug === slug);
  if (!doc) throw new Error(`Unknown legal document slug: ${slug}`);
  return doc;
}

export function legalVersionOf(slug: LegalDocumentSlug): string {
  return getLegalDocument(slug).version;
}

/** Documents incorporated by reference into the Terms of Service. */
export const INCORPORATED_BY_REFERENCE: LegalDocumentSlug[] = LEGAL_DOCUMENTS
  .filter((d) => d.slug !== 'terms-of-service')
  .map((d) => d.slug);
