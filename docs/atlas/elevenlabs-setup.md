# Atlas — Vendibook sales agent (ElevenLabs setup)

Atlas is the public, shopping-side **voice** agent (typing is offered for
accessibility): he finds listings, opens them on the buyer's screen, suggests
menu ideas from the equipment, runs simple earnings math on the buyer's own
numbers, quotes delivery, drafts offers or seller messages for the buyer to
send, and walks them into Request to buy. He never
sees account data. A second, signed-in agent for orders/invoices/offers is the
planned phase 2.

- ElevenLabs agent: **Vendibook Site Assistant Atlas** — `agent_1501m4rhvkz9fsbs5ce89zvk2k7b`
- Site code: `src/components/atlas/AtlasAgent.tsx`, `src/lib/atlas/*`
- Source of truth for prompt + tools: `src/lib/atlas/atlasConfig.ts`
  (the three files in this folder are generated from it)

## 1. Agent settings in ElevenLabs

1. **System prompt**: paste `atlas-system-prompt.txt`.
2. **First message**: paste `atlas-first-message.txt`.
3. **Voice**: a warm, natural US voice; speed ~1.0, stability ~0.45.
4. **LLM**: a fast model (latency matters more than depth here).
5. **Tools → Add tool → Client tool**, once per entry in `atlas-client-tools.json`
   (`search_listings`, `show_listing`, `get_delivery_quote`,
   `start_request_to_buy`, `draft_offer`, `draft_seller_message`,
   `send_seller_message`, `estimate_earnings`, `get_faq`, `get_pricing`, `open_page`,
   `look_at_page`, `page_action`, `request_follow_up`, `talk_to_person`). Easiest: Admin → Reports →
   **Sync Atlas to ElevenLabs** does all of this. Copy the name,
   description and parameters exactly; tick **Wait for response**.
6. **Do not attach the `vendibook` MCP server.** Its tools are seller-side
   (publish listing, upgrades) and need a signed-in user.
7. **Security**
   - Allowlist hosts: `vendibook.com`, `www.vendibook.com`, the Lovable preview
     domain, and `localhost` for local testing.
   - While previewing locally the agent can stay public (no auth). Before
     launch, turn on **authentication** and set the Supabase secret
     `ATLAS_AGENT_ID`; the site then gets short-lived tokens from the
     `atlas-agent-token` function (rate-limited per visitor).
8. **First message**: Atlas's and Allison's first messages end with
   `{{page_opening}}`, a line about the page the user is on ("I see you're
   looking at the 2019 Step Van…", "Welcome back…" on a resumed call). The
   site fills it per session (src/lib/atlas/journeyContext.ts); the admin
   Sync button stores the generic opening as its placeholder default, so no
   override permission is needed. During a live session both agents also get
   "Journey:" and "Attention:" contextual updates (page, stage, and what the
   user points at, focuses or stops scrolling at; never field values, and
   only the page type on private pages).
9. **Tools → System tools**: turn on **Skip turn**, so when a buyer says
   "hold on" or "give me a minute" Atlas waits silently instead of asking if
   they're still there.
10. **Data**: keep transcripts on (they're how we tune Atlas). The panel tells
   visitors conversations may be recorded.

## 2. Turning Atlas on

Atlas is enabled by default following the owner's launch instruction on October 22, 2026.
The compact Ask Atlas launcher replaces the Tawk support bubble across the app.
Set `VITE_ATLAS_ENABLED=false` only for an intentional emergency disable.
Old `?atlas=` and browser preview flags no longer control the public launch.

Production voice uses a short-lived WebRTC token; typing uses a signed WebSocket URL,
both from the rate-limited `atlas-agent-token` function. `ELEVENLABS_API_KEY` stays server-side.
`ATLAS_AGENT_ID` optionally overrides the established Atlas agent ID. An explicit
`VITE_ATLAS_AGENT_ID` enables direct public-agent mode only in a local development build.
No conversation starts until a visitor chooses voice or typing.

## 3. Picking the call back up

The last 16 lines of the call, the listings shown and the page are kept in
this browser only. Within 30 minutes of the last activity the button becomes
"Pick up your call with Atlas?" (Pick up / Start over); Atlas is briefed with
the earlier conversation. After 30 minutes it expires and the next call starts
fresh.

## 4. Showing buyers around the page

`look_at_page` lists the sections (headings) and controls on the buyer's
screen with short refs; `page_action` scrolls to, highlights (orange glow),
reads, presses or types into them. It works on any page from the DOM, so no
component needs extra markup (`data-atlas-label`, `data-atlas-section` and
`data-atlas-no-click` are available for fine-tuning). When a dialog is open
Atlas only sees the dialog. After each navigation Atlas gets the new page's
headings automatically.

Atlas can press photo arrows, tabs, "show more", filters and in-site links,
and type searches, cities and ZIP codes. He **cannot** press anything that
sends, pays, submits, signs in, accepts, buys, saves or books, any form
submit button, checkout/payment/outside links, or type into card, bank,
login, email or phone fields — those are marked `buyer_only`, and he
highlights them for the buyer to tap (`src/lib/atlas/atlasPage.ts`, tested in
`src/test/atlas/atlasPage.test.ts`).

## 5. Policy knowledge

Atlas's business and policy knowledge comes from the owner's **Vendibook AI
Support Agent Master Guide v5.0** (`docs/support/vendibook-ai-support-master-guide-v5.*`).
Its customer FAQ bank (Section 17) is generated into
`src/lib/atlas/atlasGuideFaq.ts` by `scripts/gen-atlas-guide-faq.py`, which also
applies owner overrides that win over the guide (2026-10-15: pay in person /
cash sales are retired). Atlas answers policy questions with `get_faq`. When
the guide changes, re-extract the text (`pdftotext -layout`), rerun the script,
then press Sync Atlas in admin.

## 6. Guardrails (enforced in the prompt and the tools)

- Quotes delivery totals only — never per-mile rates, fuel, handling or math
  (owner rule 2026-10-14; the tool output never contains them).
- Never says Vendibook holds/escrows money or is a bank, lender, insurer,
  broker, agent or party to the sale; no inspection promises; no invented
  stats; Square and PayPal only.
- Messages to sellers (owner decision 2026-10-15): Atlas may send one for a
  **signed-in** buyer only after showing the exact draft on screen and the
  buyer saying yes; `send_seller_message` sends only that shown text (within
  15 minutes), through normal messaging, so risk scanning and the phone/ID
  gate apply. Offers, requests to buy, payments and sign-in are always
  tapped by the buyer.
- Speak with a person (owner decision 2026-10-15): `request_follow_up` sets up
  a team follow-up due within 2 business hours (Mon–Fri 8 AM–8 PM ET;
  `supabase/functions/_shared/followUpWindow.ts`). The `atlas-follow-up`
  function opens a high-priority Admin → Support ticket, notifies every admin
  in the app and emails support@vendibook.com through Resend (Lovable email
  as fallback). Rate limited per IP and per contact.
- Listing creation: Atlas fills the listing editor with the seller (text,
  dropdowns, condition and equipment choices), but photo uploads, agreement
  checkboxes, the phone number, sign-in and Publish are always the seller's.
- Earnings are simple math on the buyer's own numbers, always "before rent,
  fuel, labor, permits and taxes — not a prediction or promise". Local
  popularity is shared as general ideas, never local statistics.
- Only public listing data (discovery filter + test-listing exclusion).
- Payment wording lives in `ATLAS_PAYMENT_METHODS` ("credit card or bank
  transfer", owner wording) — confirm it matches what the invoice offers.
