
# READ-ONLY AUDIT — no code, DB, Stripe, Tawk, or secret changes were made in this pass.

## A. Subscription lifecycle

### Live evidence (production DB, this session)
- `user_consents` where `document_type='subscription_terms'`: **3 rows**, all with `trigger_action='subscription_start'`, dated 2026-07-25 (two `host_growth`, one `host_starter`). `related_ids` correctly carries `product_slug`.
- `monetization_purchases` rows tied to those consents: **3 rows, all `status='failed'`**, each with a real `cs_live_…` Stripe Checkout Session id. Products = `host_growth` ×2, `host_starter` ×1. Amount_cents matches the product row.
- `host_subscriptions`: **0 rows.**
- `stripe_webhook_events` (all endpoints, all event types): **0 rows, ever.**
- `monetization_products` where `billing_type='recurring'`: 6 active (host_starter/growth/operator × monthly/annual) + 2 inactive (seller_plus). All have `stripe_price_id` populated.

### The chain, end-to-end (files & line anchors)

1. **Legal consent overlay & CTA gate**
   - `src/components/monetization/SubscriptionConsentDialog.tsx`, used from `src/components/listing-wizard/MembershipInlinePanel.tsx`, `src/components/monetization/PremiumTierCard.tsx`, `UpgradePackageCards.tsx`, `PremiumPlansSection.tsx`, `RecommendedAddOns.tsx`, `UnlockLadder.tsx`, `ProductPricingCard.tsx`, `src/components/dashboard/permits/PermitsGate.tsx`.
   - Consent flow: writes a `user_consents` row (`document_type='subscription_terms'`, `trigger_action='subscription_start'`, `related_ids.product_slug`). ✅ Working — 3 rows prove it.

2. **Checkout session creation**
   - `supabase/functions/create-monetization-checkout/index.ts`
     - Verifies consent (lines 115–151): user_id match + document_type + trigger_action + optional product_slug match.
     - Idempotency key = `mon-{user}-{product}-{listing}-{hour}` (line 246) + Stripe `idempotencyKey`.
     - Uses `product.stripe_price_id` (line 286). ✅ Every recurring product has one.
     - `mode: 'subscription'` when `billing_type='recurring'` (line 314).
     - Attaches `metadata.consent_id`, `product_slug`, `user_id`, `listing_id`, `idempotency_key` (300–307) and mirrors these onto `subscription_data.metadata` (322–333) so downstream renewals can resolve.
     - Success URL: `/payment-success?monetization=true&session_id={CHECKOUT_SESSION_ID}`; cancel: `/dashboard?purchase=cancelled`. ✅ Return state preserved.
   - Purchase row upserted with `status='pending'` (338–357). The three `failed` rows in prod indicate this ran successfully; something later marked them failed (Stripe session expired without paid completion, or the reconciler flipped them). Consistent with "no webhook ever fired against us."

3. **Webhook handling**
   - `supabase/functions/monetization-webhook/index.ts` — 744 lines, handles `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.paid`, `invoice.payment_failed`. Signature verified with `STRIPE_MONETIZATION_WEBHOOK_SECRET` (falls back to `STRIPE_WEBHOOK_SECRET` if unset, line 20). Writes to `host_subscriptions` and `monetization_purchases`, plus `stripe_webhook_events` for audit.
   - `supabase/functions/stripe-webhook/index.ts` — 1842 lines, orders/payments; also requires `STRIPE_WEBHOOK_SECRET`.
   - Both secrets are present in the sandbox env. Function code is correct.

4. **Persistence + entitlement refresh**
   - `host_subscriptions` table exists with correct RLS (`user_id = auth.uid()` or admin).
   - Client hooks read it live: `useHostEntitlements.ts`, `useEntitlements.ts`, `useToolAccess.ts`, `useTierGate.ts`, `useListingQuota.ts`. Wizard already invalidates these queries on return per prior turn.

5. **Gates on actual features** (verified surfaces)
   - Pricing assistant / listing writing / photo tools / listing benefits → `useToolAccess` + `resolveToolAccess` (server) → `monetization_purchases` + `host_subscriptions`.
   - Pro/Business surfaces (`MembershipInlinePanel`, `PremiumPlansSection`, `PermitsGate`) → `useHostEntitlements` / `resolveHostTier` (server) → `host_subscriptions.status IN ('active','trialing')`.
   - Gates are wired correctly, but they can never flip **on** because no `host_subscriptions` row is ever created without a webhook.

### Break-point diagnosis (single most likely cause)

**Stripe webhook deliveries are not reaching either endpoint at all** (0 rows in `stripe_webhook_events` across every endpoint, every event type, every day). Because:
- All three real users completed the consent gate → completed edge-function call → got a live `cs_live_…` Checkout Session (`monetization_purchases` proves it).
- If Stripe delivered any event with the wrong secret, the function would still record a signature-verification failure row (or at minimum server logs would exist). The absence of *any* row across both endpoints indicates the Stripe Dashboard endpoints are either **not configured**, **disabled**, or **pointed at a different URL** (e.g. a stale preview host / old function name).

