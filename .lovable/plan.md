# PermitPath: Completion Plan

Three phases, sequenced by user impact and dependency. Each phase is independently shippable.

---

## Phase 1 — Foundations (data control + safe uploads + auth completeness)

The "I can't manage my own data" gap. Highest risk: users feel stuck or lose work.

**Roadmap management**
- Rename roadmap (inline edit on dashboard card + dialog)
- Delete roadmap with **7-day soft delete** (`deleted_at` column, hidden from list, restorable from a "Recently deleted" drawer)
- Auto-purge job: cron deletes rows where `deleted_at < now() - 7 days`
- "Undo" toast after delete (immediate restore, 10s window) + persistent recovery via drawer

**File / document management**
- Delete uploaded permit file (with confirm) — soft-delete the storage object reference, hard-purge after 7 days
- Per-file rename
- Replace file (versioning: keep last version for 7 days)

**Upload validation (client + edge function)**
- Allowlist: PDF, JPG, PNG, **HEIC** (auto-converted server-side to JPG via existing `heic-convert` pattern)
- Max 10 MB per file, max 5 files per permit item
- Reject on MIME mismatch, oversize, or zero-byte
- Resumable upload via `tus` if file > 5 MB; clear progress + retry on interrupted upload
- Toast errors that name the actual problem ("HEIC files over 10 MB — try compressing")
- Antivirus: Supabase Storage's built-in scan flag; quarantine bucket for flagged files

**Auth completeness**
- Forgot password → `/auth/reset-password` page (recovery token flow)
- Email verification banner if `email_confirmed_at` is null
- Session expiry: silent refresh; if refresh fails mid-edit, stash draft to `localStorage` + show "Sign back in to save" modal that restores the draft post-login
- Email-mismatch reconciliation: if a signed-in email differs from a pending-save email, prompt "Claim this roadmap under your account?" before merging

**Effort:** ~2 days. No new third-party services.

---

## Phase 2 — Renewal reminders + notifications center (the business driver)

Drives return visits. Uses expiration dates already stored on permit items.

**Renewal reminder emails**
- New edge function `send-renewal-reminders` (cron, daily 9am AZ)
- Queries `permit_items` where `expires_at` is in {30d, 7d, 1d}
- Sends branded app email per item (uses existing `send-transactional-email` infrastructure)
- New template: `permit-renewal-reminder` with permit name, days remaining, agency link, "snooze 7 days" + "mark renewed" actions
- Deduped via `email_send_log` idempotency key `renewal-{permit_id}-{bucket}`
- Honors `notification_preferences.renewal_email` (new column)

**Notification center (bell icon)**
- New notification types: `permit_renewal_due`, `roadmap_updated_by_law`, `document_expiring`
- Bell dropdown groups by type, shows unread count, "Mark all read"
- Tapping a renewal notif jumps to the permit item in the dashboard
- Server-side: trigger on `permit_items` insert if `expires_at` is set; cron also creates in-app notifications mirroring emails

**Effort:** ~1.5 days. Reuses email infra (already provisioned).

---

## Phase 3 — Mobile camera + sharing/team access (field-vendor + 2-person ops)

**Mobile camera upload**
- File input gets `capture="environment"` attribute on mobile detection
- "Take photo" button alongside "Upload file" on every document-upload surface
- Auto-rotate via EXIF, auto-compress to <2MB before upload

**Sharing / team access**
- New table `roadmap_collaborators (roadmap_id, user_id, role, invited_email, accepted_at)`
- Owner invites by email; pending invite emails (new template `roadmap-invite`)
- Roles: `viewer` (read-only), `editor` (can upload docs + mark complete, cannot delete roadmap)
- RLS extended: `has_roadmap_access(roadmap_id, uid)` security-definer function
- Shared dashboard view shows "Shared with you" section
- Activity feed on the roadmap shows who did what (foundation for Phase 4 audit trail)

**Effort:** ~2 days.

---

## Backlog (decide later, not in this plan)

- Empty-state onboarding flow for zero-roadmap users
- Search / filter on dashboard once user has 3+ roadmaps
- Full audit trail (extends Phase 3 activity feed)

---

## Technical notes

- **Migrations:** 4 total (soft-delete columns; renewal prefs column; collaborators table; activity_log table for Phase 3)
- **New edge functions:** `send-renewal-reminders`, `purge-soft-deleted` (cron); `roadmap-invite-accept`
- **New email templates:** `permit-renewal-reminder`, `roadmap-invite`, plus password-reset already exists
- **Storage:** existing `permit-documents` bucket; add `quarantine` bucket for AV-flagged files
- **No new dependencies beyond what's installed** (heic-convert, tus-js-client already in use elsewhere)

---

**Recommended:** ship Phase 1 first (it unblocks user trust), then Phase 2 (drives the business metric), then Phase 3 (expands TAM to multi-person operations).

Tell me which phase to start, or say "Phase 1" to begin.