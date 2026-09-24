# Vendi listing creator review — September 24, 2026

Based on `fix/paypal-webhook-config` at `8dc58cf6`.

## Changes

- Microphone mute uses the installed ElevenLabs SDK's `micMuted` input, not speaker volume. Agent replies appear in the conversation; `save_answer` remains the single extraction path. Leaving during connection stops the session. Starting a new listing resets voice.
- Draft history is appended idempotently to an owner-private `vendi_listing_messages` table, with account/listing deletion cascades. The latest 1,000 messages are loaded on return; older rows remain retained. Browser recovery remains available when offline. Sync failures are visible and retryable.
- Resume failures block creation rather than silently treating the account as empty. Cached drafts re-enable autosave after verification. Deep links and the chooser cannot merge another draft's media, answers, or consent. The exact browser session can be found beyond the six drafts in the chooser.
- Hydration includes address, ZIP, daily pricing, and all seller disclosure columns.
- Autosaves are serialized, guarded against published/deleted listings, and checked for affected rows. Manual save/publish waits for in-flight autosaves. Rental screening requirements use an atomic owner-checked RPC; errors stop publication.
- Publishing requires fresh typed acceptance against a loaded agreement version. It retains the existing canonical publish/verification path and duplicate-click guard. Save-and-exit waits for confirmation; the full editor opens the same saved draft.
- Existing warm surfaces, readable text, animated chat, and primary orange CTA system are preserved, with a compact conversation-sync indicator and clearer recovery copy.
- Token issuance explicitly validates the signed-in caller, permits only Vendi's configured agent, adds a per-user limit, times out upstream requests, and hides upstream error details from the client.

## Validation

- 99 focused Vendi/interview/publishing tests passed; subsequent affected-path rerun passed 29 tests.
- Application TypeScript check passed.
- Production Vite build passed, with existing global CSS, font, and bundle-size warnings.
- Database rollback tests passed for owner-only reads, unauthorized append denial, and idempotent retries. Additive migration was applied to the connected backend.
- No real customer draft was published and no paid product was purchased during validation.

## Deployment and external checks

Publish the frontend changes through Lovable and deploy `elevenlabs-agent-token`. The SQL migration is idempotent if deployment replays it.

A real signed-in microphone session and the hosted ElevenLabs agent's current tool registry/prompt could not be verified with the available credentials. Confirm `save_answer`, `list_missing`, `request_media_upload`, `media_status`, `go_to_review`, and `publish_listing` are registered as client tools; `save_answer` should wait for its client response. Test allow/deny microphone, mute, reconnect, typed answers, reload, cross-device resume, and a disposable draft publish in preview. Never expose the ElevenLabs API key in browser code.

Reference: https://elevenlabs.io/docs/eleven-agents/libraries/react (installed SDK 0.14 contract also checked locally).
