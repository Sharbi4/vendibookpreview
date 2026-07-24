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
  onConsented: (consentId: string) => void | Promise<void>;
}

const intervalLabel = (i: string) => (i === 'year' ? 'year' : 'month');
const intervalNoun = (i: string) => (i === 'year' ? 'annually' : 'monthly');

export const SubscriptionConsentDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  payload,
  onConsented,
}) => {
  if (!payload) return null;

  const priceLabel = formatUsd(payload.priceCents);
  const interval = intervalLabel(payload.interval);
  const cadence = intervalNoun(payload.interval);

  const intro = [
    `You are subscribing to ${payload.productName} at ${priceLabel} per ${interval}.`,
    `Your subscription automatically renews ${cadence} at ${priceLabel} per ${interval} until you cancel.`,
    'You can cancel anytime, entirely online, from Account → Host subscription → Manage billing. Cancellations take effect at the end of the current paid period.',
  ].join(' ');

  const acceptanceText = `I have read and agree to Vendibook's Subscription Terms and Refund & Cancellation Policy. I understand my ${payload.productName} plan is ${priceLabel} per ${interval} and will automatically renew until I cancel.`;

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
        ...(payload.tier ? { tier: payload.tier } : {}),
      }}
      onAccept={async (consentId) => {
        await onConsented(consentId);
      }}
    />
  );
};

export default SubscriptionConsentDialog;
