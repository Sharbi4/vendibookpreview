# Vendibook Email System Audit (read-only)

No code changed, nothing deployed, no email sent. Findings below are traced from live code, live `cron.job`, and live `email_send_log` data.

## A. Architecture summary

There are **three unconnected sending systems**, not one.

```text
1. AUTH            GoTrue -> auth-email-hook -> enqueue_email('auth_emails')
                   -> process-email-queue -> Lovable email API (Mailgun)
                   Templates: _shared/email-templates/*.tsx (6)

2. TRANSACTIONAL   caller -> send-transactional-email -> render React Email
                   -> suppressed_emails check -> enqueue_email('transactional_emails')
                   -> process-email-queue -> Lovable email API
                   Templates: _shared/transactional-email-templates/registry.ts (65 keys)
                   Callers: ~48 edge functions + pg_cron + DB triggers + 3 client-side pages

3. MARKETING       23 edge functions -> direct fetch to api.resend.com
                   Templates: _shared/marketing-templates/*.ts + ~15 inline HTML strings
                   From: report@ / hello@ / noreply@ / support@ updates.vendibook.com
```

"Transactional through Lovable" is already true for path 2 — it is the queue-backed, logged, idempotent, suppression-checked path. The realistic target state is: **everything that is not a bulk campaign moves into path 2**, and Resend keeps only the Vendibook Report, blog broadcasts, and one-off campaigns. Today several genuinely transactional-ish emails (marketplace digest, blog receipts, dimension prompt, Tawk forward) go out through Resend with no logging and no idempotency.

Sender domains in use: `notify.vendibook.com` (queue-verified sender, From shown as `vendibook.com`) for paths 1–2; `updates.vendibook.com` for path 3.

## B. Email inventory

Consolidated by family. 65 registered transactional templates + 6 auth + ~10 marketing.

