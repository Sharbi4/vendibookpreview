# Outreach — how to send

**Owner rule (2026-10-05): every outbound email goes through Resend** (the transactional email system, `invokeTransactionalEmail` / `send-transactional-email`) **using the established master-design templates** (`VendibookEmailLayout`, with the new logo). No Gmail, no plain text.

| File | Template | Data |
|---|---|---|
| `seller-concierge-2026-10-05.csv` | `generic-notice` | `template_data` column (JSON). Replace `{first_name}` at send time from `profiles` |
| `offer-rescue-2026-10-05.md` | `generic-notice` | JSON blocks at the bottom |

From `hello@updates.vendibook.com`, Reply-To `support@vendibook.com`, signed "Brad · Customer Success". The subject comes from `template_data.subject`.

Recipient emails are joined from `profiles.email` at send time and never stored in the repo. Before sending, exclude `email_unsubscribes` and `suppressed_emails`.
