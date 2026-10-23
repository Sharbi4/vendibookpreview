# Allison customer success

Allison is a separate ElevenLabs AI agent, not a renamed Atlas or a human. Source configuration: `src/lib/atlas/allisonConfig.ts`. The Contact page launches her voice/text session; Atlas can hand off after consent using `transfer_to_support`. This browser handoff ends Atlas and starts a separate Allison session with a brief issue summary. It is not a seamless provider-side transfer or live human call.

## Current owner-selected Allison — October 23 correction

- Current agent: **Vendibook Site Customer Service and Tech Agent**, `agent_8301m5nh7dq6e1x9wgqk2yx7k4pd`. Voice readback: **Katie - E-Learning & Podcast Host**, `YyRJWuwyhKdMZRRnm464`, professional female American English. Model remains `claude-haiku-4-5`.
- Preserved voice, model, other conversation settings and all platform/security settings exactly. The owner's provider authentication setting is currently **disabled**; it was not changed. The app still uses its rate-limited server token endpoint.
- Retained the original custom prompt, with the repository's support rules appended as authoritative overrides of legacy Atlas/sales instructions. First message identifies Allison as AI. Seven newly isolated support client tools replace the copied sales-client attachments without modifying shared Atlas tools. Readback verified all seven IDs, merged prompt and preserved settings.
- No actual Calendly webhook tools, MCP servers or native MCP integrations were attached to this agent. Calendly instructions in a prompt are not an integration; customer-success scope and availability remain unverified. No calendar writes performed.
- `atlas-agent-token` and `elevenlabs-agent-configure` now reject any Allison ID other than the owner-selected ID, so the previous duplicate cannot be used by the app. Both functions were deployed. The existing `ALLISON_AGENT_ID` could not be updated by available create-only secret tools; the owner must update it in **Project Settings → Secrets**. No agents or secrets were created or deleted for this correction; the duplicate remains intact.
- Voice mode does not retain or display conversation turns; explicit text mode retains readable replies. 124 Atlas tests and three Allison component tests passed; preview build passed. Desktop/mobile Contact and actual unavailable fallback checked without overflow or page errors. Atlas development-hook handoff reached the truthful fallback. Live owner-agent connection/voice/handoff awaits the saved-ID update.
- Frontend not published because successful owner-agent token verification is blocked on that update. Managed checkout is an `edit/` branch; a commit on `fix/paypal-webhook-config` was not made, and needs the project's managed Git branch selection. No real tickets, appointments, messages or payments were created.

## Prior attempt — superseded duplicate, never use in app

### October 23 activation check

- Source checkout already contained `cafec115f` and `493454352`; no Git reset, pull, or merge was performed.
- Created **Vendibook Customer Success Allison**, `agent_9901m5nh7kg2en49an6sm8h55208`, using existing premade female **Sarah**, `EXAVITQu4vr4xnSDxMaL`; provider authentication is enabled. Readback matched the exact source prompt, first message and seven support-only client tools. No voice cloned or Atlas replacement.
- Saved `ALLISON_AGENT_ID` server-side after removing the unused retired `TAXJAR_API_KEY` to free secret capacity. Deployed `atlas-agent-token` and `elevenlabs-agent-configure` to the actual Vendibook backend.
- Synced Atlas through the authorized ElevenLabs integration: exact source prompt and all 21 client tools (including handoff), existing tool IDs, voice, authentication and MCP configuration preserved. The owner preview session received 403 from the admin-only maintenance endpoint; no roles or auth gates changed.
- No Calendly tools attached to Allison: existing workspace tool definitions were inspected, but no accessible Calendly connection/customer-success event type or read-only availability was verified. Do not attach generic booking or unrelated-record tools without verifying their scope.
- 122 focused Atlas tests and two Allison user-confirmation/stop tests passed; automatic preview build passed. Desktop and phone Contact pages checked; live Allison typing, visible replies, pause/resume and simulated unavailable fallback verified. Ticket tests were mocked and created no records. Browser handoff invoked the development tool hook and connected to a real Allison text session; natural voice handoff and audible voice audition remain unverified.
- Frontend **not published**: Calendly configuration and full voice/handoff validation remain incomplete. No test tickets, messages, appointments or payments were created.

1. Use the existing owner-selected agent above. Do not create another agent, delete the duplicate or replace the owner's voice/settings.
2. Update the existing `ALLISON_AGENT_ID` to `agent_8301m5nh7dq6e1x9wgqk2yx7k4pd` in Project Settings → Secrets. Missing or mismatched configuration fails closed; there is no Atlas or duplicate fallback.
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
