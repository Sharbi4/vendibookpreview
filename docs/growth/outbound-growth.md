# Atlas — Vendibook Outbound (Growth Outreach)

## Verified provider setup (updated 2026-10-26)
Agent ID `agent_6701m5wwwxm0f3p8rf0hmmbc54j1` (unchanged; created 2026-10-26 as "Vendibook Growth Outreach"). Provider display name now **Atlas — Vendibook Outbound**; spoken name Atlas. It is NOT the inbound site Atlas (`agent_1501m4rhvkz9fsbs5ce89zvk2k7b`); never resolve by name.

- Source of truth: `supabase/functions/_shared/outboundAtlas.ts` (prompt, first message, seven segment playbooks, reply policy, follow-up drafts, call-scope tokens, field filters). Stored copies: `outbound-atlas-system-prompt.txt`, `outbound-atlas-first-message.txt`.
- Sync: `bun scripts/sync-outbound-atlas.ts` (dry run) / `--apply`. Asserts the persisted ID on readback, refuses other agents, never touches phone numbers or privacy settings.
- First message: "Hi, this is Atlas, Vendibook’s AI voice representative. I’m calling about {{call_purpose}}. Is now an okay time for a quick question?" `call_purpose` is derived server-side from segment (`callPurpose`), never from an unverified prior inquiry.
- Knowledge base (reused by reference, not copied): "Vendibook operator and permit guide (Oct 2026)" and the vendibook.com site doc, RAG on. The support master guide PDF is deliberately not attached: it predates owner overrides (e.g. cash sales retired); fees come live from `get_platform_facts`.
- Tools (all read-only webhooks to `outbound-atlas-tools`, header `x-vendibook-outbound-secret` from workspace secret `OUTBOUND_ATLAS_TOOL_SECRET`, an HMAC of ELEVENLABS_API_KEY with an outbound-only label — the inbound phone secret is rejected): `get_platform_facts`, `search_listings` (published/visible via the site search), `get_listing` (published, not unlisted/deleted/flagged/demo; allowlisted fields; date availability never asserted), `get_prospect_context` (requires a server-issued HMAC call scope bound to this agent + one lead, ≤15 min expiry, suppressed leads return nothing; dynamic variables never authorize). No scope issuer is exposed while dispatch is locked, so private context fails closed. Built-in: `end_call` only. No write, messaging, payment, transfer or scheduling tools.
- Privacy readback: record_voice false, zero_retention_mode true, authentication enabled — unchanged by the update.

## Compliance notes (not a legal conclusion)
FCC (Feb 2024) treats AI-generated voices as "artificial" under the TCPA: prior express written consent is needed for telemarketing, and 47 CFR 64.1200(b) requires identifying the caller at the start, giving a phone number, and an opt-out. The prompt identifies Atlas/Vendibook up front, honors opt-out immediately, and states (866) 690-6227 before ending. The script alone does not satisfy every jurisdiction; consent, DNC, calling windows and state AI-call rules remain enforced server-side and by legal review.

## Admin control center
`/admin/outbound-growth`: CSV import, dedupe, sourced consent evidence, reviewer approval, DNC/timezone/jurisdiction review, segment playbook previews (opener, discovery, value, objections, next step), max-ten batch previews, fresh audit approval, dispositions and draft-only follow-ups. `growth-outreach` is admin-only; dispatch/send_sms return 423; calling_enabled is false and the config table rejects true.

## Before any future activation
1. Legal review: TCPA/TSR, state AI/telemarketing rules, written consent naming Vendibook, DNC, local windows.
2. Separate outbound-capable number (the only imported number stays on the inbound phone agent).
3. Founder identity/approval, transactional dispatch with call-scope issuance and one-attempt reservation, opt-out persistence.
4. SMS: separate consent, A2P registration, STOP ingestion. Drafts never send.
5. Owner-authorized test call only after all controls exist. No publication without owner approval.

## Sources
- https://www.fcc.gov/document/fcc-confirms-tcpa-applies-ai-technologies-generate-human-voices
- https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200
- https://www.ftc.gov/legal-library/browse/rules/telemarketing-sales-rule
- https://elevenlabs.io/docs/eleven-agents/customization/privacy/zrm.md
