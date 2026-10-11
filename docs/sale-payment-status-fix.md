# Declined purchase status and card availability

## Root causes
- A sale is created before payment. Capture failures updated payment_records but left the linked sale_transactions row pending. Those were two representations of each purchase, not two additional payments.
- Advanced Card Fields silently returned no UI when eligibility was false or absent. An older deployed checkout-intent endpoint has no card_fields_eligible field. The reviewed sandbox seller also reported incomplete onboarding, with no card capabilities returned.

## Fix
- Migration 20260920200000_sync_sale_payment_failure.sql installs a database trigger so capture failures and webhook failures move the latest unpaid sale to payment_failed.
- Fresh retries restore an unpaid pending state. Old failed attempts cannot downgrade a newer attempt or a paid sale. The trigger never marks a purchase paid itself.
- create-sale-intent reuses failed purchases, including older failed requests, instead of creating another purchase on retry. Seller approval is preserved.
- Buyer and seller dashboard cards label payment_failed clearly. Failed purchases do not show shipment progress, and buyers have a retry action.
- Advanced cards remain eligibility-gated. When unavailable, the card section tries PayPal's standard CARD button, also subject to SDK eligibility. It uses the existing standard order flow and final review, never forced confirmation. If neither product is eligible, a visible explanation replaces the missing section.

## Verification and activation
- 11 isolated PostgreSQL regression checks passed before and after applying the migration to the connected project. Fixtures were rolled back; the production trigger is enabled.
- 31 focused frontend/payment tests passed, including missing eligibility responses, the standard fallback, card validation, retained inputs, actual outcome handling and paid-state protection.
- Application typecheck passed. Build result is reported with the change delivery.
- The migration is already active in the connected database. Deploy create-sale-intent and sync the frontend from fix/paypal-webhook-config for the retry and display changes.
- The previous regular-testing fix still requires redeploying paypal-capture-order with the current shared paypal.ts if not already deployed. PayPal remains sandbox. No real card transaction or seller Advanced Card approval was performed by these tests.
