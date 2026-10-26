# Vendibook Growth Outreach

## Verified provider setup
Agent: `agent_6701m5wwwxm0f3p8rf0hmmbc54j1`, named **Vendibook Growth Outreach**. Created separately on 2026-10-26 using server-side ELEVENLABS_API_KEY; prompt read-back matched. English, Sarah voice, immediate AI disclosure, seven segment branches, end_call only, structured outcome enum. No sending, payment, fake callback or transfer tools.

Provider read-back: authentication enabled, record_voice false, zero_retention_mode true. ElevenLabs requires retention_days=-1 with ZRM and normalizes deletion booleans false; ZRM controls storage, not ordinary retention. This is not an authorization to record. Account training/data-use settings remain unverified.

The only imported Twilio number is outbound-capable but assigned to the existing inbound phone agent. Assignment was not modified. No separate number is available. No public widget, number assignment, tokens or active batch created for Growth Outreach.

## Admin control center
`/admin/outbound-growth`: import CSV, dedupe, sourced consent evidence, explicit reviewer approval, DNC/timezone/jurisdiction review, segment scripts, preview max-ten batches, fresh audit approval, dispositions and draft-only followups. Personal names/phones and evidence text are redacted in the snapshot. Consent tables are admin-read/service-write; the audit table is append-only for the service role. Existing user roles are unchanged.

`growth-outreach` is an authenticated admin-only deployed endpoint. Provider reads are fixed to the new agent, phone integrations and locally recorded batch IDs. No provider POST/PATCH/DELETE is present. Dispatch/send actions return 423. OUTBOUND_CALLING_ENABLED is OFF (enforced independently of any env setting), and the config table rejects true. Founder identity/approval is not inferred from admin status; no founder authorization action is offered until independently verified.

## Before any future activation
1. Legal review: TCPA/TSR and state-specific AI promotional calling rules, documented written channel-specific consent naming Vendibook, current national/internal DNC checks, state/timezone and stricter permissible windows. B2B/public contacts or membership never establish consent.
2. Obtain and verify a separate outbound-capable imported number; do not reassign inbound. Verify owner-provided test number through an existing identity flow; none guessed or seeded.
3. Separately verify founder identity, deploy transactional fresh audit/approval/attempt reservation and opt-out persistence transport, enforce one attempt and pilot ten. Current prepare-only endpoint cannot dial even with approved audit.
4. Verify SMS marketing consent separately, provider/A2P registration and STOP ingestion before implementing sending. Current drafts never send.
5. Zero retention must remain verified, legal notice/consent required before any recording changes. Review provider training policy. Conduct only an explicitly authorized owner test after all controls exist.
6. Publish frontend only upon owner approval. No publication occurred during this setup.

## Facts
Current fee constants read from `_shared/feeConfig.ts`: new equipment-sale seller 8.7%, rental host/renter 12.9% each. Live monetization catalog confirmed Pro $79/month, Pro annual $790, recurring Featured $49/month on 2026-10-26. These are not spoken quotes. Membership prices are not embedded in the agent; current details link to /pricing. Listing creation is free; paid concierge routes are retired, so scripts do not sell concierge products. Existing payments unchanged.

## Sources
- https://www.fcc.gov/document/fcc-confirms-tcpa-applies-ai-technologies-generate-human-voices
- https://www.fcc.gov/general/telemarketing
- https://www.ftc.gov/legal-library/browse/rules/telemarketing-sales-rule
- https://www.ftc.gov/business-guidance/resources/qa-telemarketers-sellers-about-dnc-provisions-tsr-0
- https://elevenlabs.io/docs/eleven-agents/customization/privacy/zrm.md
- https://api.elevenlabs.io/openapi.json (create privacy/auth schema verified)

Legal eligibility is a reviewer decision, not an automated legal conclusion. The 10am–6pm weekday pilot policy is conservative and requires stricter state restrictions to be applied by review.