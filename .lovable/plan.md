# Plan: Dashboard + Listing Actions + Share Kit Overhaul

Three workstreams, all surfaced by parallel audits. I'll do them in this order so risky bits (schema, route) ship first while you can verify, then layer UX.

---

## 1. Broken pages

| Route | Today | Fix |
|---|---|---|
| `/settings` | Silently renders homepage (no route) | Add a `<Navigate to="/account" replace />` route entry so `/settings` lands on Account. |
| `/profile`, `/create-listing` | Already redirect to `/account` / `/list` — fine, but unconfirmed | Verify the redirect entries exist; leave as-is. |
| S3 font CORS error on every page | Custom font `sofiaprosoftlight` 404/CORS spam | Drop the broken S3 `@font-face` and fall back to the already-loaded system font stack, so the console is clean. |
| tawk.to CORS error | Third-party widget — out of scope | No change. |

Then run a Playwright sweep again to confirm zero blocking console errors on the main authenticated routes.

---

## 2. Host listing actions

Code is in `src/components/dashboard/HostListingCard.tsx`, `OperationsTable.tsx`, and `src/hooks/useHostListings.ts`. RLS is already correct.

**Schema migration**
- Extend `listing_status` enum: add `'archived'`.

**`useHostListings.ts`**
- Add `duplicateListing(id)` — clone row, strip `id/published_at/featured_*`, prefix title with "Copy of ", insert as `draft`, prepend to local state.
- Add `archiveListing(id)` → `updateListingStatus(id, 'archived')`.
- Add `unpauseListing(id)` — sets status back to `'published'` WITHOUT touching `published_at`, so featured/analytics windows aren't reset.
- Wrap optimistic updates in snapshot/rollback: capture prior state, restore in `catch`.

**`HostListingCard.tsx`**
- Wrap the trash button in an `AlertDialog` (match `DraftsSection` pattern) — no more accidental deletes.
- Add Duplicate + Archive items to the action menu.
- Add `host_id` guard to `handleSavePrice`'s update chain.
- Add `archived` style + label to `StatusPill`, with a default fallback so future enum values don't render `className="undefined"`.

**`OperationsTable.tsx`**
- Accept and wire `onDelete`, `onDuplicate`, `onArchive`, `onUnpause` props.
- Add Delete (destructive, with confirm), Duplicate, Archive, Unpause menu items.
- Filter drafts out before the table renders; let `DraftsSection` handle them above (matches the card-view pattern).

**`HostDashboard.tsx`**
- Pass the new handlers to `OperationsTable`; filter `listings` to non-drafts before passing.

---

## 3. Share Kit overhaul (post-publish, dashboard, and modal)

Canonical component is `src/components/listing-wizard/ShareKit.tsx`. Two other implementations (`PublishSuccessModal`, `ShareKitModal`) diverged. `BuiltInShareKit.tsx` is dead/stub code.

**A. Tracking & attribution (the "why aren't hosts sharing converting" gap)**
- Wire `useShareKit.logShare()` into `ShareKit.tsx` so every channel click, copy-link, copy-caption, native share, QR download, and image download writes a row to `share_events` with `channel`, `utm_source`, `utm_medium`.
- Replace the single GA4 `share_link_copied` event currently fired for every button with per-channel events (`label: channel`).
- Add UTMs to copy-link, copy-caption, and the QR code (currently raw URL).
- Default the UTM toggle in `ShareKitModal.tsx` to ON (or remove it — always append).

**B. AI captions actually used**
- `generate-share-content` edge function + `useShareKit.generate()` already exist but are never called by the publish screen. Trigger `generate()` on mount in `ListingPublished.tsx` and map per-channel templates into the share buttons / caption variant tabs (fall back to today's hardcoded variants if AI fails).

**C. Visual assets**
- Paint price on the 1080×1080 cover image (currently missing — title + city + badge only).
- Add a 1080×1920 IG Story variant with photo + title + price + city + CTA, plus a Story download button.
- Paint price + city on the "Now Booking" plain graphic.

**D. Channels & polish**
- Add TikTok to the canonical Share Kit (copy caption + open `tiktok.com/upload`, same pattern as Instagram).
- Rename "Twitter" → "X" in `PublishSuccessModal.tsx`.
- Add "Copied ✓" feedback to the copy-link button in `PublishSuccessModal.tsx`.
- Verify `/share/listing/:id` (used by `ShareKitModal`) resolves — add a redirect route to `/listing/:id` if it 404s.

**E. Host-facing analytics readout**
- Add a compact "Shares" row to `ListingInsightsPanel.tsx`: total shares + top channel, querying `share_events` grouped by channel for that listing.

**F. Cleanup**
- Remove the unused/stub `BuiltInShareKit.tsx` (or fix it to accept a real `listingId`) — confirm with `rg` it has no live import first.

---

## Verification

After each workstream:
1. Build (auto) clean.
2. Playwright pass on `/dashboard` (verify delete confirms, pause/unpause sticks, archive appears, duplicate creates a draft) and `/listing-published/<id>` (verify share buttons fire, captions populate, image includes price).
3. `select count(*), channel from share_events where created_at > now() - interval '1 hour' group by channel` to confirm DB logging works end-to-end.

---

## Out of scope

- Tawk.to CORS (third-party config).
- S3 bucket CORS headers (infra, not in repo).
- Server-side OG image rendering for `/listing/:id` (separate effort — current static OG works for now).

## Technical notes

- Enum migration: `ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'archived';` (no GRANT needed — type-level change).
- No new tables, no new RLS policies, no edge-function rewrites — `generate-share-content` already exists.
- All changes are additive to existing components; nothing in the listing wizard / publish path is restructured, so publication flow is unaffected.

