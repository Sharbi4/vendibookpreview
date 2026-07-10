# Vendibook Full Functional Audit — Scoped Plan

The request as written is a multi-week engineering + QA program (real multi-account E2E, synthetic prod monitoring, reconciliation jobs, alerting, cross-device mobile testing). I can't credibly execute all 15 sections in one pass inside this sandbox — I have no test buyer/seller/host credentials, no mobile devices, no way to actually complete a Stripe Checkout with a real card, and no way to schedule production monitors that alert your team.

What I **can** do reliably, and what I propose we do in phases:

## Phase 1 — Static contract + data audit (this session, no user action required)
Deliverable: a written report + a repair migration for anything deterministic.
1. **Frontend ↔ DB contract scan** for the highest-risk tables: `listings`, `sale_transactions`, `booking_requests`, `saved_permit_roadmaps`, `support_tickets`, `email_send_log`. Flag: fields written by UI that don't exist, required DB columns not required in UI, status values UI emits that DB CHECK rejects, empty-string → numeric/date coercion sites.
2. **Status inventory** — enumerate every status literal in `src/` and compare with DB CHECK constraints / enums. Produce one canonical list per entity.
3. **Data reconciliation queries** (read-only) for the exact "broken record" categories in §14: drafts w/ no owner, published listings w/ no images, featured rows w/ expired dates, sales missing buyer or seller, purchases in `paid` w/ no seller notification row, permit roadmaps w/ no items, DLQ email rows in last 30 days.
4. **RLS spot-audit** on the six tables above — confirm no policy references its own table (recursion) and that each has a matching GRANT.
5. **Email event matrix** — for each trigger site in `supabase/functions/`, list (event → template → recipient → idempotency key) and cross-check against `_shared/transactional-email-templates/registry.ts`. Flag orphan templates and unregistered `templateName` invocations.

## Phase 2 — Deterministic repairs (only after you approve Phase 1 report)
- One migration for any status/CHECK/constraint mismatches found.
- One data-repair migration for deterministic broken rows (e.g. clear expired `featured_enabled`, null out `guest_draft_token` on published rows already handled by trigger — verify).
- Code fixes only where Phase 1 proves a mismatch (no speculative refactors).

## Phase 3 — Automated E2E harness (needs your input)
Requires: a dedicated buyer test account + seller test account + Stripe test-mode card. I'll add Deno E2E tests under `supabase/functions/*/e2e_test.ts` covering:
- listing draft → publish → fetch public page
- Pay-in-Person sale → seller confirm → buyer confirm → completed
- Permit Path save → resume
- Support ticket submit → admin list
Card-sale Stripe Checkout can be smoke-tested only up to redirect; full webhook path needs a Stripe CLI forward that this sandbox can't run — you'd run it locally or in CI.

## Phase 4 — Production monitoring (out of scope for a single build session)
Synthetic monitors, alert routing, correlation-ID logging, and CS search tooling are a separate project. I'll scope it after Phases 1–3 land.

## What's explicitly *not* in this plan
- Real device mobile testing (Android/iPhone camera uploads) — needs a human.
- Actual Stripe Connect onboarding + card charge from a live buyer — needs a human with a test card in the browser.
- Alerting integration (PagerDuty/Slack) — needs your channel + policy input.
- "Repair all workflows" as a blanket claim — I'll only fix what Phase 1 proves broken.

## Technical notes
- All queries in Phase 1 run through `supabase--read_query` (read-only). Nothing mutates data without a separate approved migration.
- Report will be delivered inline in chat + saved to `.lovable/audit-2026-07-10.md`.
- Estimated Phase 1 runtime: ~15–25 tool calls, one response.

## Decision needed from you
Pick one:
- **A. Run Phase 1 now** and I'll deliver the audit report + list of proposed repairs. You approve repairs before I touch anything.
- **B. Run Phase 1 + auto-apply deterministic repairs** (still approval-gated per migration, just batched).
- **C. Narrow scope** — name the 2–3 workflows you most suspect are broken and I'll deep-dive those instead of the full inventory.

C is the fastest path to actual fixes if you already know where users are hitting walls.
