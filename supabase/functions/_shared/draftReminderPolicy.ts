/**
 * Who gets a draft reminder, and when.
 *
 * Drafts are eligible from 24 hours to 60 days old. The gap between nudges to
 * the same host stretches as their newest draft ages, so a seller hears from
 * us at most about 8 times over 60 days and never more than every 2 days:
 *   newest draft < 7 days old  → at least 2 days between nudges
 *   7–30 days                  → at least 7 days
 *   30–60 days                 → at least 14 days
 * Internal/test accounts, admins and QA drafts are never nudged.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const DRAFT_MIN_AGE_MS = DAY_MS;
export const DRAFT_MAX_AGE_MS = 60 * DAY_MS;

const INTERNAL_EMAIL = /@(example\.com|vendibook\.com)$/i;
const QA_TITLE = /^\s*(qa\b|test\b)/i;

export function isInternalEmail(email: string | null | undefined): boolean {
  return !!email && INTERNAL_EMAIL.test(email.trim());
}

export function isQaTitle(title: string | null | undefined): boolean {
  return !!title && QA_TITLE.test(title);
}

export function minGapMs(newestDraftAgeMs: number): number {
  if (newestDraftAgeMs < 7 * DAY_MS) return 2 * DAY_MS;
  if (newestDraftAgeMs < 30 * DAY_MS) return 7 * DAY_MS;
  return 14 * DAY_MS;
}

export function isDueForNudge(
  newestDraftCreatedAt: string,
  lastNudgedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  const age = now - new Date(newestDraftCreatedAt).getTime();
  if (!(age >= DRAFT_MIN_AGE_MS && age <= DRAFT_MAX_AGE_MS)) return false;
  if (!lastNudgedAt) return true;
  return now - new Date(lastNudgedAt).getTime() >= minGapMs(age);
}

/** Drafts with their photos in can use the one-screen finish page. */
export function draftFinishPath(listingId: string, photoCount: number): string {
  return photoCount >= 3 ? `/list/finish/${listingId}` : `/create-listing/${listingId}`;
}
