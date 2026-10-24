# Featured subscriptions and annual Pro

Owner-approved: Pro $79/month or $790/year (save $158 / two months). Featured $49/month only, one listing, cancel anytime. No annual Featured SKU. Historical one-time Boosts and Pro credit redemptions remain one-time.

## Deployment

Apply `20261024120000_featured_monthly_subscription.sql`, then deploy square-billing, square-webhook, square-reconcile, and square-setup (including shared modules). Configure a matching, securely generated SQUARE_RECONCILE_TOKEN edge secret and Vault secret `square_reconcile_token`; never print either. Verify the minute cron job and successful authorized reconcile response. Run square-setup dry-run then apply to provision the approved annual Pro and monthly Featured plans; no customers, subscriptions or charges should be created for verification.

Do not announce live billing until plan mappings, migration, edge deployment and scheduled cancellation are confirmed. Preview buttons are fixtures and do not purchase.

## Behavior

Featured attempts use the `featured_listing_monthly` tier marker but never create a host_subscriptions row. Paid Square invoices grant visibility only through the confirmed paid-through date; webhook replay does not extend it. Existing Boost expiry is preserved. Account membership screens show per-listing cancellation.

Sale transaction paid/confirmed/completed states and paid/completed sale invoices queue cancellation. Reconciliation cancels the actual Square subscription, records confirmation only after provider success, and retries failures. A canceled sale never automatically re-subscribes the seller. Pending checkouts for sold listings cannot charge. Rental listings continue monthly until owner cancellation. No new charge or subscription is created by a sale trigger.

## Verification

Targeted Vitest covers annual classification, membership isolation, unpaid invoice refusal, sale cancellation and retry, popup period controls and BuyerMatch overview. Live charge tests have not been performed.