This is the same class of finding surfaced two turns ago ("Stripe webhooks rejected: signing-secret mismatch"), unresolved because the fix is Stripe-side.

Contributing/secondary risks worth reporting but not the primary blocker:
- `monetization-webhook` falls back to `STRIPE_WEBHOOK_SECRET` when `STRIPE_MONETIZATION_WEBHOOK_SECRET` is unset (index.ts:20). If the owner ever configures **one** endpoint in Stripe that fans out both, and the fallback path is used, one of the two functions will get a signature it can't verify. Not the current cause (zero events at all), but a latent footgun.
- Failed purchases are not surfaced back to the user; they see `/payment-success` regardless if they navigate manually. Low-severity UX, not the break-point.

### Do the smoke tests actually prove live behavior?

`scripts/smoke/subscription-lifecycle-smoke.ts` (706 lines):
- Signs fixture events with the **test** webhook secret and POSTs them directly to `functions/v1/monetization-webhook`, then asserts DB state.
- ✅ Proves function code + signing math + DB writes work when a request arrives.
- ❌ Does **not** prove Stripe → our endpoint delivery. If Stripe never posts to us (current situation), this suite still passes and everything looks green. This is exactly why prod has 3 consents, 0 subscriptions, and no one noticed.
- The suite is also gated `process.exit(0)` locally when secrets missing (line 44); only fails in CI (line 43). That's fine, but it means it doesn't run for owner spot-checks.

## B. Report an Issue + Tawk.to

### What exists (verified in code + DB)

**Schema** (all present):
- `support_tickets` (45 cols) — includes `source`, `tawk_ticket_id` (unique when set), `tawk_chat_id`, `tawk_property_id`, `customer_email`, `customer_name`, `first_response_at`, `first_response_due_at`, priority + status + rich related_* FKs. RLS: users see own + admins see all; users can insert; admins update.
- `support_ticket_messages` (7 cols, 2 policies).
- `support_ticket_attachments` (8 cols, 2 policies).
- `support_ticket_audit_events` (10 cols, 1 policy).
- `support_ticket_webhook_events` (10 cols, 1 policy) — dedupe by `(source, external_event_id)`.

**Customer UI**
- `src/components/support/ReportIssueDialog.tsx` (454 lines) + `ReportIssueButton.tsx` — reusable, auto-captures page URL / feature area / related IDs, submits via edge function. Rendered from wizard, listing detail, permit path, order tracking, help center, host onboarding, and `FloatingConciergeButton`.
- `SocialContactOptions.tsx`, `GetHelpWithOrder.tsx` for adjacent channels.
- **No customer "my tickets" page.** After submit, the user has no in-app view of their own ticket history. `AdminSupportTickets.tsx` exists for admins only.

**Admin UI**
- `src/pages/AdminSupportTickets.tsx` — inventory + triage surface.

**Edge functions**
- `supabase/functions/submit-support-ticket/index.ts` (290 lines) — server derives priority from category, sends acknowledgement + admin notification, idempotency-guarded.
- `supabase/functions/tawk-webhook/index.ts` (342 lines) — HMAC-SHA1 verify against `TAWK_WEBHOOK_SECRET`, dedupes by `(source, external_event_id)`, inserts one `support_tickets` row per Tawk event, writes audit + acknowledgement email. Uses `verify_jwt = false`.
- `check-ticket-status`, `bulk-sync-zendesk`, `zendesk-webhook`, `create-zendesk-ticket` (legacy, memory notes Zendesk is removed from user flows).

**Tawk widget**
- Loaded in `index.html:152–168` (property `68300d3b16f3f4bfe08eec8f`).
- `FloatingConciergeButton.tsx` and `HelpCenter.tsx` call `window.Tawk_API.{showWidget,maximize,hideWidget,minimize}`. There is no server-side Tawk REST integration.
- Env: `TAWK_WEBHOOK_SECRET` is set. No `TAWK_API_KEY` / `TAWK_PROPERTY_ID` env variables exist — outbound Tawk API access isn't wired.

### Gaps vs. "Vendibook-native tickets as system of record"

| Area | Status |
|---|---|
| DB schema for native tickets | ✅ Complete |
| Customer submit path | ✅ Complete (`submit-support-ticket`) |
| Customer ack email | ✅ Sent by edge function |
| Admin triage UI | ✅ `AdminSupportTickets.tsx` |
| **Customer "my tickets" view** | ❌ Missing |
| **Two-way threaded reply UI** (customer ↔ admin using `support_ticket_messages`) | ❌ Missing (schema exists, no UI) |
| **Attachment upload UI** | ❌ Missing (table + RLS exist) |
| Tawk inbound (chat/ticket → our DB) | ✅ `tawk-webhook` handler present, dedupe correct |
| **Tawk widget → identify user** (pre-fill email/name via `Tawk_API.setAttributes`) | ❌ Not wired — increases duplicate-ticket risk |
| **Tawk widget path-based visibility** | Partial (`FloatingConciergeButton` shows/hides) |
| Tawk REST API outbound (post reply from admin UI into Tawk conversation) | ❌ Not wired, not officially supportable without documented Tawk REST + JWT auth per property; recommend Vendibook-native replies only |

