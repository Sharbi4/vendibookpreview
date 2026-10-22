# Personalized marketplace updates

## Entry points
- Homepage: a nonblocking corner invitation after 12 seconds and 30% scroll. It avoids other dialogs and active form inputs. Dismissal lasts 30 days.
- `/subscribe`: the same role → ZIP/topics → email/optional phone form.
- Published listing page: a separate listing/account text invitation, using `signup-phone-verification`, `verify_signup_phone_code`, then `sms-record-consent` for that exact verified number.

## Email workflow
1. `marketplace-updates` validates the request and independent channel consent server-side. Guests are supported.
2. Persist `marketplace_update_requests`: exact SMS disclosure/version, source, role, topics, ZIP, time, hashed IP, optional authenticated account association, and hashed 24-hour token.
3. Resend sends the shared `marketingShell` confirmation: role-specific panel, plain text, orange CTA, canonical logo/postal footer, signed unsubscribe. Persistence or sending failures return errors.
4. `/updates/confirm` receives the token in its fragment. An explicit button confirms through the atomic service-only RPC; link scanners visiting cannot confirm.
5. Save `marketplace_update_preferences`. Pending requests never enter this audience. These preferences are deliberately separate from legacy all-subscriber broadcasts.
6. Changes require a new email confirmation. Previous unsubscribe/suppression is never silently removed.

## Role and content routing
Use the service-only `marketplace_updates_audience(role, topic, zips)` RPC when preparing content. It rechecks email suppression and reports SMS suppression. Pass explicit covered ZIPs for local campaigns; a ZIP is not an exact location or distance radius.

| Role | Content | Next destination |
| --- | --- | --- |
| Renter | Rental listings, operating requirements, booking education | `/search?mode=rent` |
| Buyer | For-sale trucks/trailers, buying preparation, industry news | `/search?mode=sale` |
| Host | Hosting, availability, presentation, rental operations | `/dashboard` |
| Seller | Selling guidance, listing presentation, market updates | `/dashboard` |

Honor selected topics: listings, regulations, news. Regulatory material is general information, not individualized legal advice. These roles are communications preferences, never authorization roles or paid entitlements.

## SMS workflow and launch boundary
Published-page alerts reuse the current transactional program. Marketing texts are a separate program, visibly labeled **coming soon**.

- After email confirmation, the user explicitly requests an OTP. Reuse the existing Lovable Twilio connection for verification-only texts.
- Apply phone and IP limits, cryptographic six-digit codes, ten-minute expiry, five attempts, single use. Never log raw codes/tokens.
- Verification saves `sms_status=verified`: eligibility, not recurring delivery. No marketing dispatcher or scheduled campaign is enabled by this change.
- Before enabling marketing delivery, confirm the sender's registered marketing use case with Twilio. Existing code and `/legal/sms` explicitly define the current program as transactional. Do not broaden that allowlist.
- Proposed workflow: one selected-topics digest per week when relevant content exists; at most four marketing texts per month. Future dispatch must use role/topic/ZIP selection, fresh suppression checks, idempotency, local-time quiet hours, delivery logs, and frequency caps.
- STOP writes the existing `sms_suppressions`; a DB trigger changes this program to `opted_out`. START of the account program does not reactivate marketing. Existing email unsubscribe also suppresses this audience.
- Tables and RPCs are service-only; there is no public subscriber lookup. Mobile opt-in data is not shared for third-party marketing.

## Deployment and verification
- Run newsletter/publish Vitest suites and `node scripts/test-update-preferences.mjs` with the existing PGlite development dependency. `PGLITE_TEST_MODULE` optionally points to an isolated installed module.
- Apply `20261022120000_marketplace_update_preferences.sql` through Vendibook's Lovable project only.
- Deploy `marketplace-updates` and `sms-record-consent` with the existing Resend and Lovable/Twilio secrets. Publish the frontend entry points and new routes.
- Preview artifacts explicitly disable backend submission. Do not use customer contact details for automated smoke tests.

## Compact mobile signup (October 22, 2026)
- Uses the canonical Vendibook wordmark, white/charcoal panels, 16px inputs and at least 44px navigation/close controls. The dialog scrolls within the available screen height and respects the bottom safe area.
- Role, interests, email and optional SMS are separate short screens. Email-only submission explicitly discards any phone number/marketing consent entered in the optional screen.
- SMS disclosure is always visible on the text screen, before a number is entered, with an unchecked consent box and links to the program terms and Privacy Policy. Terms are also discoverable through the Legal Center and account SMS terms.
- Development-only `/?previewUpdates=1` opens the real homepage component immediately with signup delivery disabled. Production builds ignore this preview switch.
- Nine focused signup tests pass, including email-only opt-out, phone-change consent reset, server failure handling and visible terms. Browser checked at 320px and 390px widths, including the complete email-only preview flow.
- Consent safeguards follow the [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy) and [Twilio opt-in guidance](https://www.twilio.com/docs/api/errors/30830). A UI change does not certify legal compliance or activate marketing delivery; the launch requirements above remain applicable.
