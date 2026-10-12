# BuyerMatch AI operations

Status: reviewed manual research/import implementation. Automatic Muse API integration and mass messaging are NOT connected. Fulfillment starts disabled. Deploy the branch in Lovable before using the new screens or RPCs.

## Existing membership audit (2026-10-12)
- Production read through the Vendibook Marketplace Lovable project confirmed the active `vendibook_pro` PayPal plan: USD 7,900 cents, monthly, live, active. No price, cadence, provider plan, subscription, purchase, or historic transaction is changed.
- Existing Pro includes one Featured Boost credit per paid billing period, premium tools including PricePilot and PermitPath Plus, priority placement and support. Existing access passes and paid-through cancellation periods remain eligible where their stored access-end date is valid.
- New eligible equipment sales already use the shared 8.7% equipment-sale fee on this branch for Standard and Pro. The remaining computeProSellerFee caller is rental accounting; its rental-only 10.9% policy and cap are preserved. Build Studio stays 6.5%. Existing transaction fee snapshots are untouched.
- Old ambiguous seller/host discount copy was found in dashboard cards, Pro onboarding/renewal/cancellation emails, MCP product recommendations, chatbot/voice copy, learn-more panels and seller education. These references now describe BuyerMatch or the standard equipment-sale fee.
- No documented Muse API was found. Existing Muse instructions are a manual public buyer-intent research workflow in docs/growth/buyer-desk/muse-prompts-2026-10-05.md. This release implements secure JSON import, not an invented API. CSV must be converted to the documented JSON format before import.

## Deployment order
1. Deploy migrations 20261012230000_buyermatch_foundation.sql , 20261012231000_buyermatch_report_email.sql and 20261012232000_buyermatch_catalog_copy.sql through Lovable, after the existing invoice migrations. Do not enable fulfillment yet.
2. Deploy the UI and the updated expire-stale-offers function with its buyerMatchEmail helper. Existing authenticated maintenance drains report emails and pauses ineligible campaigns. Confirm the existing scheduler is still invoking it; failures are reported as retry failures.
3. Open /dashboard/buyermatch as an administrator. Record the approved Muse/manual research procedure in Operational controls. Configure the maximum open campaigns (default three; paused campaigns count). Submissions can be switched off independently.
4. Verify the actual research, consent/permission review, authorized outreach, opt-out handling, import and review process with controlled test data before enabling fulfillment. Enabling the control does not start any outreach.
5. For each submitted campaign, confirm that the approved research process has actually started before activating it. Export the Muse brief from the selected campaign. Never use an export for a paused, sold, reserved, unavailable, or expired-membership listing.
6. Import real evidence, inspect every private record, and approve a contact-free seller summary. The dashboard shows only approved cumulative metrics and summaries. An import or a report never sends prospect messages.
7. Confirm branded email delivery and preference opt-outs using an authorized test recipient. Production delivery has not been exercised by this code change.

## Seller experience
/dashboard/buyermatch is available from the workspace navigation, account membership card, Pro onboarding email and Pro checkout return route. Returning from checkout never grants Pro: the database checks stored subscription/pass entitlement.

Sellers select an existing public published sale listing and optionally add geography and buyer criteria. Listing data, images, make/model, equipment description and specifications are reused. New campaigns remain pending until operator activation. Owners can pause, resubmit, update preferences and retain reports after Pro ends. A missing/expired access-end date blocks NEW outreach rather than granting indefinite access; reconcile incomplete subscription records through the existing billing system.

A query error is an error state with retry. No fabricated metrics or contact lists are displayed. Reports show snapshots over time; overview totals use each campaign's latest approved snapshot, not the sum of historical snapshots. Messages remain in the existing Vendibook inbox.

## JSON import contract
Upload an array (1–500 objects, under 450 KB in the UI, server payload limit 500 KB). Use a unique batch identifier per source report; retrying the same key/content is idempotent, reusing the key for different contents is rejected.

Required fields on every object:
- campaign_id, listing_id: exact identifiers from the exported brief.
- prospect_id: stable, non-empty source identifier; unique within the batch and campaign.
- source_type, source_reference, research_permission: source description, evidence reference, and documented basis permitting research.
- buyer_intent_summary: actual buying-intent evidence, at most 2,000 characters.
- match_confidence: number from 0 to 1, reviewed for relevance.
- discovered_at, updated_at: ISO timestamps, not future dates; update cannot precede discovery.
- outreach_status: discovered, contacted, replied, interested, qualified, introduced, inquiry, or opted_out.

Optional private context: prospect_business_category, city, state, equipment_interests, qualification_outcome, next_follow_up and source-authorized contact details. Raw imports and prospect records are admin-only under RLS.

Activity is counted from independent evidence, never inferred from a later funnel status:
- attempt_at + attempt_evidence → contacted.
- reply_at + reply_evidence → actual response.
- interested_at + interested_evidence → interested buyer.
- qualified_at + qualified_evidence → qualified conversation.
- introduced_at + introduced_evidence → introduction.
- inquiry_at + inquiry_evidence → verified Vendibook inquiry; the reviewer must check the real Vendibook conversation/reference.

