# Vendi Web Chat Agent — System Prompt

I'll deliver a single ready-to-paste system prompt for the Vapi chat assistant (ID `3896c198-a43b-4c5f-8f25-d3e77dc81dc6`). You'll copy it into the Vapi dashboard → Assistant → Model → System Message. No code changes needed (the `vapi-chat` edge function already forwards messages to whatever prompt is configured on the assistant).

The prompt is grounded in VendiBook's real rules pulled from project memory:

**Sourced facts baked in:**
- Marketplace model: rent or buy vending machines, food trucks, kiosks, ATMs, commercial spaces, equipment
- Commission: **12.9% buyer-paid**, cash transactions are free
- Payouts: rentals 24h after start, sales 25 days after delivery
- Refunds / disputes: admin mediation, Zendesk-backed
- Privacy: exact address masked to 800m radius until booking confirmed / instant book
- Stripe is source of truth — payment_status must be `paid` before host notified
- Ownership rule: users cannot buy/rent/offer on their own listings
- Identity: Stripe Identity verification badges
- Contact: (725) 755-9598, support email handled through Zendesk
- Cash flow: 4-step "Pay in Person" tracking
- Negotiated offers, business-info booking step for commercial spaces, compliance docs, freight $4.50/mile, rental tiers (daily/weekly/monthly), QR signage fulfillment

## Prompt sections (outline)

1. **Identity & Role** — "You are Vendi, VendiBook's support concierge…" tone: warm, concise, on-brand (dark/Linear aesthetic — no emoji spam).
2. **Scope** — answers how-it-works, payments, refunds, listings, bookings, account/auth, troubleshooting. Escalates legal, dispute decisions, or account-specific data to human support.
3. **How VendiBook Works** — buyer flow, host flow, listing flow, instant-book vs request-to-book, location reveal rules.
4. **Payments & Fees** — 12.9% buyer commission, cash = free, Stripe authorization wording standard, payout timelines.
5. **Refunds & Disputes** — cancellation windows, refund routing via admin mediation, how to open a dispute, Zendesk ticket creation path.
6. **Account / Identity / Trust** — Stripe Identity, verified badges, ownership restriction.
7. **Common Troubleshooting** — checkout errors, "listing not visible," geocoding/address issues, Stripe onboarding `details_submitted` lag, document uploads (10MB / allowed types), HEIC support, mobile zoom (16px inputs), map not loading, voice chat vs text chat.
8. **Escalation Rules** — when to hand off: payment failures with charge ID, identity disputes, suspected fraud, data deletion requests → direct to (725) 755-9598 or open Zendesk ticket; never invent policy.
9. **Style Rules** — short paragraphs, markdown bullets, no fabricated pricing, never expose internal IDs, never claim to access user account data the chat doesn't actually have.
10. **Safety** — refuse to give legal/tax/financial advice, no PII echo, no off-topic.

## Deliverable

A single ~600-800 word system prompt formatted for direct paste into Vapi. After you approve I'll also save it to `mem://features/vendi-text-chat` so future edits stay in sync.

## Question before I write

Do you want me to also include a short **FAQ knowledge block** inline (e.g., 10–15 Q&A pairs covering "How do I list?", "When do I get paid?", "How do refunds work?", "Why can't I see the address?") so the agent answers without needing tool calls? Recommend **yes** — it dramatically improves first-response accuracy for a text chat with no live data tools.