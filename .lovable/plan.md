# Plan: Lovable Emails everywhere + Post-publish feedback

## Scope

You have ~24 edge functions still calling Resend directly. Migrating every single one in one shot is risky (each has bespoke HTML, custom params, callers). I'll do it in two phases.

## Phase 1 — Ship now (this turn)

Migrate the **transaction-critical** functions onto the existing `send-transactional-email` queued system. These are the ones your customers see during purchase/booking — they need suppression lists, retry queue, unsubscribe footers, and `email_send_log` tracking.

| Function | Target template (already in registry) |
|---|---|
| `send-booking-confirmation` | `booking-confirmation` |
| `send-payment-receipt` | `payment-receipt` |
| `send-sale-notification` | `sale-completed-seller` |
| `send-offer-notification` | `offer-received-seller` / `offer-counter-buyer` / `offer-resolved` |
| `send-payout-notification` | `payout-sent` |
| `send-refund-notification` | new `refund-processed` template (none exists) |
| `send-message-email` | `new-message` |
| `send-listing-live-email` | `listing-published` |

Strategy: **keep the function names** (callers don't change) but rewrite each body to internally call `send-transactional-email`. Idempotency keys derived from `bookingId` / `transactionId` / `messageId` so retries are safe.

## Phase 2 — Follow-up (call out, don't ship)

Lower-priority + admin/digest/marketing-adjacent functions that still use Resend. I'll list them at the end so you can greenlight a second pass:
- `send-admin-notification`, `send-admin-daily-digest`, `send-daily-digests`, `send-host-weekly-digests`
- `send-draft-reminder`, `send-abandoned-listing-email`, `send-stripe-onboarding-reminder`, `send-pending-request-reminder`
- `send-document-notification`, `send-document-reminder`, `send-deposit-notification`
- `send-launch-email`, `send-campaign-email`, `send-newsletter-email`, `send-weekly-newsletter`, `send-marketplace-digest` (these may be marketing — need your call)
- `send-qr-signage-address-request`, `send-test-draft-email`, `send-password-reset-email`, `send-welcome-email`, `send-contact-email`
- `create-notification`, `raise-dispute`, `resolve-dispute`

## New: Post-publish feedback email

Add a cron-triggered job `send-post-publish-feedback` that:
1. Runs hourly.
2. Finds listings published 24–48h ago where no feedback email was sent.
3. Inserts into `feedback_email_sent` (existing table, idempotent) with `context_type = 'listing_publish'`.
4. Fires `feedback-request` template via `send-transactional-email`, contextLabel = "publishing your listing".
5. Schedule via pg_cron, hourly.

Why 24–48h? Long enough that the host has actually used the dashboard / share kit, short enough that the publish experience is fresh.

## Out of scope (explicitly)

- Phase 2 functions
- Marketing emails (campaign/newsletter) — those should likely move to a marketing-specific provider per Lovable's transactional rules
- Any auth email changes (already on Lovable hook)
- Changes to Stephanie's listing
