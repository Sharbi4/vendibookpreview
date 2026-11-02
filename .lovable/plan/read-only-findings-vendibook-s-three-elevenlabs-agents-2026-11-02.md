# Read-only findings: Vendibook's three ElevenLabs agents

Nothing was changed. The only ElevenLabs request run during these audits was the earlier read-only conversation list and detail fetch (Oct 30 to Nov 2). It used the backend key from inside the sandbox and never printed it. "Alice" is **Allison** in the code.

## Agents

| Agent | ElevenLabs ID | Where it's wired in |
|---|---|---|
| Allison (customer service) | `agent_8301m5nh7dq6e1x9wgqk2yx7k4pd` (the default; the `ALLISON_AGENT_ID` setting can override it) | `src/components/support/AllisonAgent.tsx`, which gets a session token from `atlas-agent-token` with `agent='allison'`. Configured by `elevenlabs-agent-configure`. |
| Atlas (website chat) | `agent_1501m4rhvkz9fsbs5ce89zvk2k7b` (the default; the `ATLAS_AGENT_ID` setting can override it) | `src/components/atlas/AtlasAgent.tsx` and its in-browser tools in `src/lib/atlas/atlasTools.ts`. Gets its token from `atlas-agent-token`. Follow-ups go through `atlas-follow-up`. |
| Phone line (866) 690-6227 | `agent_4401m5tvvw3yewrt9sp6nbmbbvmd`, confirmed in ElevenLabs data | Twilio passes calls to the ElevenLabs phone number `phnum_9001m5tnf446f4sbmch182jzvfq1`. `_shared/phoneLine.ts` looks up which agent is assigned to that number. The agent's tools call `phone-support-tools`, which is protected by the `x-vendibook-tool-secret` header. |

Not part of the three: Vendi (`agent_0101kdmd2dn7exys7w22pnscqasf`, the voice listing helper) and outbound Atlas (`agent_6701m5wwwxm0f3p8rf0hmmbc54j1`, never active).

## Where conversation data lives
- **Transcripts, summaries, call length and how calls ended exist only in ElevenLabs.** No post-call webhook is set up. A search found no post-call or transcript handler under `supabase/functions`. Logs are missing from our database because nothing ever writes them there, not because anything failed.
- Our database only has what the agents' tools save during a conversation:
  - `support_tickets`: phone-line caller details (`submission_channel='phone_agent'`, with the ElevenLabs conversation ID in the description), Atlas/Allison follow-ups and callback requests.
  - `managed_inquiries` and `managed_inquiry_messages`: owner messages sent through the phone agent, held for review.
  - The table that stores phone text-message verifications, linked by `conversation_id` in `phone-support-tools`.
  - `voice_agent_leads`: the website voice feature only. It is **not** a record of phone calls.
- `agent-contact-report` (runs every 2 hours by schedule) reads ElevenLabs conversation lists for all three agents, but keeps only counts and minutes.

## Oct 30 to Nov 2 (read earlier this session)
- Atlas: 19 conversations. Phone line: 2 (Michelle Stoddard, and a 31-second hang-up). Allison: 0 returned by ElevenLabs for that window.
- ElevenLabs reports for this: `GET /v1/convai/conversations?agent_id=<id>&call_start_after_unix=<ts>`, then `/v1/convai/conversations/{id}` for details.

## Secure read-only retrieval
- The key is `ELEVENLABS_API_KEY`, kept as a backend setting. Only backend functions read it, and the browser only ever receives short-lived session tokens. Existing functions already read from ElevenLabs without exposing the key: `agent-contact-report`, the diagnostics in `elevenlabs-agent-configure`, and `phoneLine.ts`.
- **Limits:**
  - ElevenLabs keeps conversations only for its own retention period.
  - Calls that never reached ElevenLabs (missed or rejected) are only in Twilio's call logs.
  - The `PHONE_AGENT_ID` setting isn't set, so the phone agent is found by looking it up from the phone number.

## Hourly monitoring (proposal, not built)
- Add a new backend function, triggered by the internal scheduler with the existing internal secret check (`isCronCaller`) or by an admin.
- It would read the last ~75 minutes of conversations for the three IDs above and save one row per conversation in a new admin-only table: conversation ID, agent, time, length, how it ended, summary, related ticket and a "needs callback" flag. Rows are keyed by conversation ID, so repeat runs create no duplicates.
- It would contain no email, text, calling or agent-update code. Staff would review in Admin → Support.
- Alternative: an ElevenLabs post-call webhook with signature verification. That changes provider settings and needs separate approval.