| Email | Category | Trigger | Recipient | Provider/path | Template/function | Status / issues | Rec |
|---|---|---|---|---|---|---|---|
| signup, magic-link, recovery, email-change, invite, reauthentication | Auth | GoTrue | user | Lovable queue | `email-templates/*` via `auth-email-hook` | Healthy; 8 signup + 2 recovery sends logged | Keep |
| welcome | Auth-adjacent | `send-welcome-email` | new user | Lovable queue | `welcome.tsx` | 127 sent | Keep |
| booking-confirmation, booking-request-host, booking-approved/declined-guest, booking-cancelled, booking-reminder-24h | Transactional | checkout, status change, cron | guest/host | Lovable queue | 6 templates | Working | Keep |
| booking-abandoned | Lifecycle | cron `*/30` | draft guest | Lovable queue | `booking-abandoned.tsx` | Overlaps draft-nudge family | Needs decision |
| payment-receipt, order-receipt, refund-processed / refund-issued, featured-payment-receipt/refunded | Transactional | payment + PayPal webhook | payer | Lovable queue | 5 templates | 3 near-identical receipts | Merge |
| payout-sent, sale-completed-seller | Transactional | payout/sale | seller | Lovable queue | 2 templates | **`sale-completed-seller` says funds release to "your Stripe account"** | Keep + fix copy |
| offer-received-seller, offer-counter-buyer, offer-resolved | Transactional | offer events | buyer/seller | Lovable queue | 3 templates | Fine | Keep |
| cash-purchase-request-buyer/seller, cash-*-confirmed-* | Transactional | cash sale flow | both | Lovable queue | 4 templates | No caller found by grep — verify reachability | Needs decision |
| new-message | Transactional | **DB trigger** on messages | recipient | Lovable queue | `new-message.tsx` | 7 sends | Keep |
| document-status | Transactional | cron + status change | user | Lovable queue | `document-status.tsx` | Keep | Keep |
| generic-notice | Transactional catch-all | 10+ callers incl. client pages | anyone | Lovable queue | `generic-notice.tsx` | 212 sent, **259 suppressed** — highest suppression rate in system | Keep, investigate |
| support-reply | Transactional | contact/dispute/callback/Tawk | lead | Lovable queue | `support-reply.tsx` | Keep | Keep |
| verified-seller-receipt | Transactional | Plaid verify | seller | Lovable queue | correct (Plaid) | Keep | Keep |
| subscription-* (6), pro-membership-* (5), permitpath-plus-* (4), upgrade-purchased, weekly-pass-* | Transactional | PayPal webhook + cron | subscriber | Lovable queue | 17 templates | **9 of these bypass shared brand chrome entirely**; `subscription-payment-failed` links to a Stripe billing portal | Merge + fix |
| host-daily / shopper-daily / seller-daily / host-weekly digests | Lifecycle | cron | host/shopper/seller | Lovable queue | 4 templates | **Daily digests dead since 2026-07-27; 379 shopper + 802 host went to DLQ** | Retire dailies |
| admin-daily-digest, feedback-received-admin, featured-payment-admin-alert, feedback-weekly-digest | Internal | cron + events | admin/`shawnnaharbin@` | Lovable queue | 4 templates | 85 pending never sent 2026-08-20 | Merge into one |
| listing-published, listing-draft-nudge, listing-recovery-cs, account-ready-recovery, complimentary-featured-boost, new-listing-alert, featured-boost-expired | Lifecycle | publish, cron, admin | host/seller | Lovable queue | 7 templates | draft-nudge 326 sent today; **2 crons both fire draft-reminder** | Merge |
| review-request + feedback-request | Lifecycle | cron daily | guest | Lovable queue | 2 templates | Duplicative | Merge |
| referral-onboarding, referral-post-tx-ps | Lifecycle | cron | referrer | Lovable queue | 2 templates | Keep | Keep |
| **stripe-onboarding-nudge** | Obsolete | 2 active crons | hosts | Lovable queue | **function deleted from repo** | 29 sent 2026-07-31; crons still active and now 404 | **Retire crons** |
| Vendibook Report | Marketing | cron Tue/Sat + admin UI | opted-in list | **Resend** | `vendibook-report.ts` | Keep | Keep |
| Marketplace digest | Marketing | cron every 2 days | Resend Audience | **Resend Broadcast** | `send-marketplace-digest` | Bypasses all logging | Keep, log it |
| Blog campaigns, Equinox partnership, financing announcement/correction, spotlight invite, Texas law, launch, newsletter | Marketing | admin one-offs | lists | **Resend** | 10+ functions | Mostly spent one-shots | Retire spent ones |

## C. Branding inconsistencies

- **Four logo URLs.** Canonical is `email-assets/vendibook-hero-logo.png` (1000×293) — used by auth + transactional. `vendibook-email-logo.png` in the same bucket is byte-identical to it (both 171,158 B), so that is a harmless duplicate. `vendibook-email-logo-dark.png` is the correct white-wordmark variant for dark headers. The outlier is `LOGO_DARK_URL = vendibook.com/images/vendibook-logo.png` — **1536×1024, 2.1 MB, and it is the light-background logo**, so it renders dark-grey text on a dark footer *and* adds 2 MB to the email. This is the one genuine asset bug.
- **Verified visually:** all four are the same current Vendibook mark (orange pin + "vendibook" wordmark). So the branding problem is sizing/variant selection, not a stale logo.
- **Nine templates have no logo at all** — `pro-membership-*` (5) and `permitpath-plus-*` (4) use a text-only wordmark, no footer nav, no support email. Biggest visual outlier, and it covers paid subscription lifecycle.
- **Four design systems**: dark editorial (`_styles.ts`, ~55 templates, 560px, `Helvetica Neue`, 10px button radius, dark text on orange); light membership (`_stylesLight.ts`, 9 templates, white text on orange, 12px radius); auth (`email-templates/_styles.ts`, a hand-mirrored near-duplicate of the transactional tokens that has already drifted); marketing raw HTML (600px tables, `DM Sans` / `-apple-system`, pill 999px buttons, five different background hexes).
- **Three separate header/footer implementations** (`_blocks.tsx`, `_brand.tsx`, per-file inline HTML) that must be hand-synced.
- **Sender sprawl**: `support@vendibook.com`, `report@`, `hello@`, `noreply@`, `support@updates.vendibook.com`, `preview@vendibook.com`, plus `shawnnaharbin@vendibook.com` hardcoded as a recipient.
- **No media queries anywhere.** All families rely on `width:100%` fluid fallback. Acceptable, but no dark-mode handling and no mobile-specific type scale.
- `MAILING_ADDRESS` is defined in marketing constants and **never rendered** — a CAN-SPAM gap on exactly the sends that legally require it.

