/**
 * Versioned seller disclosure for the optional APPROVE financing
 * opt-in. Bump the version whenever the text below changes so a stored
 * acceptance always points at the exact wording the seller agreed to.
 */
export const EQUINOX_DISCLOSURE_VERSION = 'approve-financing-v1';

export const EQUINOX_DISCLOSURE_TEXT =
  'If this listing results in a sale financed through APPROVE, Vendibook\u2019s 8.7% sale platform fee applies and is deducted from the financed sale proceeds before the net seller payout. This is a Vendibook platform fee\u2014not a financing fee. Financing is subject to APPROVE and/or its funding providers\u2019 approval and terms. Vendibook is not a lender.';

export const EQUINOX_APPLY_URL = 'https://financing.approvepayments.com/vendibook';

/** Launch switch — nothing financing-related renders publicly while this is off. */
export const EQUINOX_FLAG_KEY = 'approve_financing_enabled';

/**
 * Buyer financing is a marketplace-level benefit: every published for-sale
 * listing qualifies, in any category, with no seller opt-in. Category and
 * seller preference are no longer part of eligibility.
 */
export const isFinanceableSaleListing = (listing: any) =>
  !!listing &&
  listing.mode === 'sale' &&
  (listing.status === undefined || listing.status === null || listing.status === 'published');
