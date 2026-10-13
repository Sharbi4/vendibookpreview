# Manual invoice sale flow (owner decision 2026-10-13)

Invoices are calculated and sent by hand and seller payouts are released by hand.
No invoicing API is used. Vendibook records each step so buyers, sellers and admins
see the right status. Database: `supabase/migrations/20261013180000_manual_invoice_owner_flow.sql`.

| Step | Who | What happens in Vendibook |
|---|---|---|
| 1. Request to buy (or accepted offer) | Buyer | Request is created. Seller gets a dashboard notification and email. |
| 2. Approve or decline (max 14 days) | Seller | Reminders on day 2, day 7 and 2 days before the deadline. Unanswered requests cancel automatically at 14 days and both sides are told. |
| 3. Approved | System | Equipment reserved (badge "Payment pending"). Every admin plus support@vendibook.com gets "Send invoice". |
| 4. Send invoice | Admin | Calculate the invoice (8.7% seller fee is pre-filled; edit if needed), send it, then **Record invoice sent** at `/admin/invoices`. Buyer gets a Pay Invoice email and button. |
| 5. Buyer pays | Buyer | Admin confirms the money arrived and clicks **Record payment** with the reference. Sale becomes paid ("Sale pending"); the seller payout waits for the handoff steps. Overdue manual invoices only alert admins, they are never auto-cancelled. |
| 6. Handoff | Both | Buyer confirms, both sign the SignNow purchase agreement, walkthrough video saved. |
| 7. Release | Admin | When all three are done, admins and support@ get "Release seller payment". Pay the seller by hand, then **Record release** with the payout reference. |

Admins can cancel an unpaid sale from `/admin/invoices`; a paid invoice must be refunded instead.

Testing: `PGLITE_MODULE=... node scripts/test-manual-invoice-flow.mjs` (21 checks).

## Deployment record (2026-10-13)

Applied to the live database (Lovable project f4d8586e) with owner approval, in one transaction, after a
rolled-back dry run of the identical SQL (md5-checked): `supabase/migrations/` 20261010010000, 20261012014545,
20261012120000, 20261012160000, 20261012170000, 20261012180000, 20261012190000 (supersedes the unregistered
`drizzle/migrations/0015_offer_transaction_security.sql` and `0016_offer_notification_outbox.sql`; do not apply those),
20261012200000, 20261012210000, 20261012220000, 20261013170000, 20261013180000. All twelve are recorded in
`supabase_migrations.schema_migrations`. The BuyerMatch migrations 20261012230000–232000 were NOT applied
(they conflict with the live drizzle 0015/0017 BuyerMatch design).

`commerce_rollout.requests_enabled` is on (owner approval; no separate counsel review on file).
`payments_enabled` stays off: invoices are paid outside the API and recorded by an admin.
