# Allison customer success

Allison is a separate ElevenLabs AI agent, not a renamed Atlas or a human. Source configuration: `src/lib/atlas/allisonConfig.ts`. The Contact page launches her voice/text session; Atlas can hand off after consent using `transfer_to_support`. This browser handoff ends Atlas and starts a separate Allison session with a brief issue summary. It is not a seamless provider-side transfer or live human call.

## Current owner-selected agent

The owner cloned Atlas and named the clone Allison: `agent_8301m5nh7dq6e1x9wgqk2yx7k4pd`. This supersedes the automatically created agent below. Preserve the owner-selected voice and settings; detach inherited sales client tools from Allison only. Provider switch verification is pending.

Code changes are made locally and pushed directly to `fix/paypal-webhook-config`. Lovable is used only for edge functions and the ElevenLabs connector.

## Activation still required

### October 23 activation check

- Source checkout already contained `cafec115f` and `493454352`; no Git reset, pull, or merge was performed.
- Created **Vendibook Customer Success Allison**, `agent_9901m5nh7kg2en49an6sm8h55208`, using existing premade female **Sarah**, `EXAVITQu4vr4xnSDxMaL`; provider authentication is enabled. Readback matched the exact source prompt, first message and seven support-only client tools. No voice cloned or Atlas replacement.
- Saved `ALLISON_AGENT_ID` server-side after removing the unused retired `TAXJAR_API_KEY` to free secret capacity. Deployed `atlas-agent-token` and `elevenlabs-agent-configure` to the actual Vendibook backend.
- Synced Atlas through the authorized ElevenLabs integration: exact source prompt and all 21 client tools (including handoff), existing tool IDs, voice, authentication and MCP configuration preserved. The owner preview session received 403 from the admin-only maintenance endpoint; no roles or auth gates changed.
- No Calendly tools attached to Allison: existing workspace tool definitions were inspected, but no accessible Calendly connection/customer-success event type or read-only availability was verified. Do not attach generic booking or unrelated-record tools without verifying their scope.
- 122 focused Atlas tests and two Allison user-confirmation/stop tests passed; automatic preview build passed. Desktop and phone Contact pages checked; live Allison typing, visible replies, pause/resume and simulated unavailable fallback verified. Ticket tests were mocked and created no records. Browser handoff invoked the development tool hook and connected to a real Allison text session; natural voice handoff and audible voice audition remain unverified.
- Frontend **not published**: Calendly configuration and full voice/handoff validation remain incomplete. No test tickets, messages, appointments or payments were created.

1. In the authorized ElevenLabs workspace create a separate agent named Allison. Select and audition a licensed female voice; do not clone anyone's voice or silently reuse Atlas's male voice.
2. Set the returned ID as `ALLISON_AGENT_ID` in Vendibook's actual backend through Lovable. Never point it at Atlas or Vendi. With the ID absent, Allison fails closed; there is no Atlas fallback.
3. Deploy `atlas-agent-token` and `elevenlabs-agent-configure`, then publish the frontend.
4. Admin → Reports: inspect/sync Allison's configuration, then inspect/sync Atlas to add the handoff tool. Both retain admin authentication; keep existing provider integrations intact.
5. Attach the authorized Calendly integration to Allison separately. Select existing customer-success event types. Do not assume Atlas's connection transfers automatically. Test availability read-only; mock booking writes. Do not grant access to unrelated customer records.
6. Test voice/text direct start, consented Atlas handoff, human-request bypass, failure fallback, stop-navigation, ticket confirmation and real returned ticket reference. Do not create test customer emails or appointments in production.

## Accuracy and permissions

- Shared `get_faq` and `get_pricing` reuse existing policy and fee sources. Rental rates/availability remain listing/checkout-specific; rentals remain Square-only.
- No tools to refund, alter billing, change permissions, view arbitrary private orders or submit sales offers are exposed to Allison.
- Support requests use the existing Admin Support flow and branded notifications. No ticket exists until the write succeeds. A ticket is never a Calendly booking.
- Calendly scheduling requires real tools, available slot and explicit confirmation; without them offer the support request.
- Claims of live activation, female voice selection, calendar attachment or successful real conversations require provider readback and browser checks. Code tests alone do not establish these.


## Current knowledge and sales guidance (2026-10-24)

Allison is support-first and also guides sales. The source configuration now exposes 14 tools, including sourced support search, public listing discovery, pricing, page navigation and customer-reviewed offer/message forms. Callback requests use the existing support request flow with user confirmation; requested timing must include a time zone and is not an appointment. Calendly meetings require verified provider access and real availability.

Regenerate provider-ready files with `node scripts/export-allison-config.mjs`. The knowledge export contains 11 workflow playbooks and 87 owner-guide FAQs. Current prices always require the active catalog; historical amounts never override a live quote. Owner correction: Pro has no commission discount. Rental host and renter fees are each 12.9%, new equipment sales 8.7% seller and zero buyer platform fee. Locked prior transaction snapshots remain authoritative.
