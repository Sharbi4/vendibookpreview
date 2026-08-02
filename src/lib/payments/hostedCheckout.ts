/**
 * Hosted PayPal checkout links.
 *
 * Vendibook no longer creates processor-hosted sessions from the browser.
 * Every charge is started from the in-app `/checkout/*` surfaces, which call
 * `paypal-create-order` and let the server re-derive amount, fees and
 * eligibility. These helpers only build the in-app URL.
 */

export type HostedCheckoutKind =
  | 'sale'
  | 'booking'
  | 'freight'
  | 'notary'
  | 'protected_sale_deposit';

export interface HostedCheckoutOptions {
  /** Where to land after a successful capture. */
  success?: string;
  /** Where to land if the payer backs out. */
  cancel?: string;
  /** Display-only label; the server owns the real amount. */
  label?: string;
  /** Display-only amount in cents. */
  amountCents?: number;
}

export const hostedCheckoutPath = (
  kind: HostedCheckoutKind,
  id: string,
  options: HostedCheckoutOptions = {},
): string => {
  const params = new URLSearchParams({ kind, id });
  if (options.success) params.set('success', options.success);
  if (options.cancel) params.set('cancel', options.cancel);
  if (options.label) params.set('label', options.label);
  if (options.amountCents && options.amountCents > 0) {
    params.set('amount_cents', String(Math.round(options.amountCents)));
  }
  return `/checkout/pay?${params.toString()}`;
};

export const hostedCheckoutUrl = (
  kind: HostedCheckoutKind,
  id: string,
  options: HostedCheckoutOptions = {},
): string => `${window.location.origin}${hostedCheckoutPath(kind, id, options)}`;

/** Catalog product (featured boost, add-ons) checkout surface. */
export const productCheckoutPath = (slug: string, listingId?: string | null): string =>
  listingId
    ? `/checkout/product/${slug}?listing_id=${encodeURIComponent(listingId)}`
    : `/checkout/product/${slug}`;

export const productCheckoutUrl = (slug: string, listingId?: string | null): string =>
  `${window.location.origin}${productCheckoutPath(slug, listingId)}`;
