# Resend → Lovable Email Migration Plan

**Status so far (verified):**
- `notify.vendibook.com` ✅ verified
- Email infrastructure, queue dispatcher, auth-email-hook, send-transactional-email, unsubscribe page (`/email-unsubscribe`) ✅ deployed
- 32 transactional templates ✅ scaffolded in registry
- 22 functions already on Lovable Email
- 26 functions still on Resend

## Stays on Resend (per hybrid decision)

These 5 are bulk/marketing — Lovable Email refuses these to protect domain reputation:
- `send-newsletter-email`
- `send-weekly-newsletter`
- `send-launch-email`
- `send-campaign-email`
- `send-marketplace-digest`

## Migrate to send-transactional-email (21 functions)

Each Resend `fetch` call is replaced with `supabase.functions.invoke('send-transactional-email', { body: { templateName, recipientEmail, idempotencyKey, templateData } })`. All surrounding logic (DB writes, auth checks, validation) is preserved.

| # | Function | → Template | Notes |
|---|---|---|---|
| 1 | `send-welcome-email` | `welcome` | role + name passed as templateData |
| 2 | `send-booking-notification` | `booking-request-host` | host-side notification of new request |
| 3 | `send-contact-email` | `support-reply` | already partially refactored; finish swap |
| 4 | `send-admin-notification` | `admin-daily-digest` | admin alert payload |
| 5 | `send-document-notification` | `document-status` | document upload/verification status |
| 6 | `send-document-reminder` | `document-status` | reminder variant of doc status |
| 7 | `send-deposit-notification` | `payment-receipt` | deposit confirmation |
| 8 | `send-pending-request-reminder` | `booking-request-host` | host reminder |
| 9 | `send-availability-alerts` | `new-message` | listing availability ping |
| 10 | `send-abandoned-listing-email` | `listing-draft-nudge` | abandoned draft nudge |
| 11 | `send-draft-reminder` | `listing-draft-nudge` | same template, different trigger |
| 12 | `send-stripe-onboarding-reminder` | `stripe-onboarding-nudge` | direct match |
| 13 | `send-admin-daily-digest` | `admin-daily-digest` | direct match |
| 14 | `raise-dispute` | `support-reply` | dispute confirmation to filer |
| 15 | `resolve-dispute` | `support-reply` | resolution notice |
| 16 | `schedule-callback` | `support-reply` | callback confirmation |
| 17 | `send-qr-signage-address-request` | `support-reply` | signage shipping confirmation |
| 18 | `send-password-reset-email` | — | **delete** (auth-email-hook handles `recovery`; this is dead code) |
| 19 | `send-test-draft-email` | `listing-draft-nudge` | dev util, point at any template |
| 20 | `create-notification` | varies | only swap the email portion, keep notification DB write |
| 21 | `vapi-listings-lookup` | `new-message` | lead alert email portion only |

## Cleanup after migration

- Remove `RESEND_API_KEY` references from all 21 migrated functions
- Leave `RESEND_API_KEY` secret in place (still used by 5 marketing functions)
- Update memory: `mem://integrations/resend-email-service-v1` → mark Lovable Email as primary, Resend retained ONLY for bulk/marketing

## Risks

- **Template payload mismatch**: Some functions pass richer HTML than the matching template renders. Templates will fall back to default copy where `templateData` is missing — emails will still send, but copy may be generic for edge cases. Worth a visual pass per template later.
- **No more inline custom HTML**: Custom marketing-style HTML inside transactional functions (e.g. `send-welcome-email`'s logo + custom CSS) is replaced by the React Email template. The brand looks consistent across all sends, but loses one-off styling.
- **`send-password-reset-email` deletion**: If anything in the codebase still calls it, those callers must be redirected to Supabase auth's `resetPasswordForEmail` (which routes through auth-email-hook). Will grep for callers.

## Execution order

1. Migrate functions 1–17 (template swap) in parallel batches
2. Delete `send-password-reset-email` + rewire any callers
3. Migrate dev/edge functions 19–21
4. Deploy all changed functions in one batch
5. Update memory file
