# Invoice payment integration status — 2026-10-12

Branch: `fix/paypal-webhook-config`. Deployment and publishing remain with the owner in Lovable.

## Implemented on this branch
- Seller-reviewed purchase requests, required buyer acknowledgment, accepted revisions, reviewed tax evidence, invoices, reservations, participant dashboards and durable notification delivery.
- Equipment commission: 8.7% for both Standard and Pro, computed on equipment; rentals and Build Studio retain their separate rates.
- No new cash or pay-in-person sale selection or API creation. Earlier explicit owner instructions take precedence over the pasted prompt's generic direct-payment text.
- Offer authorization, expiry, consent, immutable agreed prices, transition locking and duplicate-action protection.
- Migration `20261012220000_invoice_snapshot_protection.sql` freezes issued financial terms, identities, tax/fee snapshots and due dates. Sale records must agree with issued invoice amounts. Purchased source offers allow updates to their existing sale, never creation of a new sale.
- Existing PayPal provider accepts a server-only delayed-disbursement mode. It requires the server feature flag and both merchant identities, preserves exact fees, and refuses invalid amounts before calling PayPal. Existing callers retain their settlement mode.

## Not activated or complete
The invoice branch in `paypal-create-order` still refuses payment. Provider transport support alone is not a payment rollout.
Remaining implementation includes an atomic invoice payment-attempt record, fresh merchant-capability verification at checkout, invoice-derived order amounts, verified capture-to-invoice reconciliation, held payable accounting, authenticated buyer-confirmed referenced payout release, disputes/refunds and 28-day monitoring. The Pay Invoice UI must not become chargeable until these paths are complete.

Live onboarding previously returned PayPal HTTP 403 NOT_AUTHORIZED. Approved live partner permissions and an eligible connected seller are required; code cannot grant those capabilities.
Reviewed tax evidence currently requires an administrator; automated tax determination and legal seller identity verification remain rollout requirements.

## Verification and deployment
GitHub Actions runs the isolated invoice database migrations, offer security/concurrency tests, payment regression tests and UI build. Delayed order tests intercept HTTP and inspect actual request construction; they do not charge a provider and are not end-to-end payment certification.
Apply all branch migrations in timestamp order through Lovable, including the new snapshot migration. Deploy changed functions through Lovable. Do not replay older offer migrations after the consolidated security migration.
After deployment and provider readiness, complete buyer/seller browser checks and verified provider purchase-to-payout testing. Neither successful CI nor a non-charging readiness check establishes live payment readiness.

PayPal protocol reference: https://developer.paypal.com/platforms/checkout/delayed-disbursement/
