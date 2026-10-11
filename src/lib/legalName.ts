/**
 * Plausible legal-name check for sign-up and the update-your-name prompt.
 * Letters (any language), spaces, apostrophes, hyphens and periods only;
 * first and last name each need 2+ letters; no placeholders.
 */
const PART = /^[\p{L}][\p{L}\p{M}'’.\- ]*[\p{L}.]$/u;
const PLACEHOLDERS = new Set(['test', 'tester', 'user', 'admin', 'asdf', 'qwerty', 'name', 'first', 'last',
  'none', 'na', 'n/a', 'unknown', 'anonymous', 'fake', 'xxx', 'abc', 'vendibook', 'owner', 'seller', 'buyer', 'host']);

export function legalNamePartError(value: string, label: 'First' | 'Last'): string | null {
  const v = value.trim();
  if (!v) return `${label} name is required`;
  if (v.length > 50) return `${label} name is too long`;
  if (!PART.test(v) || (v.match(/\p{L}/gu) ?? []).length < 2) return `Enter your real ${label.toLowerCase()} name`;
  const lower = v.toLowerCase();
  if (PLACEHOLDERS.has(lower) || /^(.)\1+$/u.test(lower.replace(/[^\p{L}]/gu, ''))) return `Enter your real ${label.toLowerCase()} name`;
  return null;
}

export function legalNameError(first: string, last: string): string | null {
  const e = legalNamePartError(first, 'First') ?? legalNamePartError(last, 'Last');
  if (e) return e;
  if (first.trim().toLowerCase() === last.trim().toLowerCase()) return 'First and last name can’t be the same';
  return null;
}

/** Splits a stored full name and checks it. */
export function isPlausibleFullName(full: string | null | undefined, first?: string | null, last?: string | null): boolean {
  if (first && last) return legalNameError(first, last) === null;
  const parts = (full ?? '').trim().split(/\s+/);
  if (parts.length < 2) return false;
  return legalNameError(parts[0], parts.slice(1).join(' ')) === null;
}