Every activity timestamp must fall between discovery and last update. Contacted/replied/interested/qualified/introduced/inquiry statuses require a contact attempt, outreach_channel and permission_reference. An explicit status claim also requires its corresponding evidence timestamp. No source search, registration, or social mention alone qualifies as an actual buyer response. Verify source terms, outreach authorization and opt-outs before any action.

Rows upsert by (campaign_id, prospect_id), preventing repeated imports from inflating the discovered count. Older/conflicting same-time records cannot overwrite newer evidence. Existing opt-outs cannot be reversed by another import. Previous activity evidence is preserved when a later partial record omits it. Reports contain counts and a reviewed, seller-appropriate summary, not raw contact details.

## Notifications and email
Submission, activation, pause/resume, completion and approved reports use existing in-app notifications. Approved reports queue one branded email per campaign per UTC day after a one-hour batching window. The latest report before the first send attempt is selected. Lease tokens protect concurrent workers; failures retry using the same digest idempotency key. Both campaign notification preference and account sale_email preference are honored. Existing managed suppression and test-mode behavior remain intact.

## Security and operating boundaries
Only authenticated RPC actions can mutate campaign data. Browser writes are revoked. RLS isolates seller campaigns/reports and restricts imports, prospect records and audit history to admins. Seller identity is derived from auth.uid(), never supplied by the browser. Submission checks ownership, public sale status, reservations, entitlement and capacity. Administrative activation/import/approval require the admin role. All actions are audited.

Expiry is checked on every action and dashboard refresh and in scheduled maintenance. No new research/import approval is allowed after entitlement expires. Historic reports are retained. Operators must recheck campaign status before external outreach; this application cannot revoke a previously downloaded research brief.

## Validation
GitHub Actions runs isolated PostgreSQL tests for entitlement, paid-through cancellation, ownership/RLS, browser write denial, campaign limits, pending activation, duplicate and invalid imports, evidence timestamps, opt-outs, stale records, reporting privacy, pause/resume, expiration, digest batching and leases. UI tests cover honest pending activation, submission, expired access and failed reads. Existing membership-checkout, equipment/rental fee, payment, offer and UI build checks are included.

These checks do not constitute a live PayPal purchase, live Muse research run, or production email delivery. Those deployment/fulfillment acceptance checks remain manual. Do not advertise an automated live service before they pass.

## Modified inventory
- .github/workflows/square-addon-reconciliation.yml
- scripts/test-buyermatch.mjs
- src/App.tsx
- src/components/account/MembershipSummaryCard.tsx
- src/components/dashboard/MembershipCard.tsx
- src/components/dashboard/upgrades/UpgradesHub.tsx
- src/components/home/PremiumDiscoveryBlock.tsx
- src/components/listing-wizard/MembershipInlinePanel.tsx
- src/components/monetization/BuyerMatchBenefits.tsx
- src/components/monetization/MiniPlansComparison.tsx
- src/components/monetization/PackagesIntro.tsx
- src/components/monetization/PlansComparisonTable.tsx
- src/components/monetization/PlansFAQ.tsx
- src/components/monetization/tierCatalog.ts
- src/components/vendi-listing/VendiVoiceAgent.tsx
- src/components/workspace/WorkspaceShell.tsx
- src/data/faqContent.ts
- src/hooks/useBuyerMatch.ts
- src/lib/fees/proFee.ts
- src/lib/mcp/tools/list-upsell-products.ts
- src/lib/monetization/buyerMatch.ts
- src/lib/monetization/learnMoreCatalog.ts
- src/lib/monetization/returnRoutes.ts
- src/pages/HowItWorksSeller.tsx
- src/pages/Pricing.tsx
- src/pages/workspace/WorkspaceBuyerMatch.tsx
- src/test/buyerMatchDashboard.test.tsx
- src/test/payments/buyerMatchEmail.test.ts
- supabase/functions/_shared/buyerMatchEmail.ts
- supabase/functions/_shared/proFee.ts
- supabase/functions/_shared/proMembershipEmail.ts
- supabase/functions/_shared/subscriptionLifecycleEmail.ts
- supabase/functions/_shared/transactional-email-templates/pro-membership-activated.tsx
- supabase/functions/_shared/transactional-email-templates/pro-membership-cancelled.tsx
- supabase/functions/_shared/transactional-email-templates/pro-membership-renewed.tsx
- supabase/functions/_shared/transactional-email-templates/subscription-cancelled.tsx
- supabase/functions/_shared/transactional-email-templates/weekly-pass-ending.tsx
- supabase/functions/expire-stale-offers/index.ts
- supabase/functions/faq-chatbot/index.ts
- supabase/functions/mcp/index.ts
- supabase/migrations/20261012230000_buyermatch_foundation.sql
- supabase/migrations/20261012231000_buyermatch_report_email.sql
- docs/buyermatch/operations.md

- supabase/migrations/20261012232000_buyermatch_catalog_copy.sql
