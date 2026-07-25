# SignNow (airSlate) E-Signature — Foundation Build

Signatures are **free** for users. No paywall anywhere on signing. Notarization is deferred (stub only).

---

## 0. Secrets the owner must add (Project Settings → Secrets)

Before we can call SignNow we need three secrets. I will surface a prompt with these exact names — please add them before the sandbox test:

- `SIGNNOW_CLIENT_ID` — from your SignNow app (sandbox app for now)
- `SIGNNOW_CLIENT_SECRET` — from your SignNow app
- `SIGNNOW_API_BASE` — set to `https://api-eval.signnow.com` for sandbox; swap to `https://api.signnow.com` for production
- `SIGNNOW_WEBHOOK_SECRET` — the signing secret from your SignNow webhook subscription (used to verify incoming webhook signatures)
- `SIGNNOW_BASIC_AUTH` — the base64 `client_id:client_secret` string SignNow requires for the OAuth `Authorization: Basic …` header on the token endpoint

We'll also need a **service user** (email + password) inside your SignNow account to obtain access tokens via password grant — SignNow's OAuth2 uses `grant_type=password` with `Basic client_id:client_secret`. Two more secrets:

- `SIGNNOW_SERVICE_USER_EMAIL`
- `SIGNNOW_SERVICE_USER_PASSWORD`

Everything is namespaced so sandbox → production is a base-URL + credentials swap, no code change.

---

## 1. Foundation

### DB (one migration)

- `documents` table (columns per spec):
  - `id uuid pk`, `transaction_id uuid null` (fk `sale_transactions`), `booking_id uuid null` (fk `booking_requests`) — CHECK exactly one is set
  - `document_type text` — enum-checked: `rental_agreement | bill_of_sale | purchase_agreement | kitchen_agreement | handoff_acknowledgment`
  - `signnow_document_id text unique`, `signnow_template_id text null`
  - `status text` — `draft | sent | partially_signed | completed | voided`
  - `signers jsonb` — `[{ role, user_id, email, name, signed_at, signing_url_expires_at }]`
  - `signed_pdf_path text null` (Storage path in a new **private** `signed-documents` bucket)
  - `metadata jsonb`, `created_at`, `updated_at`
- Grants: `authenticated` SELECT/INSERT/UPDATE, `service_role` ALL. No `anon`.
- RLS: SELECT allowed when caller is a listed signer OR is a participant on the linked transaction/booking (host, buyer, seller, renter) OR `has_role(auth.uid(),'admin')`. INSERT/UPDATE restricted to `service_role` (edge functions only).
- `signnow_webhook_events` table (mirrors `stripe_webhook_events` pattern): `id`, `event_id unique`, `event_type`, `payload jsonb`, `processed_at`, `created_at`. Service-role only.
- `sale_transactions.bill_of_sale_completed_at timestamptz null` added.

Storage: private bucket `signed-documents`. Access via signed URLs from an edge function that re-checks the same RLS predicate.

### Edge functions

- **`signnow-client`** (shared helper module, not a public function — lives at `supabase/functions/_shared/signnow.ts`):
  - `getAccessToken()` — password grant against `${SIGNNOW_API_BASE}/oauth2/token`, caches token in-memory per isolate keyed to expiry-60s.
  - Typed wrappers: `createDocumentFromTemplate`, `prefillFields`, `createEmbeddedInvite`, `getEmbeddedSigningLinks`, `downloadDocument`, `createWebhookSubscription` (used once at setup).
  - Every non-2xx from SignNow surfaces `[status]: body` upstream.
