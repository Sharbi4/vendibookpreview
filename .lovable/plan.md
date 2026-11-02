# Read-only audit findings (Nov 2 2026, 18:02 UTC) — no changes proposed

## ElevenLabs provider access: works (read-only GET, server-side key, never shown)
| Agent | ID | Provider name | Conversations since 17:33:00Z |
|---|---|---|---|
| Atlas | agent_1501m4rhvkz9fsbs5ce89zvk2k7b | Vendibook Site Assistant Atlas | 0 |
| Alice/Allison | agent_8301m5nh7dq6e1x9wgqk2yx7k4pd | Vendibook Site Customer Service and Tech Agent | 0 |
| Phone line | agent_4401m5tvvw3yewrt9sp6nbmbbvmd | Vendibook Phone Line (866) 690-6227 | 0 |

- Alice = Allison = 8301… (the site customer-service agent). The phone agent is a different agent, even though it calls itself "Allison" on calls.
- No new conversations, contacts or open actions. Nothing new is missing from the audit table.
- Audit table: 17 rows (15 Atlas, latest start 16:18:07Z; 2 phone, latest 12:48:00Z). Last fetched at 17:33:53Z. The next hourly run is at 18:15Z.
- Vapi: no Vapi key is available here, so I couldn't check Vapi history. Treat it as unknown, not zero.
- Open follow-ups are unchanged: Michelle Stoddard (her call ended normally; the provider's "unsuccessful" flag doesn't mean the call dropped), the Bishopville Atlas chat, and the Spanish-support chat.

## $1,375 freight invoice and the two Resend emails
- **No automation sent them.** I sent both by hand in this chat, each time because you asked:
  1. The invoice email, after your founder-authorized one-off request (Square invoice inv:0-ChD5u1Yf1lNDE-nnRm3L8Xe9EK0O, unpaid; Resend 01a19d5c-4410-…).
  2. The "book now to lock in that price" reminder, after Elle's next message (Resend 01a19d5d-da2b-…).
- The send IDs carry timestamps that are about 104 seconds apart.
- No code, function or scheduled job created them. I found no "1375" in the code, and the freight checkout isn't connected to Square.
- The reminder asked Kevin to confirm both addresses, and the invoice email said pickup can't be finalized until he confirms his delivery address and ZIP. Kevin hasn't replied. The delivery ZIP 34658 is still unverified.
- The reminder's "lock in that price" urgency was what Elle asked for, not a system default.

No changes, sends or calls. Approve only to close this audit. Nothing will be built.
