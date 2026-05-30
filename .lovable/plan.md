# The Vendibook Report — Marketing Email System

A luxury-editorial marketplace newsletter sent twice weekly (Tue/Sat) to all registered users via Resend, with an admin dashboard, mandatory test-send gate, AI-assisted compose, and feedback tracking.

> **Important caveat:** This is explicitly a **marketing email** (bulk send to a list, sender-initiated, promotional content mixed with editorial). It cannot use Lovable's built-in transactional email infrastructure (which blocks marketing). We'll use **Resend** directly via the Resend connector as you specified. You'll need a verified Resend sending domain (`report@vendibook.com` or similar) configured in your Resend account — separate from the Lovable Email subdomain to avoid DNS conflict.

---

## 1. Prerequisites & Setup

- Connect **Resend** via the Resend connector (gateway-based, no raw API key needed in code)
- Confirm sending domain `vendibook.com` (or chosen subdomain like `mail.vendibook.com`) is verified in Resend
- Confirm `LOVABLE_API_KEY` is present (already is — used for Claude/Lovable AI headline + insight generation)
- Provide hosted **logo URLs** (white-on-dark for header, dark-on-white for footer) — stored as constants in the edge function; placeholders used until you supply

---

## 2. Database Schema (new tables)

```text
email_sends
  id, issue_number (auto-inc), subject_line, hero_headline,
  status (draft|test_sent|test_approved|sending|sent|failed),
  recipient_count, sent_at, resend_broadcast_id,
  composed_payload (jsonb — listings, tools, insight, referral_rotation),
  created_by (admin user_id), created_at

email_feedback
  id, send_id → email_sends, user_id, recipient_email,
  rating enum('helpful','okay','not_for_me'), clicked_at

email_events
  id, send_id, user_id, recipient_email,
  event_type enum('delivered','opened','clicked','bounced','complained','unsubscribed'),
  metadata jsonb, occurred_at

email_unsubscribes
  user_id (or email), unsubscribed_at, reason

email_test_sends
  id, send_id, recipient_email, sent_at, approved_at, approved_by
```

All with RLS — admin-only read/write (uses existing `has_role(_, 'admin')` pattern). `service_role` for edge functions.

`email_sends.issue_number` uses a Postgres sequence.

---

## 3. Edge Functions

1. **`marketing-compose-assist`** — Claude/Lovable AI calls
   - Mode `headlines`: returns 3 hero headline options
   - Mode `insight`: returns 120–150 word editorial piece for selected theme
   - Server-side prompts only (per project rules)

2. **`marketing-fetch-content`** — Pulls 6 latest published for-sale listings + 1 featured rental (excludes demo listings per existing rule, respects `published_at`, masks precise location per existing rules)

3. **`marketing-send-test`** — Renders email HTML, sends single test to `atlasmom421@gmail.com` via Resend, logs to `email_test_sends`, sets `email_sends.status='test_sent'`

   > **Memory rule conflict:** Project memory explicitly forbids hardcoding `atlasmom421@gmail.com` anywhere. We will instead store the test recipient as a configurable secret (`MARKETING_TEST_EMAIL`) defaulting to your value, so the address isn't baked into source. Confirm OK.

4. **`marketing-send-broadcast`** — Only runs if `status='test_approved'`. Creates a Resend **Broadcast** (or audience send) tagged `type:marketing, edition:{n}, send_day:{tue|sat}`, fetches all opted-in users (excludes `email_unsubscribes`), sends, updates `status`, stores `resend_broadcast_id`

5. **`marketing-feedback-redirect`** — Public endpoint. Email feedback pills link to `/functions/v1/marketing-feedback-redirect?s={send_id}&u={user_id}&r={rating}` → logs to `email_feedback` → 302 redirects to a small "Thanks for your feedback" page on vendibook.com

6. **`marketing-resend-webhook`** — Receives Resend webhook events (delivered/opened/clicked/bounced/complained), writes to `email_events`, auto-adds bounces/complaints to `email_unsubscribes`

7. **`marketing-unsubscribe`** — One-click unsubscribe handler (Resend `List-Unsubscribe` header target)

---

## 4. Email Template (React Email .tsx, rendered server-side)

Single template file: `supabase/functions/_shared/marketing-templates/vendibook-report.tsx`

