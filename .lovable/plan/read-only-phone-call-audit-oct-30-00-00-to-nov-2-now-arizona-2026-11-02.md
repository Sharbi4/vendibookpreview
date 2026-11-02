# Read-only phone call audit (Oct 30 00:00 to Nov 2 now, Arizona time)

Nothing gets changed. No messages, calls, tickets, settings or code edits.

## What the first look shows
- Calls to (866) 690-6227 reach the phone agent through Twilio, which hands them to ElevenLabs. Vendibook does **not** save transcripts or call summaries itself. There's no post-call hook that writes into our database.
- The only call records we keep are what the agent saves through its phone tools during a call. At the start of each call it creates a "Phone line call: <name>" support ticket with the caller's number, email and ElevenLabs conversation ID. Later tools save follow-up requests.
- `voice_agent_leads` belongs to the website voice flow, not the phone line. If it's empty, that doesn't mean there were no calls.
- Michelle Stoddard's ticket exists: created Nov 2, 12:49 UTC (5:49 AM Arizona), status "new", conversation `conv_7301m6e4tsczf1bver3mgd0b7epc`. Only the start-of-call ticket was found. That fits a dropped call or a call with no follow-up request, but the full ElevenLabs record will settle it.
- The ElevenLabs key is available to the backend. The existing 2-hour contact report already reads ElevenLabs conversation lists with it, but it keeps only counts.

## Audit steps (all read-only)
1. Use the server-side key to list ElevenLabs conversations for the phone agent, Atlas and Allison, starting from Oct 30 07:00 UTC. The key never gets printed.
2. For each phone conversation, read the details: start time, length, how it ended (caller hung up, error or agent ended it), the ElevenLabs summary, any name or contact details collected, and the tools used.
3. Read Michelle's conversation in full. Check whether it dropped, what she asked for, and whether any follow-up tool ran.
4. Match each conversation to support tickets, follow-up requests and text messages by conversation ID and phone number. Mark each one as handled, waiting (with no reply yet), or missing a ticket.
5. Report a table with conversation ID, Arizona time, a short summary, name and contact, what they asked for, and current status. I'll quote only short excerpts, no full transcripts. I'll also list what I could and couldn't access, such as calls that never reached ElevenLabs, which only Twilio call logs would show.

## Future hourly audit (proposal only, not built now)
- Add a separate admin-only function that runs from the existing internal scheduler using the internal secret. It reads ElevenLabs conversations from the last ~75 minutes and saves a private audit row per call: ID, times, how the call ended, summary, link to the matching ticket, and a "needs callback" flag.
- It would have no send path at all: no email, SMS, calls or agent actions. Staff would see results in Admin → Support. Missed or dropped calls would show up there for a person to call back.
- It would skip calls it has already saved, so repeat runs make no duplicates, and only admins could see what it saves.

## Technical notes
- Endpoints: `GET /v1/convai/conversations?agent_id&call_start_after_unix`, and `GET /v1/convai/conversations/{id}` for details.
- Agent IDs come from `_shared/phoneLine.ts` and the existing agent settings.
- The key gets read only from the backend environment, never from the browser.
