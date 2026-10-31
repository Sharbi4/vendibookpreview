# BuyerMatch customer progress reports

Operational preparation is displayed separately from verified activity counts. The dashboard reads the latest `buyermatch_progress_updates` row for the selected campaign, shows its server-recorded time and next expected report time in the viewer's timezone, and refreshes each minute and on campaign changes. An overdue report remains visible with “Awaiting the next team report”; the timer never creates a new report or changes its timestamp.

An administrator publishes a report using authenticated `publish_buyermatch_progress(_campaign, _key, _steps, _next_update_at, _evidence)`. Use a unique stable key per real report; retry with exactly the same content and expected time. The private evidence reference records where the report came from. A submitted preparation report does not activate a campaign, send messages, change billing, or increment lead/outreach counts.

Only these step keys are accepted: `priority`, `community_access`, `audience`, `financing`, `local_promotion`, `review`. Status values are `planned`, `in_progress`, `complete` (displayed as “Prepared”). Use actual team evidence; membership requests are in progress until confirmed. Never represent pending group joins, draft messages, targeting suggestions or visits as contacted or qualified buyers.

Customer copy is a fixed dictionary: no free text, group names, prospect names, contact details, or private URLs are accepted in steps. Owner-only row policies and explicit column grants expose only ID, campaign, steps, recorded time, and expected next update. Evidence, operator identity and deduplication keys stay private. Existing event/report summaries must also remain reviewed and anonymous; use private evidence fields for source identities.

For the October 30 owner-supplied report, only Dennis's Aurora campaign was identified. Local community access is reported as in progress; no joins, posts, contacts, replies or leads were verified. The other area's work must not be attached to his listing. The next report is expected 30 minutes after publication, not at the already-past time quoted in the source report.

The owner's scheduled Codex tasks remain paused. This feature does not restart them or generate activity automatically. A subsequent real report must be published through the same reviewed workflow.

Day 1 reports may include the three validated fields `report_kind: day_one`, `campaign_through` (calendar date), and `discovery_runs_approx` (nonnegative integer). They show a launch recap and clearly separate placement submissions from live placements. Unknown next-update times are nullable and displayed as “After the next campaign review”; never invent a deadline merely to satisfy a database field. Timestamped update retries compare nullable next-update values with `IS DISTINCT FROM`.

## Reviewed external activity snapshots

`publish_buyermatch_status_report(_campaign,_key,_report,_next_update_at,_evidence)` adds a structured, customer-safe snapshot to the same private audit trail. The function accepts only the fixed report fields validated in migration `20261030230000_buyermatch_status_reports.sql`: nonnegative integer counts, three boolean operational statuses, and elapsed UTC reporting/placement timestamps. Free text, source names and private identities are rejected. Exact retries are idempotent; changed content requires a new report key.

The UI shows the reporting period separately from the time the reviewed report was saved, and the detailed placement breakdown retains its own earlier timestamp. Live, pending approval, participation review and Marketplace review are distinct; none increment verified lead/outreach metrics. Prospect review is never called a qualified buyer. New operational snapshots replace the previous preparation display, while its audit history remains.

The owner-pasted October 30 3:00–3:30 PM Phoenix report describes one newly prepared Aurora draft, three bus drafts awaiting approval, discovery paused and prospect contact held. Its last detailed placement breakdown (2:00–2:30 PM) is six live, five pending admin approval, one participation review, and one Marketplace listing in review. The report's inconsistent “12 published” and “qualified prospect” language is not treated as 12 live posts or an independently qualified buyer. Other seller acquisition drafts and the Hollywood rental campaign are excluded from Dennis's snapshot. No outreach is sent or approved by importing the report.

Verification: `node scripts/test-buyermatch-progress.mjs` covers owner isolation, private columns, admin-only writes, anonymous denial, invalid payloads, deduplication and unchanged campaign status. UI tests are `src/test/buyerMatchProgress.test.tsx` and `src/test/buyerMatchDashboard.test.tsx`.