## D. Stale / factually wrong content

Ranked by blast radius.

1. `faq-chatbot/index.ts:30-37` — tells users payments run on **Stripe**, funds are **held in escrow**, and the fee is **"typically 10-15%"**. All three are false. Live, user-facing.
2. `sale-completed-seller.tsx:19` — "Funds are released to your **Stripe account** after fulfillment confirmation." Registered and reachable; contradicts the 24–48h PayPal/ACH/Venmo policy.
3. `subscription-payment-failed.tsx:51` — links subscribers to a **"Stripe billing portal"** that no longer exists.
4. `raise-dispute/index.ts:169` — "Payment will remain in **escrow**... review within 3–5 business days." Escrow is wrong; the SLA is unverified. Locked in by `agreed_terms_email.test.ts:243`.
5. `featured-payment-admin-alert.tsx:50` — label reads "STRIPE PAYMENT".
6. `AdminEmailDashboard.tsx` tool catalog offers **"24/7 Support"** and **"Background-Checked Hosts"** as copy blocks. Support is Mon–Fri 9–5 AZ, and there is no background-check product. These get composed into real newsletters.
7. `subscription-activated.tsx:135` — Stripe invoice URL in previewData (cosmetic).

Clean: no Affirm/Klarna/Afterpay, no $149 concierge, no retired plan names, no "25 days" payout language remaining (the correction campaign already fixed it), fees correctly 12.9%/10.9%, verification correctly Plaid.

## E. Duplicates / obsolete

| Item | Rec | Reason |
|---|---|---|
| `stripe-onboarding-reminder-daily` + `send-stripe-onboarding-reminder-daily` crons | **Retire both** | Duplicate crons for a function deleted from the repo; last delivered 29 emails on 2026-07-31 |
| `referral-payout-batch-weekly` cron | Needs decision | Target function absent from repo |
| `notify-expired-boosts` + `notify-expired-boosts-hourly` | **Retire one** | Same function, two schedules (hourly and 6-hourly) |
| `send-draft-reminder-hourly` + `send-abandoned-listing-reminders` | **Merge** | Same function, two schedules |
| host/shopper/seller **daily** digests | **Retire** | Dead since 2026-07-27, 1,181 messages went to DLQ; weekly digest already covers it |
| `payment-receipt` / `order-receipt` / `featured-payment-receipt` | **Merge** to one | Near-identical layouts |
| `review-request` + `feedback-request` | **Merge** | Same ask |
| `booking-abandoned` + `listing-draft-nudge` + `send-abandoned-listing-email` | **Merge** | Three abandonment nudges |
| 4 admin alert templates | **Merge** to one digest | Noise; 85 pending admin digests never delivered |
| Spent one-shot campaigns (`send-texas-law-broadcast`, `send-launch-email`, `send-financing-announcement`, `send-financing-correction`, `send-blog-broadcast-once`, `backfill-listing-published-emails`) | **Retire** | One-time sends already executed; each is a live re-send hazard |
| `_brand.tsx` vs `_blocks.tsx` | **Merge** | Duplicated brand chrome |

## F. Missing high-value lifecycle emails