### Recommendation — system of record

**Adopt Vendibook-native `support_tickets` as the sole source of truth.** Keep Tawk purely as an **inbound intake channel** (live chat + Tawk web form) whose events land in our DB via the existing `tawk-webhook`. Do **not** attempt outbound writes back into Tawk conversations from server code — Tawk's REST surface is limited and not officially documented for arbitrary two-way sync, so trying would be brittle and unsupported.

Officially supportable Tawk capabilities (no unofficial MCP):
- ✅ Embed widget + JS API (`showWidget`, `hideWidget`, `maximize`, `minimize`, `setAttributes`, `addEvent`, `visitor` prefill).
- ✅ Inbound webhooks: `chat:start`, `chat:end`, `chat:transcript_created`, `ticket:create` (already handled).
- ❌ Server-side ticket mutation / two-way reply threading requires manual admin work inside the Tawk dashboard.

## Minimal staged remediation plan (implementation happens only after explicit owner approval)

### Stage 1 — Unblock subscriptions (external, owner-only)
Requires owner action in the Stripe Dashboard (not something Lovable can perform):
1. Open Stripe Dashboard → Developers → Webhooks. Confirm two endpoints exist and are **enabled**, pointed at the current project host:
   - `https://<project>.supabase.co/functions/v1/stripe-webhook` — events: `checkout.session.*`, `payment_intent.*`, `charge.*`, `account.updated`, `transfer.*`, `payout.*`.
   - `https://<project>.supabase.co/functions/v1/monetization-webhook` — events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`.
2. For each endpoint, copy its **Signing secret** and store them in project secrets as `STRIPE_WEBHOOK_SECRET` (orders) and `STRIPE_MONETIZATION_WEBHOOK_SECRET` (monetization). They must be distinct.
3. Trigger a "Send test event" from Stripe for each endpoint and confirm rows appear in `stripe_webhook_events`.

### Stage 2 — Guardrails (small code changes; owner approval required)
- **Remove the `STRIPE_WEBHOOK_SECRET` fallback** in `monetization-webhook/index.ts:20` so misconfiguration fails loudly instead of silently mis-verifying.
- **Backfill for the three stranded consenters**: for each `monetization_purchases` row with `status='failed'` whose `stripe_session_id` shows `paid` in Stripe, re-drive the webhook via `stripe events resend` (owner-run) or an admin edge action; if not paid, notify the three users their attempt didn't complete.
- **Live-delivery smoke**: add a nightly job that asserts `stripe_webhook_events` has ≥1 row in the last 24h; page owner if zero. This closes the "green CI, silent prod" gap.
- **Failed-purchase surfacing**: `/payment-success` should confirm against `monetization_purchases.status='completed'` before congratulating; otherwise show a retry CTA.

### Stage 3 — Native ticket experience (owner approval required)
- **Customer `MyTickets` page** at `/account/support`: paginated list from `support_tickets` scoped by `user_id`; detail view lists `support_ticket_messages`.
- **Two-way threaded replies**: new edge function `post-ticket-message` (auth required, inserts into `support_ticket_messages`, writes audit row, emails counterpart). Admin surface adds reply composer.
- **Attachment upload**: reuse storage pattern from booking_documents; write to `support_ticket_attachments`.
- **Tawk visitor identification**: on authenticated pages, call `Tawk_API.setAttributes({ name, email, hash })` server-signed via `TAWK_API_KEY` (owner adds env). Reduces duplicate tickets by matching Tawk transcripts to our user on inbound webhook.
- **Deprecate Zendesk edge functions** already unused per project memory (`create-zendesk-ticket`, `zendesk-webhook`, `bulk-sync-zendesk`, `check-ticket-status`) after confirming zero recent invocations.

### Stage 4 — Test coverage (no prod side-effects)
- Extend `subscription-lifecycle-smoke.ts` with a **delivery-observability** assertion (queries `stripe_webhook_events` for a recent real Stripe test-mode ping).
- Add `support-ticket-smoke.ts` covering: submit → row inserted → ack email queued → admin can read → user can read own → anon blocked → Tawk webhook dedupe.

## Production changes that require explicit owner approval before I execute

1. **Stripe Dashboard reconfiguration** (Stage 1) — external, only the owner can do this.
2. **Edit `monetization-webhook/index.ts`** to remove the secret fallback (Stage 2).
3. **Backfill / re-drive the 3 stranded purchases** and outreach email content (Stage 2).
4. **New `/account/support` route + reply/attachment surfaces + `post-ticket-message` edge function** (Stage 3).
5. **Adding `TAWK_API_KEY` (or JS-API identity hash secret) as a project secret** and wiring `setAttributes` (Stage 3).
6. **Removing legacy Zendesk edge functions** (Stage 3).
7. **New nightly delivery-observability smoke job and CI wiring** (Stage 4).

Nothing in this audit turn changed code, database rows, secrets, Stripe, or Tawk. Waiting for approval on which stages to execute and in what order.
