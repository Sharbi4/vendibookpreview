/**
 * SubscriptionConsentDialog — ROSCA + California AB 2863 affirmative-consent
 * gate that MUST be shown before any recurring subscription checkout.
 *
 * Renders, in visual proximity to a single "Agree and continue" button:
 *   - Plan name
 *   - Price shown at checkout
 *   - Billing frequency (monthly / yearly)
 *   - "Automatically renews until you cancel" disclosure with the renewal price
 *   - How to cancel (self-serve, entirely online)
 *   - Links to Subscription Terms, Refund & Cancellation Policy, Terms, Privacy
 *
 * Wraps ConsentModal so an unchecked checkbox gates the pay button and a
 * `user_consents` row is written server-side via record_user_consent RPC.
 */
import * as React from 'react';
import { ConsentModal } from '@/components/consent/ConsentModal';
import { DOCUMENT_TYPES, CONSENT_TRIGGERS } from '@/lib/legalDocuments';
import { formatUsd } from '@/lib/monetization/products';
import { ShieldCheck } from 'lucide-react';
import { FEATURED_CADENCE, FEATURED_DISCLOSURE_VERSION } from '../../../supabase/functions/_shared/squarePlan';

export interface SubscriptionConsentPayload {
  productSlug: string;
  productName: string;
  priceCents: number;
  interval: 'month' | 'year' | string;
  tier?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: SubscriptionConsentPayload | null;
  /** D2: per-attempt id embedded in the consent artifact so a single consent
   *  cannot be replayed across separate checkout attempts. */
  checkoutAttemptId?: string | null;
  onConsented: (consentId: string) => void | Promise<void>;
}

const intervalLabel = (i: string) => (i === 'year' ? 'year' : 'month');
const intervalNoun = (i: string) => (i === 'year' ? 'annually' : 'monthly');

export const SubscriptionConsentDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  payload,
  checkoutAttemptId,
  onConsented,
}) => {
  if (!payload) return null;

  const priceLabel = formatUsd(payload.priceCents);
  const featured = payload.productSlug === 'featured_listing_monthly';
  const interval = featured ? '30 days' : intervalLabel(payload.interval);
  const cadence = featured ? 'every 30 days' : intervalNoun(payload.interval);

  const intro = [
    `You are subscribing to ${payload.productName} at ${priceLabel} per ${interval}, plus applicable tax shown before payment. Your first charge is due when you subscribe.`,
    ...(payload.productSlug === 'featured_listing_monthly' ? ['Featured applies to one listing and automatically cancels when its sale is recorded. Rental listings renew until you cancel.'] : []),
    `Your subscription automatically renews ${cadence} at ${priceLabel} per ${interval} until you cancel.`,
    'You can cancel anytime, entirely online, from Account → Membership & billing. Cancellations take effect at the end of the current paid period.',
    ...(featured ? ['Under Featured listing subscriptions, choose Cancel renewal before your next billing date to avoid the next charge. This is an ongoing subscription, not a one-time boost. No minimum beyond the paid 30-day period. Placement rotates and does not guarantee views, inquiries, bookings or a sale. Fees for an activated period are nonrefundable except where required by law. Pro Boost credits remain separate and do not start recurring charges.'] : []),
  ].join(' ');

  const acceptanceText = `I agree to the Subscription Terms and Refund & Cancellation Policy${featured ? ' and Featured Listing Terms' : ''}. I authorize Vendibook to charge ${priceLabel} plus applicable tax through Square now and ${cadence} until I cancel.`;

  return (
    <ConsentModal
      open={open}
      onOpenChange={onOpenChange}
      documentType={DOCUMENT_TYPES.SUBSCRIPTION_TERMS}
      trigger={CONSENT_TRIGGERS.SUBSCRIPTION_START}
      acceptanceText={acceptanceText}
      intro={intro}
      primaryLabel="Agree and continue to secure checkout"
      relatedIds={{
        product_slug: payload.productSlug,
        price_cents_shown: String(payload.priceCents),
        interval: payload.interval,
        ...(featured ? { billing_cadence: FEATURED_CADENCE, disclosure_version: FEATURED_DISCLOSURE_VERSION } : {}),
        ...(payload.tier ? { tier: payload.tier } : {}),
        ...(checkoutAttemptId ? { checkout_attempt_id: checkoutAttemptId } : {}),
      }}
      footerSlot={
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Secure billing through Square — cancel anytime online.
          {featured && <a href="/legal/featured-listing-terms" target="_blank" rel="noopener noreferrer" className="underline">Featured Listing Terms</a>}
        </span>
      }
      onAccept={async (consentId) => {
        await onConsented(consentId);
      }}
    />
  );
};

export default SubscriptionConsentDialog;
