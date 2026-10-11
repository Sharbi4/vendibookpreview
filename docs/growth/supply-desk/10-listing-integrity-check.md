# Listing integrity check — 130 live listings (2026-10-05)

_Supply Desk · read-only · quality-first checks set by the owner via the Growth lead_

| Check | Result |
|---|---|
| Stock photos (Unsplash, Pexels and similar) | **0** (the 14 seed listings were archived earlier today) |
| Photos reused across different sellers | **0** |
| Sale price under $1,000 | 1 |
| Contact details in title/description | 2 found. **Now stripped automatically on every save** (`a00_strip_contact_details`); both are cleaned |
| Broken or placeholder titles | **6** |
| Condition missing | 47 (prompted in the concierge emails) |

## Flagged — do not feature/boost/promote until fixed

| Listing | Issue | Suggested fix |
|---|---|---|
| `dcf9453f` "That's good" | Title is AI-editor chat text | Seller retitles it, or support does with the seller's OK |
| `e822783b` "That's perfect" | Same | Same |
| `a4b11455` "Use this instead "Food Trailer for Sale…" | Same | Same |
| `c649440f`, `154df4be`, `a27ad5e3` "My Food Trailer" | Wizard placeholder title | Seller adds a descriptive title |
| `86efe80b` Charcuterie cart, $800 | Price below the $1k sanity floor, listed as food truck | Check whether it's a cart (category) and whether the price is real |

## Featured listings (5 trial + 1 existing)

All 6 pass the stock, reuse and contact checks. **`a3ead971` (Charlotte lemonade trailer) has no condition set.** Its Brad email already asks for that.

The title and contact problems point to two product gaps for the Growth lead: the wizard's AI writer can save chat text as the title, and descriptions weren't screened for phone numbers or emails. **Fixed:** contact details are now stripped automatically on save and logged in `listing_contact_redactions`, so there's no seller outreach for this.