Not in the inventory today:

- **Buyer**: saved-search "price dropped on a listing you favorited"; "your offer expires in 24h"; post-purchase "what happens next" handoff/pickup logistics.
- **Seller**: first-listing-view and first-inquiry milestone; "your listing has had no views in 7 days, here's why" (a `host-reengagement-emails` function exists but has **no cron** — it never runs); price-guidance nudge on stale listings.
- **Rental**: post-stay "leave a review" for hosts (guest-side only exists); host payout-eligibility confirmation.
- **Subscription**: pre-renewal receipt for annual plans; dunning sequence beyond a single payment-failed (no retry 2/3 emails); win-back after cancellation.
- **Account**: new-device/new-location sign-in alert; email-changed confirmation to the *old* address.

## G. Suppression / unsubscribe / bounce

- **Confirmed cross-contamination.** `send-transactional-email` gates on exactly one table, `suppressed_emails` (line 270). `marketing-unsubscribe` and `unsubscribe-email` both write into `suppressed_emails` alongside `email_unsubscribes` and `newsletter_subscribers`. Live data: `suppressed_emails` holds **19 rows with reason `unsubscribe`** and 31 `bounce`. So up to 19 people who opted out of the *newsletter* can no longer receive booking confirmations, receipts, or dispute notices. This is the single most damaging finding.
- **Inverse gap**: `marketing-resend-webhook` writes marketing bounces/complaints only to `email_unsubscribes` (currently 0 rows) — never to `suppressed_emails` — so a hard-bouncing address stays eligible for transactional mail.
- **Two token systems**: `email_unsubscribe_tokens` (212 rows, transactional one-click, RFC 8058) vs `email_unsubscribes` + `newsletter_subscribers` (48) + `blog_subscribers` (0). No shared resolution.
- **`notification_preferences` (9 rows) is honored by only three callers** — booking, sale, offer notifications. Digests, subscription lifecycle, disputes, and admin mail ignore it entirely.
- **Delivery health**: `email_send_log` has 12,296 rows. Notable failures — shopper-daily-digest 379 DLQ / 1,895 failed, host-daily-digest ~802 stuck pending, admin-daily-digest 85 pending from today, 33 `system` rows marked `bounced`.
- **Security finding**: `send-transactional-email` is `verify_jwt = false` in `config.toml:193`, while the comment inside the function asserts the opposite ("this function uses verify_jwt = true... No in-function auth check is needed"). It performs no role check. Anyone on the internet with the publishable anon key can send **any of the 65 registered templates to any address** with attacker-controlled `templateData`. `preview-transactional-email` is also `verify_jwt = false` but does check `LOVABLE_API_KEY`, so it is fine.
- **Secondary**: `send-test-draft-email` accepts a caller-supplied `to` with no auth gate. `test-send-subscription-emails` does it correctly (validates JWT, checks `user_roles.role='admin'`).
- Long-lived anon JWTs are embedded in plaintext inside cron `command` SQL.

## H. Safe testing approach for Atlasmom421@gmail.com

There is **no** `EMAIL_TEST_MODE` today. `MARKETING_TEST_EMAIL` is only a fixed destination for three marketing functions, not a global override.

Recommended, in this order:

1. **Add a global override in `send-transactional-email` and `process-email-queue`.** If secret `EMAIL_TEST_MODE=on`, replace every recipient with `EMAIL_TEST_RECIPIENT` (set to `Atlasmom421@gmail.com`), prefix the subject with the original recipient, and write the true intended recipient into `email_send_log.metadata`. This is the only mechanism that makes an accidental production send structurally impossible during the rebuild.
2. **Use `preview-transactional-email` for visual QA with zero send risk.** It already renders every registered template from `previewData` and is `LOVABLE_API_KEY`-gated. Extend it to return all 65 rather than sending anything.
3. **Generalise `test-send-subscription-emails` into an admin test harness** — it already has the correct pattern (JWT + `user_roles` admin check + caller-supplied `to`). Widen it to accept any `templateName`, defaulting `to` to `Atlasmom421@gmail.com`, and require an explicit `confirm: true` for any recipient other than the test inbox.
4. **Before any test run**, confirm `Atlasmom421@gmail.com` is not in `suppressed_emails`, or the harness will silently no-op.
5. **Do not** use `send-test-draft-email` until it is gated.

