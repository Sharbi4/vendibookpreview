# Permits in Dashboard — Save, Manage, Upload

Adds a signed-in "Permits" area to the dashboard that mirrors the PermitPath results UI, persists roadmaps + per-item permit data + uploaded documents, and routes signed-out users through sign-in without losing their roadmap.

---

## 1. Data model (one migration)

New tables in `public`, all RLS-scoped to `auth.uid() = user_id`, with `GRANT` to authenticated + service_role.

- **`saved_permit_roadmaps`** — one row per saved roadmap
  - `user_id`, `roadmap_key` (state|city|business_type), `state_code`, `city`, `business_type`
  - `label` (user-editable, defaults to "City, ST · Business Type")
  - `result_payload jsonb` (full DashboardResult snapshot so the saved view never breaks if the source changes)
  - unique `(user_id, roadmap_key)` — saving the same search updates in place

- **`permit_items`** — one row per requirement the user is tracking
  - `roadmap_id` FK → `saved_permit_roadmaps`
  - `user_id`, `item_key` (stable id from `permitRoadmap.ts`)
  - `status` text: `not_started | in_progress | submitted | approved | expired`
  - `permit_number`, `issuing_agency`, `notes` text
  - `issue_date`, `expires_on` date
  - unique `(roadmap_id, item_key)`

- **`permit_documents`** — one row per uploaded file
  - `roadmap_id`, `item_key`, `user_id`
  - `storage_path` (object key inside the private bucket)
  - `file_name`, `mime_type`, `size_bytes`, `uploaded_at`

Reuse the existing `permit_progress` table for the lightweight checked/owned map (already wired into `ResultsDashboard`). The new tables layer real permit data + documents on top.

## 2. Storage

- Private bucket **`permit-documents`** (not public).
- RLS on `storage.objects`: a user can `SELECT/INSERT/UPDATE/DELETE` only when the object path starts with their `auth.uid()/...`.
- Path convention: `{user_id}/{roadmap_id}/{item_key}/{uuid}-{filename}`.
- Files served via short-lived signed URLs for view/download (no public links).

## 3. Auth gating + roadmap preservation

- "Save to my dashboard" on PermitPath results:
  - Signed in → upsert into `saved_permit_roadmaps` (with full `result_payload`), toast "Saved" + "View in dashboard" link.
  - Signed out → stash the current `result` into `sessionStorage` under `permitpath:pendingSave`, then `navigate('/auth?redirect=/tools/permitpath?resumeSave=1')`.
- After auth, `PermitPath` checks `?resumeSave=1`, pulls the stashed payload, runs the save, clears the key, and redirects to `/dashboard?view=host&tab=permits&roadmap={id}`.
- `/dashboard?tab=permits` and the detail view require auth; unauthenticated visits redirect to `/auth?redirect=...` and return after sign-in (same pattern already used elsewhere).

## 4. Dashboard Permits surface (mirrors PermitPath visuals)

New tab in the existing `DashboardLayout` (added to both Host and Shopper variants), routed via `?tab=permits`.

- **List view** (`PermitsList.tsx`):
  - Header: "Permits & Licenses" + "Start a new permit search" → `/tools/permitpath`.
  - "Renewals coming up" strip across the top — collects items from any roadmap with `expires_on` ≤ 60 days (silver/grey card, single subtle warning chip; no loud red).
  - Grid of saved roadmap cards: location, business type, mini compliance ring, `X / N complete`, last updated, "Renewals due" badge if any.

- **Detail view** (`PermitsDetail.tsx`):
  - Reuses `ResultsDashboard` as the base for header, stat tiles, big compliance ring, category grouping, sticky sidebar, premium silver/grey palette — orange reserved for the ring + primary CTA only.
  - Each requirement card is an enhanced `RoadmapItem` (`ManagedPermitItem.tsx`) with the existing expand/collapse, plus a "Manage" panel:
    - Status select (5 states), permit number, issuing agency (prefilled), issue date, expiration date, notes.
    - Saves to `permit_items` with 600ms debounce; status changes animate the card border (still on-palette).
    - Expiration chip: silver by default, warm-grey "Renews in 23d" ≤ 60d, restrained amber "Expired" past due.
  - **Document area** per card (`PermitDocumentUploader.tsx`):
    - Drag-and-drop + file picker (PDF + images, ≤ 10 MB).
    - Uploaded files render as chips with filename + date + view (signed URL, opens in new tab) + download + delete.
    - Empty state: "No document uploaded yet — add your permit copy here."
    - Allows multiple files per item.

## 5. PermitPath results page changes

- Replace the inline `SignInToSavePrompt` save action with a single "Save to my dashboard" button (primary orange) in the header action row.
- After save, swap the button for a quiet "Saved · View in dashboard →" link.
- The existing per-item check/own behavior continues syncing through `permit_progress` so progress survives even without an explicit save.

## 6. Files

**Migration**
- `supabase/migrations/<ts>_permits_dashboard.sql` — three tables, RLS, storage bucket + policies, indexes, updated_at trigger.

**New components**
- `src/pages/PermitsDetail.tsx` (route or nested via dashboard tab)
- `src/components/dashboard/PermitsTab.tsx` (list + entry)
- `src/components/dashboard/permits/PermitRoadmapCard.tsx`
- `src/components/dashboard/permits/RenewalsStrip.tsx`
- `src/components/dashboard/permits/ManagedPermitItem.tsx`
- `src/components/dashboard/permits/PermitDocumentUploader.tsx`
- `src/lib/permitsApi.ts` (CRUD helpers + signed-URL fetcher)

**Edits**
- `src/components/tools/permit-path/ResultsDashboard.tsx` — add `onSaveToDashboard` + saved-state UI; preserve roadmap to sessionStorage on signed-out save.
- `src/pages/tools/PermitPath.tsx` — resume save after auth, navigate to dashboard on success.
- `src/components/dashboard/HostDashboard.tsx` + `ShopperDashboard.tsx` — add "Permits" tab.
- `src/App.tsx` — only if a dedicated `/dashboard/permits/:id` route is preferred over `?tab=permits&roadmap=`; default is the tab approach (no new route needed).

## 7. Out of scope (callouts)

- No email/SMS renewal reminders are wired in this pass — the UI surfaces upcoming renewals; sending notifications can be a follow-up using the existing `notifications` infra.
- Document OCR / auto-extraction is not included.
- Sharing a saved roadmap with another user is not included.

## 8. Open questions

- Confirm the **dashboard tab** approach (Permits as a tab inside the existing dashboard) vs. a dedicated `/dashboard/permits` route. Plan defaults to a tab so it slots into the current `?tab=` pattern.
- Confirm **file limits**: 10 MB per file, up to 5 files per requirement, PDF + JPG + PNG + HEIC. Adjust before build if you want different limits.
