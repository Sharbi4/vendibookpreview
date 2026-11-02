# ElevenLabs conversation audit — Oct 30 16:58 UTC to Nov 2 16:58 UTC

Read-only. Only authenticated GET calls to ElevenLabs ran (server-side key, never shown). Nothing was edited, deployed, sent or called.

## Access
- Provider history CAN be read directly: the conversation list filtered by agent/time, plus full transcripts and summaries.
- Phone-line agent, as resolved via phoneLineAgent() (number phnum_9001…): `agent_4401m5tvvw3yewrt9sp6nbmbbvmd` ("Vendibook Phone Line (866) 690-6227").
- Alice = Allison = `agent_8301m5nh7dq6e1x9wgqk2yx7k4pd`, which had **0 conversations** in the window. The phone agent greets callers as "Allison", but it is a separate agent (4401…).

## Phone line (2 calls)
| ID | UTC start | Length | Outcome |
|---|---|---|---|
| conv_7301m6e4tsczf1bver3mgd0b7epc | Nov 2 12:48:00 | 479s | Agent ended the call normally (end_call). ElevenLabs flags it "failure" |
| conv_9501m6cmxz7zfdfvffmw1hn8vbrm | Nov 1 22:50:53 | 31s | Caller hung up. Speech was unclear and no request was made |

**Michelle Stoddard (conv_7301…)**: full transcript and summary are available. **The call did not drop**; it ended with "No, that's all" and a goodbye.
- Request: a food trailer rental for Nov 7, all day, in Bishopville, SC. She was shown the Lexington, SC unit ($350/day, $200 deposit).
- Permissions: she confirmed the calling number (ends 6373) as her callback number. She consented to the SMS disclosure and to an email link. She approved a drafted message to the owner asking about Nov 7 availability and delivery to Bishopville.
- Open follow-up: her email was corrected twice (MStarr → MStattered → **MStaddard@yahoo.com**). The first link and message confirmation went to the wrong address. Staff should check that the relayed owner message and her contact record use MStaddard@yahoo.com, and watch for the owner's reply about delivery.

## Atlas (14 site conversations)
Most were short intros or no-reply sessions (2–39s): conv_3701, 5801, 6601, 3201, 8001, 7101, 0301, 2601, 4801, 9701, 9201, 7101m677…
Two need attention:
- **conv_1901m6e4qccze6mb13w02bt470ew** (Nov 2 12:46, 271s, client disconnected): the same Bishopville trailer rental and delivery question, about 2 minutes before Michelle's call. Most likely the same person. No contact details were collected.
- **conv_4701m6c6c8zvf2srz47ec1gxn1vd** (Nov 1 18:36, 59s): the visitor asked for Spanish support. Atlas only speaks English and pointed them to support. No contact details. This is a product gap, not a follow-up.

## Secure path for future/hourly retrieval
A backend-only scheduled function that uses the existing server-side key with GET-only calls (conversation list by agent and time, then conversation detail). It would save summaries, IDs and follow-up flags to an admin-only table, deduplicated by conversation ID. It would contain no send, call or agent-update code. agent-contact-report today only counts calls; it does not save transcripts.

No changes proposed in this plan. Approve only if you want the hourly monitor built.