## I. Recommended implementation order

1. **Stop the bleeding (no template work).** Unschedule the two `stripe-onboarding-reminder` crons and the other duplicate crons; set `verify_jwt = true` on `send-transactional-email` and add a service-role/admin check; gate `send-test-draft-email`.
2. **Fix suppression semantics.** Split `suppressed_emails` into a marketing-scope and a transactional-scope check so a newsletter opt-out stops blocking receipts; make marketing bounces write to both; re-review the 19 affected addresses.
3. **Ship the test harness** (section H, items 1–3) so every later step is verifiable safely.
4. **Correct the false copy** in section D — Stripe/escrow/fee claims first, since those are live and legally exposed.
5. **Unify the brand kit** — one `_styles`/`_blocks` module shared by auth + transactional + marketing, one logo constant, fix the 2.1 MB dark logo, bring the 9 membership templates onto the shared chrome, render `MAILING_ADDRESS` in marketing footers, consolidate senders.
6. **Consolidate the inventory** per section E — retire spent campaigns and dead digests, merge the receipt/nudge/admin-alert families. Target roughly 65 → ~40 templates.
7. **Route the remaining Resend-only transactional-ish sends** through the queue so everything is logged and idempotent.
8. **Add the missing lifecycle emails** from section F, one funnel at a time.

## J. Inspected

**Config/infra**: `supabase/config.toml`; live `cron.job` (29 jobs, 20 email-related); live `email_send_log` (12,296), `suppressed_emails` (50), `email_unsubscribes` (0), `email_unsubscribe_tokens` (212), `newsletter_subscribers` (48), `blog_subscribers` (0), `email_sends` (21), `email_events` (5,193), `email_test_sends` (18), `notification_preferences` (9).

**Core functions**: `send-transactional-email`, `auth-email-hook`, `process-email-queue`, `preview-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, `marketing-unsubscribe`, `unsubscribe-email`, `marketing-resend-webhook`, `marketing-send-broadcast`, `marketing-send-test`, `marketing-cron-tick`, `send-marketplace-digest`, `send-digest-catchup`, `send-admin-daily-digest`, `send-booking-confirmation`, `backfill-listing-published-emails`, `host-reengagement-emails`, `test-send-subscription-emails`, `send-test-draft-email`, `faq-chatbot`, `raise-dispute`, plus the ~48 `send-*` proxies and 23 direct-Resend senders enumerated in section A.

**Templates**: all 65 in `_shared/transactional-email-templates/` (+ `registry.ts`, `_blocks.tsx`, `_styles.ts`, `_stylesLight.ts`); all 6 in `_shared/email-templates/` (+ `_brand.tsx`, `_styles.ts`); all 5 in `_shared/marketing-templates/` (+ `constants.ts`); ~15 inline-HTML senders.

**Assets**: `public/images/vendibook-email-logo.png` (1000×293, 171 KB), `public/images/vendibook-logo.png` (1536×1024, 2.1 MB), and the three `email-assets` bucket logos — all four fetched and visually compared.

**Frontend**: `AdminEmailDashboard.tsx`, `AdminDigest.tsx`, the three `AdminCampaign*.tsx` pages, `NotificationPreferences.tsx`, `useNotificationPreferences.ts`, `EmailUnsubscribe.tsx`, `Unsubscribe.tsx`, `Feedback.tsx`, `TellVendibookModal.tsx`.

---

This document is the audit deliverable, not a build plan. Approve to move on to the section I step 1 cleanup, or tell me which section to expand.