Sections in exact order you specified:
1. Dark header (#0C0C0C) — logo, orange 40px rule, "THE VENDIBOOK REPORT" small-caps, date + Issue No.
2. Hero headline (selected) + fixed subhead
3. 2-col grid of 6 for-sale cards (16:9 image, title, location pin, orange price, detail line, inline "View Listing →"). Full-width orange pill CTA below.
4. Featured rental — large card on #F8F6F4 section, amenity pill tags, prominent CTA button
5. Referral highlight — icon left, copy right, rotating headline (Purchase/Supply/Rental — rotation index stored on `email_sends`), inline text CTA
6. Tools highlight — 3 columns chosen in dashboard, dark #0C0C0C background, white/orange
7. Insight section — Playfair Display italic pull quote + body + "— The Vendibook Team"
8. Talk to Someone — two CTAs (Book a Call / Send a Message) + "Average response time: under 2 hours"
9. Feedback rating — 3 pill buttons (👍/😐/👎) linking to `marketing-feedback-redirect` with unique per-recipient URLs
10. Footer — dark logo, blurb, Unsubscribe · Privacy · Referral Terms · Help · CAN-SPAM address · social icons

**Typography:** Playfair Display (headings) + DM Sans (body) via Google Fonts `<link>` in email head (with system fallbacks for clients that strip web fonts).
**Width:** 640px max, mobile-first stacks to 1-col.
**All links** include `?source=email_weekly_report` (matches existing attribution convention).

---

## 5. Admin Dashboard — `/admin/email/dashboard`

Protected by `has_role(auth.uid(), 'admin')`. Single page with 4 panels:

**Compose Panel**
- "Generate Headlines" → shows 3 options as selectable radio cards
- Auto-loaded preview of 6 for-sale + 1 rental (with "Refresh" button)
- Tool selector: checkbox list of 6 tools, must pick exactly 3
- Insight theme dropdown + "Generate Insight" → editable textarea with regenerate button
- Referral rotation indicator (read-only): "This edition: Purchase Rewards"
- Issue number (auto, read-only)
- Subject line input (with character counter + suggested default)

**Preview Panel**
- Live iframe rendering of compiled HTML
- Desktop (640px) / Mobile (375px) toggle
- "Send Test to atlasmom421@gmail.com" button (disabled until compose is complete)

**Test Gate Panel** (appears after test sent)
- "Test sent at [time]. Check inbox."
- "✅ Yes — Unlock Send" / "✏️ No — Edit First" buttons
- Audit log of test sends for this edition

**Send Panel** (disabled/grayed until test approved)
- Recipient count: "Sending to X users (Y unsubscribed, excluded)"
- "Send Now" / "Schedule" (date+time picker)
- Final confirm modal: "This will send to X users. Cannot be undone."

**Send History** (table at bottom)
- Issue #, date, subject, recipients, delivered %, open %, click %, feedback breakdown (👍/😐/👎 %)
- Click row → drill-down

---

## 6. Technical Notes

- **No client-side prompts** — all Claude calls go through edge functions
- **No raw SQL in functions** — typed Supabase client only
- **Idempotency**: broadcast send keyed by `email_sends.id` to prevent double-sends on retry
- **Rate limit handling**: Resend gateway 429 → exponential backoff in `marketing-send-broadcast`
- **Suppression**: query `email_unsubscribes` + `email_events` (bounced/complained) before building recipient list
- **CAN-SPAM compliance**: physical mailing address in footer (you'll provide), one-click unsubscribe, clear sender ID
- **Tracked links**: Resend's built-in click tracking + custom `source=email_weekly_report` params for GA

---

## 7. Out of Scope (flag for later)

- Automated cron scheduling of Tue/Sat sends (manual trigger via dashboard for now — can add `pg_cron` later if you want full auto)
- A/B subject line testing
- Per-user content personalization
- Resend Audiences sync (we'll send via Broadcasts on demand, not maintain an Audience)

---

## Questions before I build

1. **Memory conflict on test email**: OK to store `atlasmom421@gmail.com` as a secret `MARKETING_TEST_EMAIL` (configurable, not hardcoded) to satisfy the no-personal-emails-in-source rule? Or override the rule for this case?
2. **Sending domain**: Use `report@vendibook.com` (root) or a subdomain like `mail.vendibook.com`? Root may conflict if Lovable Emails is using the same subdomain — need to confirm in Resend.
3. **Logo URLs**: Provide now, or use placeholders and swap later?
4. **Mailing address** for CAN-SPAM footer?
5. **Reply-to address**: `support@vendibook.com`?
