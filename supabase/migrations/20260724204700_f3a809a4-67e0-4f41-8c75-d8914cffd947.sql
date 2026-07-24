
-- 1) Link host_subscriptions to the consent record captured at checkout
ALTER TABLE public.host_subscriptions
  ADD COLUMN IF NOT EXISTS consent_id uuid NULL REFERENCES public.user_consents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_host_subscriptions_consent_id
  ON public.host_subscriptions(consent_id);

COMMENT ON COLUMN public.host_subscriptions.consent_id IS
  'user_consents row captured at subscription checkout (ROSCA / CA AB 2863). Nullable for historic rows.';

-- 2) Seed two published legal documents so /legal/subscription-terms and
--    /legal/refund-cancellation-policy resolve, and ConsentModal can look up
--    the current version via current_legal_document().
INSERT INTO public.legal_documents (
  document_type, version, status, title, slug, summary, body_markdown,
  content_hash, effective_at, change_summary
) VALUES
(
  'subscription_terms',
  'v1',
  'published',
  'Vendibook Subscription Terms',
  'subscription-terms',
  'How Vendibook host subscriptions (Starter, Pro, Premium) bill, renew, and end.',
$md$# Vendibook Subscription Terms

**Effective:** 2026-07-24 · **Version:** v1

These Subscription Terms govern paid Host plans on Vendibook (Starter, Pro, Premium, and any successor tier). They are in addition to the Vendibook [Terms of Service](/legal/terms) and [Privacy Policy](/legal/privacy).

## 1. Plans and pricing

The plan you select at checkout — including its name, monthly or annual price, and included features — is the plan you are agreeing to. The full price, currency, and billing frequency are shown on the pay screen before you confirm.

## 2. Automatic renewal

**Your subscription automatically renews at the end of each billing period at the then-current price for your plan, and your payment method on file will be charged, unless you cancel before the renewal date.** If we ever change the price, we will notify you at least 30 days before the change takes effect and give you an opportunity to cancel.

## 3. Free trials and promotional pricing

If your plan starts with a free trial or promotional rate, the promotional period, its length, and the price that will apply after it ends are disclosed on the pay screen. When the promotional period ends, your plan automatically converts to the standard recurring price unless you cancel first.

## 4. How to cancel

You can cancel your subscription at any time, entirely online, from **Account → Host subscription → Manage billing**, which opens the Stripe billing portal. Cancellations take effect at the end of the current paid period; you keep access until that date. No phone call or email is required to cancel.

## 5. Refunds

Subscription fees are generally non-refundable once a billing period has started, except where required by law. Specific product refund windows (for example, one-time add-ons) are shown on each product and in the [Refund & Cancellation Policy](/legal/refund-cancellation-policy).

## 6. Failed payments

If a renewal payment fails, we will retry the charge automatically and email you. Your paid features may pause until payment succeeds. If payment cannot be collected, your plan will revert to the free tier.

## 7. Consent record

When you subscribe, we store a consent record — your user id, timestamp, plan, price shown, billing frequency, and the version of these terms — so we can prove the disclosure you saw.

## 8. Contact

Questions about billing: **support@vendibook.com** · (725) 755-9598 · Mon–Fri 9am–5pm Arizona time.
$md$,
  encode(digest('vendibook-subscription-terms-v1', 'sha256'), 'hex'),
  now(),
  'Initial publication'
),
(
  'refund_cancellation_policy',
  'v1',
  'published',
  'Vendibook Refund & Cancellation Policy',
  'refund-cancellation-policy',
  'How refunds and cancellations work for subscriptions, add-ons, and marketplace transactions.',
$md$# Vendibook Refund & Cancellation Policy

**Effective:** 2026-07-24 · **Version:** v1

## 1. Subscriptions

You can cancel a Host subscription at any time from **Account → Host subscription → Manage billing**. Cancellation takes effect at the end of the current paid period. Recurring fees already charged for the current period are generally non-refundable except where required by law. See the [Subscription Terms](/legal/subscription-terms).

## 2. One-time add-ons

One-time purchases (Featured listing boosts, AI listing rewrites, Expert pricing reviews, White-Glove services, etc.) each carry their own refund window, which is displayed on the product before checkout. Refund requests must be sent to **support@vendibook.com** within that window.

## 3. Featured listing boosts

If a boost fails to run for technical reasons attributable to Vendibook, we will refund the boost in full or extend the run by an equivalent duration, at your choice.

## 4. Marketplace transactions

Refunds and disputes for rentals and sales are governed by the transaction's own agreed terms (visible on the transaction page) and by the applicable [Renter Terms](/legal/renter-terms) or [Seller Terms](/legal/seller-terms). Cash / pay-in-person transactions follow the [Pay-in-Person Acknowledgment](/legal/pay-in-person-terms).

## 5. How to request a refund

Email **support@vendibook.com** with the transaction id or purchase id and a short description. We respond within one business day (Mon–Fri 9am–5pm Arizona time).

## 6. Chargebacks

If you believe a charge is unauthorized, please contact us before filing a chargeback so we can resolve it quickly.
$md$,
  encode(digest('vendibook-refund-cancellation-v1', 'sha256'), 'hex'),
  now(),
  'Initial publication'
)
ON CONFLICT (document_type, version) DO NOTHING;
