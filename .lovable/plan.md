## Goal
Act on the top 5 findings from the 14-day analytics review. Focus on **instrumentation gaps** and **low-risk UX changes** that make next week's report actionable. No backend schema changes required — everything routes through `trackLeadEvent` / `trackEventToDb` into `analytics_events`.

## Scope (in order)

### 1. P1 — Diagnose the 0% form-submission rate
**Problem:** 6 `lead_form_started`, 0 `lead_form_submitted` over 14 days. We can't see which field kills submission.

**Changes:**
- Add 3 new event names to `LeadEventName` in `src/lib/leadTracking.ts`:
  - `lead_form_field_blur` — fires on every field blur with `{ field_name, has_value, char_count }`
  - `lead_form_validation_error` — fires when submit is blocked with `{ field_name, error_message }`
  - `lead_form_abandoned` — fires on modal dismiss after `lead_form_started` with `{ last_field_touched, seconds_in_form, fields_completed }`
- Wire these into `TellVendibookModal` (the primary lead form) — blur handlers on each field, validation hook in submit handler, dismiss handler in `onOpenChange`.
- No UI change yet — we instrument first, then iterate next week with real drop-off data.

### 2. P1 — Search → click conversion telemetry
**Problem:** 56 searches → 7 clicks (12.5%) — can't tell if results are empty or ignored.

**Changes:**
- Add to `LeadEventName`:
  - `search_zero_results` — `{ query, filters, city }`
  - `search_results_returned` — `{ query, result_count, city }`
  - `search_result_impression` — fires once per session per result card actually scrolled into view, `{ listing_id, position, query }`
- Wire into the search results component (`src/components/search/`) using `IntersectionObserver` for impressions.
- Fire `search_zero_results` / `search_results_returned` in the search results hook after query completes.

### 3. P1 — Capitalize on `/u/…` storefront traffic (104 views, 0 follow-on events)
**Problem:** Profile storefronts are the #1 real event source but have no conversion CTAs or downstream tracking.

**Changes:**
- In the storefront page (`src/components/storefront/` + parent page), add a **sticky bottom action bar** on mobile (currently 384px viewport) and an inline CTA row on desktop:
  - "Message host" (opens existing inline messaging flow)
  - "Browse listings" (scrolls to listing grid)
- Instrument: `profile_storefront_view` (replaces generic `profile_view` with host_id metadata), `profile_listing_click`, `profile_message_host_click`, `profile_share_click`.
- All CTAs use the orange-only "Glass CTA" variant per brand memory.

### 4. P2 — Exclude internal/QA traffic from admin funnels
**Problem:** Owner's single 05-30 session = 39% of 14-day events; one bot day added 98 more. KPIs are unreliable.

**Changes:**
- In `src/hooks/useAnalyticsEvents.ts`:
  - In `trackEventToDb`, before insert, set `metadata.is_internal = true` when the current user has the `admin` role (check via `user_roles` cached on `AuthContext`) or when `localStorage.vendibook_qa_mode === '1'`.
  - In `useAdminFunnelMetrics`, `useAdminCityStats`, and `useAdminAlerts`, add `.not('metadata->>is_internal', 'eq', 'true')` to every query — but keep a separate "include internal" toggle in the admin dashboard for QA visibility.
- No schema migration — uses the existing JSONB `metadata` column.

### 5. P2 — Stitch anonymous sessions to users at auth
**Problem:** 98.5% of sessions are anonymous; we can't follow up on intent.

**Changes:**
- In `AuthContext.tsx`, on successful sign-in / sign-up, read the current `analytics_session_id` from sessionStorage and write a `session_user_link` event (`{ session_id, linked_user_id }`) so admin queries can back-fill attribution with a SQL join.
- Update `useAdminFunnelMetrics` to UNION on linked sessions when computing per-user funnels.

## Out of scope (deferred)
- Redesigning the lead-form UX (single-screen / "Save & keep browsing") — wait for field-blur data from change #1 to land first.
- Supply-funnel host CTAs (P3) — minor lift, can ship next sprint.
- Voice/Help cross-prompt (P2) — needs Vapi assistant config change, not codebase-only.

## Technical notes
- All event names are added to the `LeadEventName` union and the `EVENT_CATEGORY` map so they flow through GA4 + the admin dashboard automatically (per `mem://integrations/analytics-and-tracking-central`).
- No new tables, no RLS changes. All writes use existing `analytics_events` insert path.
- Brand: every new CTA uses the orange-only Glass CTA per `mem://style/brand-identity`.
- Mobile inputs in any new form fields stay at 16px per Core memory.
- Will also quietly fix the two `Failed to fetch dynamically imported module` runtime errors (`ListingsSections.tsx` / `TrustInfrastructure.tsx`) since they're blocking the homepage.

## Files to touch
- `src/lib/leadTracking.ts` — add event names + categories
- `src/components/lead/TellVendibookModal.tsx` — blur + validation + abandon instrumentation
- `src/components/search/SearchResults*.tsx` — impression + zero-results events
- `src/components/storefront/*` + page wrapper — sticky CTA bar + click instrumentation
- `src/hooks/useAnalyticsEvents.ts` — `is_internal` flag + admin query filter
- `src/contexts/AuthContext.tsx` — session→user link on auth
- Investigate root cause of the two dynamic-import failures and fix in place

## Success criteria (re-measure in 7 days)
- `lead_form_field_blur` shows ≥1 event per `lead_form_started` so we can rank drop-off fields.
- `search_zero_results` vs `search_results_returned` ratio is visible; impression count > click count by a healthy margin.
- ≥1 `profile_storefront_view` produces a downstream `profile_listing_click` or `profile_message_host_click`.
- Admin funnel queries return numbers that exclude owner's session by default.
- At least 1 anonymous session per day gets stitched to a user via `session_user_link`.