- **`signnow-webhook`** (`verify_jwt=false`):
  - Verifies HMAC-SHA256 signature header (`x-neap-signature` / SignNow's documented header) using `SIGNNOW_WEBHOOK_SECRET`.
  - Idempotent write into `signnow_webhook_events` on `event_id` unique.
  - Handles `document.complete`, `document.update`, `document.field_invite.signed`: updates `documents.status`, appends `signers[i].signed_at`, downloads final PDF on `document.complete` and stores it to `signed-documents/{doc.id}.pdf`, and inserts an in-app `notifications` row for each participant.
- **`signnow-create-embedded-session`** (auth required):
  - Input: `{ document_id, signer_role }`. Verifies the caller is that signer, returns a fresh embedded signing `url` (short-lived) for the modal iframe.
- **`signnow-download-signed`** (auth required):
  - Returns a signed Storage URL to `signed_pdf_path` after RLS check.

---

## 2. Flow 1 — Rental agreement

**Trigger.** On host approval of a `booking_requests` row (existing approval edge function) OR on instant-book confirmation, call a new helper `ensureRentalAgreement(booking_id)`:

1. Load booking + listing + host + renter + terms (rate, deposit, dates, cancellation policy already stored in the booking/transaction_terms).
2. Create a document from the master **rental_agreement** SignNow template via API.
3. Prefill text-tag fields: `{{host_name}}`, `{{renter_name}}`, `{{listing_title}}`, `{{start_date}}`, `{{end_date}}`, `{{daily_rate}}`, `{{total_amount}}`, `{{deposit_amount}}`, `{{cancellation_policy}}`.
4. Create embedded field-invites for role `host` and role `renter`.
5. Insert `documents` row (`status=sent`, `document_type=rental_agreement`, `booking_id=…`, signers seeded).

**UI.** New `<DocumentsCard type="rental_agreement" bookingId=… />` on `BookingDetail` / `HostBookingDetail`:

- Header: "Free e-signature included — protects both parties" (token design, no orange CTA hijack).
- Per-signer chip: `Awaiting your signature` / `Waiting on host` / `Completed`.
- Primary button `Review & sign` opens `<EmbeddedSigningSheet>` (Radix Sheet on desktop, Drawer on mobile) that hosts an iframe pointing at the URL returned by `signnow-create-embedded-session`.
- On `document.complete` webhook, the card polls (or reacts to a Supabase realtime channel on `documents`) and swaps in `Download signed agreement` → calls `signnow-download-signed`.
- Non-blocking: booking flow continues regardless. Gentle amber footnote until both signed.

## 3. Flow 2 — Bill of sale

**Trigger.** Stripe webhook path we already own (`stripe-webhook`) — when `sale_transactions.status` transitions to `paid`, call `ensureBillOfSale(transaction_id)`:

1. Master **bill_of_sale** template, fields: `{{buyer_name}}`, `{{seller_name}}`, `{{listing_title}}`, `{{vin}}` (blank when not present), `{{sale_price}}`, `{{sale_date}}`, `{{as_is_clause}}` (fixed template text).
2. Same embedded-invite pattern, roles `buyer` and `seller`.
3. On `document.complete` webhook, set `sale_transactions.bill_of_sale_completed_at = now()`.

**UI.** Same `<DocumentsCard type="bill_of_sale" transactionId=… />` on `TransactionDetail`, both buyer and seller views.

## 4. UX + copy

- Section heading: **Documents**.
- Trust line: **Free e-signature included — protects both parties**. Subline: "Powered by SignNow. Signatures are legally binding under the ESIGN Act." No pricing anywhere.
- Notarize stub: a disabled `Notarize this document` row with tooltip "Coming soon — online notarization via SignNow Proof." No routing, no CTA event.
- Emails: extend transactional email system with two templates — `rental-agreement-ready`, `bill-of-sale-ready`, plus completion twins. Every link is `https://vendibook.com/bookings/{id}?doc={documents.id}` or the transaction equivalent — never a raw SignNow URL.

## 5. Sandbox test (I run this at the end)

Two live end-to-end tests against `api-eval.signnow.com` using a freshly created synthetic host+renter and buyer+seller pair. For each flow I'll report PASS/FAIL on:

1. OAuth token fetched.
2. Document created from template.
3. Embedded invite URLs returned for both roles.
4. Both roles sign inside the iframe.
5. `document.complete` webhook received, signature verified, idempotent row landed.
6. Signed PDF downloaded and written to `signed-documents/`.
7. `documents.status = completed` and (bill of sale) `bill_of_sale_completed_at` set.

## Templates I need in your SignNow account

Two templates, both authored with text tags so field IDs stay stable across template edits:

**rental_agreement** — tags: `{{host_name}} {{renter_name}} {{listing_title}} {{start_date}} {{end_date}} {{daily_rate}} {{total_amount}} {{deposit_amount}} {{cancellation_policy}} {{host_signature}} {{renter_signature}} {{sign_date_host}} {{sign_date_renter}}`

**bill_of_sale** — tags: `{{buyer_name}} {{seller_name}} {{listing_title}} {{vin}} {{sale_price}} {{sale_date}} {{as_is_clause}} {{buyer_signature}} {{seller_signature}} {{sign_date_buyer}} {{sign_date_seller}}`

Store their template IDs in two more secrets so we don't hardcode: `SIGNNOW_TEMPLATE_RENTAL_AGREEMENT`, `SIGNNOW_TEMPLATE_BILL_OF_SALE`.

## Explicit non-goals (v1)

- No notarization wiring beyond the disabled stub.
- No signature paywall, no per-document metering.
- No purchase_agreement / kitchen_agreement / handoff_acknowledgment flows yet (enum reserved, but no triggers/UI).
- No bulk-send, no reminders scheduling — SignNow's default reminder is enough for v1.

## Production switch checklist (for later)

1. Create production SignNow app + service user.
2. Recreate the two templates in the production account, capture new template IDs.
3. Update secrets: `SIGNNOW_API_BASE=https://api.signnow.com`, new `SIGNNOW_CLIENT_ID/SECRET/BASIC_AUTH`, new `SIGNNOW_SERVICE_USER_*`, new template ID secrets, new `SIGNNOW_WEBHOOK_SECRET`.
4. Re-subscribe the webhook to point at the production project's `signnow-webhook` URL.
5. Smoke-test one rental + one bill of sale end-to-end in prod.

---

## Files I'll add / change

- Migration: `documents`, `signnow_webhook_events`, `sale_transactions.bill_of_sale_completed_at`, private `signed-documents` bucket + RLS.
- `supabase/functions/_shared/signnow.ts` (client + typed API wrappers).
- `supabase/functions/signnow-webhook/index.ts`.
- `supabase/functions/signnow-create-embedded-session/index.ts`.
- `supabase/functions/signnow-download-signed/index.ts`.
- `supabase/functions/_shared/ensureRentalAgreement.ts` + call site inside the existing booking-approval function.
- `supabase/functions/_shared/ensureBillOfSale.ts` + call site inside `stripe-webhook` on `paid` transition.
- `src/components/documents/DocumentsCard.tsx`, `EmbeddedSigningSheet.tsx`, `SignerStatusChip.tsx`, `useDocuments.ts` hook (realtime).
- Wire `<DocumentsCard>` into `BookingDetail`, `HostBookingDetail`, `TransactionDetail`.
- Two transactional email templates + registry updates.
- README section `docs/signnow.md` documenting template tags + production switch.

Please confirm and add the secrets above; I'll then run the migration, build the code, and execute the sandbox tests.
