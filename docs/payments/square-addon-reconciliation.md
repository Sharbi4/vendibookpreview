# Square Featured Boost reconciliation

## Cause and fix
The SECURITY DEFINER insert guard inspected its own current_user and reset paid/active purchases to pending. Fulfillment completed the attempt and activated the promotion without creating payment_records. Completed retries returned without repairing either discrepancy.

The insert guard now runs with invoker privileges. Service-only reconcile_square_addon serializes on the checkout, validates purchase/payment linkage and amount/currency, repairs purchase status, preserves fulfillment dates, and creates or repairs one canonical payment_records row atomically. Unique Square payment IDs prevent duplicate revenue. Platform add-ons never create seller payables.

The original four-argument fulfill_square_addon delegates to the new function for deployed caller compatibility. Server-side checkout, status, webhook, and admin repair paths use the same reconciler. Authenticated Square API responses supply order/location/receipt data; webhook bodies only select the lookup. Refunded/terminal or ambiguous records fail closed.

## Deployment order
1. Deploy square-billing, square-webhook, square-rental-webhook and monetization-reconciler together with _shared/squareAddonReconciliation.ts. The new RPC must exist before resuming checkout traffic; coordinate this as one release. In particular, never add monetization payment_records while the old rental webhook can route them to the rental finalizer.
2. Apply supabase/migrations/20261012120000_square_addon_reconciliation.sql.
3. Publish AdminRevenue UI.
4. Use Revenue & Services > Purchases > Transaction details > Reconcile with Square for the affected purchase. The existing monetization-reconciler requires admin/backend authorization and re-fetches Square before any writes. It never creates a charge.
5. Verify one ledger row per Square payment, paid/active purchase, and unchanged November 10 expiry for the identified 30-day boost. Check payment/order ID, customer, listing, product, subtotal, tax, total, provider and statuses in the details.
6. Replay the formerly ignored webhook. The rental receiver now retries ignored_unknown_payment events and routes billing payments before rental finalization.

## Validation
- Run node scripts/test-square-addon-reconciliation.mjs (17 behavioral cases; mocked DB/provider boundaries).
- SQL rollback-only regression checks in docs/payments/tests/square-addon-reconciliation.sql cover the historical repair, duplicate replay without date extension, initial fulfillment, amount/currency/payment/environment mismatches, RPC role grants, and refund protection.
- In this task the migration plus SQL regression block was executed in one rollback-only transaction against the real schema through Lovable; no changes from those tests persisted.
- No live payment, refund, or customer email is necessary.
- Concurrent attempts serialize on checkout/listing locks and existing unique payment keys; true multi-session concurrency testing remains a deployment check.

## Reporting
AdminRevenue joins purchases to their primary payment record and listing. Search includes user/email, listing, purchase, Square payment and order. Subtotal and tax are shown separately. Sandbox purchases are excluded from revenue summary; revenue is counted from purchases only, not again from the ledger. Summary explicitly describes the recent-200 sample.

## Operational limits
External Square refunds are flagged for review rather than sent through rental refund handling; this change never reactivates a refunded boost. Existing refund workflows remain responsible for revocation.
A completed checkout missing its purchase, conflicting identifiers, or missing fulfillment dates needs manual review rather than guessed matching. Only exact Square payment/checkout reference mappings are used.
