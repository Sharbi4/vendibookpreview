# Messaging verification — 2026-10-11

Checked the production backend through the owner's Lovable connection, without sending customer messages or changing accounts.

## Verified live
- 12 saved conversation messages; sender, thread, and creation time present on all 12. No conversation messages in the past seven days, and no booking-message rows, so this is not evidence of recent end-to-end delivery.
- Both message tables have enabled server-side safety and member-verification triggers, participant-only read/insert policies, restrictive closed-account policies, and realtime publication membership.
- The send_marketplace_message RPC inserts the message and conversation timestamp atomically. Rejections through this RPC retain a moderation event (deduplicated by reason/account/hour); direct rejected inserts and browser-only rejections do not persist the attempted text.
- Standard and obfuscated email addresses and standard phone numbers are blocked server-side. Rate limits, participant checks, phishing checks and staff impersonation checks are also installed.
- Recipient updates cannot rewrite message content. Only read state is accepted for ordinary recipients.

## Fixes
- Extend server contact detection to written dot/dash separators, spaced digits, full-width characters, and invisible separators. Add the contact guard to guest inquiry message text.
- Display the editable video-walkthrough draft on sale and rental pages; never send it on render.
- Prevent overlapping form sends and remove the redundant client conversation-timestamp write. Successful save copy does not claim notification delivery.
- Add GitHub-hosted form/send regression checks and a production build; SQL regression checks run in a rolled-back transaction.

## Boundaries
- Contact filtering is pattern-based, not a guarantee against every evasion or every kind of personal information.
- Attachment contents (images, PDFs, audio/video) are not synchronously OCR/transcription-scanned by these guards. Upload URL validation does not inspect their content.
- Guest inquiry email/phone fields are separately collected contact data. Although notification code withholds them from seller emails, the current listing_leads SELECT policy permits the listing owner to read the lead row. A broader guest-contact privacy redesign must also update the lead-reading surfaces.
- No live customer test messages, emails, account restrictions, record deletions, or credit changes were performed.
