# Allison customer success

Allison is a separate ElevenLabs AI agent, not a renamed Atlas or a human. Source configuration: `src/lib/atlas/allisonConfig.ts`. The Contact page launches her voice/text session; Atlas can hand off after consent using `transfer_to_support`. This browser handoff ends Atlas and starts a separate Allison session with a brief issue summary. It is not a seamless provider-side transfer or live human call.

## Activation still required

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
