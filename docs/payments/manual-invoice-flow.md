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
| 5. Buyer pays | Buyer | Admin confirms the money arrived and clicks **Record payment** with the reference. Sale becomes paid ("Sale pending"); funds are held. Overdue manual invoices only alert admins, they are never auto-cancelled. |
| 6. Handoff | Both | Buyer confirms, both sign the SignNow purchase agreement, walkthrough video saved. |
| 7. Release | Admin | When all three are done, admins and support@ get "Release seller payment". Pay the seller by hand, then **Record release** with the payout reference. |

Admins can cancel an unpaid sale from `/admin/invoices`; a paid invoice must be refunded instead.

Testing: `PGLITE_MODULE=... node scripts/test-manual-invoice-flow.mjs` (21 checks).
