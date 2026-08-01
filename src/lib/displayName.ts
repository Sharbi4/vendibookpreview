/**
 * Privacy-safe public name model.
 *
 * A user's full legal/account name is NEVER shown to another marketplace user.
 * Public surfaces may only render:
 *   1. business_name (a deliberately public trading name), or
 *   2. "First L." (first name + last-name initial), or
 *   3. First name only, or
 *   4. A neutral role label ("Vendibook member", "Host", "Seller", "Buyer").
 *
 * Full names remain available to the account owner, admins, and legally
 * required transaction documents — those paths must read the private fields
 * directly and must never route through these helpers.
 */

export type NeutralRoleLabel =
  | 'Vendibook member'
  | 'Host'
  | 'Seller'
  | 'Buyer'
  | 'Guest';

const clean = (value?: string | null): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

/** First grapheme of a token, uppercased. Unicode-safe (handles é, Ø, 中, emoji). */
function firstInitial(token: string): string {
  const chars = Array.from(token);
  return (chars[0] ?? '').toLocaleUpperCase();
}

/**
 * Canonical public formatter: `formatPublicName('Shawnna', 'Harbin') → 'Shawnna H.'`
 *
 * - Trims and collapses whitespace.
 * - Missing/blank last name → first name only.
 * - Missing/blank first name → neutral label (never the surname, never an email).
 * - Multi-word surnames ("de la Cruz") use the LAST token's initial → "Maria D.".
 * - Hyphenated/apostrophe surnames keep their leading initial ("O'Brien" → "O.").
 */
export function formatPublicName(
  firstName?: string | null,
  lastName?: string | null,
  fallback: NeutralRoleLabel = 'Vendibook member',
): string {
  const first = clean(firstName);
  const last = clean(lastName);

  if (!first) return fallback;
  if (!last) return first;

  // Spec: multi-word surnames use the FIRST surname token ("de la Cruz" → "D.").
  const surname = last.split(' ').filter(Boolean)[0] ?? '';
  const initial = firstInitial(surname);
  return initial ? `${first} ${initial}.` : first;
}

/**
 * Best-effort split of a legacy single-string name into first/last parts.
 * Used only to keep historical rows renderable — never treated as verified
 * legal identity data.
 */
export function splitLegacyName(fullName?: string | null): {
  first: string;
  last: string;
} {
  const parts = clean(fullName).split(' ').filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export interface DisplayNameInput {
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  /** Legacy single-string name. Only ever used to derive "First L.". */
  full_name?: string | null;
  /** Self-chosen public handle/storefront name. */
  display_name?: string | null;
  /** Account lifecycle flags — deleted/suspended users lose name exposure. */
  deleted_at?: string | null;
  account_suspended?: boolean | null;
  /**
   * @deprecated Full surnames are never shown publicly. Retained so existing
   * callers keep compiling; the value is intentionally ignored.
   */
  show_full_name?: boolean | null;
}

export const FORMER_MEMBER_LABEL = 'Former Vendibook member';
export const UNAVAILABLE_SELLER_LABEL = 'Unavailable seller';

/**
 * Public-safe display name for any marketplace-facing surface.
 *
 * Priority: business_name → "First L." → first name → display_name (a
 * self-chosen handle, never a legal name) → neutral label.
 * An email username is NEVER used as a person's name.
 */
export function getPublicDisplayName(
  profile: DisplayNameInput | null | undefined,
  fallback: NeutralRoleLabel = 'Vendibook member',
): string {
  if (!profile) return fallback;

  if (profile.deleted_at) return FORMER_MEMBER_LABEL;

  if (clean(profile.business_name)) return clean(profile.business_name);

  const first = clean(profile.first_name);
  const last = clean(profile.last_name);
  if (first) return formatPublicName(first, last, fallback);

  // Legacy rows that only have a single-string name.
  const legacy = splitLegacyName(profile.full_name);
  if (legacy.first) return formatPublicName(legacy.first, legacy.last, fallback);

  // A display_name is a self-chosen handle, not an account/legal name.
  const handle = clean(profile.display_name);
  if (handle) {
    const parts = handle.split(' ').filter(Boolean);
    // Defensive: if a handle looks like "First Last", still abbreviate it.
    return parts.length >= 2
      ? formatPublicName(parts[0], parts.slice(1).join(' '), fallback)
      : handle;
  }

  return fallback;
}

/** Avatar initials — safe because a single initial reveals no surname. */
export function getDisplayInitials(
  profile: DisplayNameInput | null | undefined,
): string {
  if (!profile) return '?';
  if (profile.deleted_at) return '?';

  const business = clean(profile.business_name);
  const first = clean(profile.first_name);
  const last = clean(profile.last_name);

  if (first) {
    return `${firstInitial(first)}${last ? firstInitial(last) : ''}`;
  }

  const legacy = splitLegacyName(profile.full_name);
  if (legacy.first) {
    return `${firstInitial(legacy.first)}${
      legacy.last ? firstInitial(legacy.last.split(' ')[0] ?? '') : ''
    }`;
  }

  const handle = business || clean(profile.display_name);
  if (handle) return firstInitial(handle);

  return '?';
}

/**
 * Counterparty label for booking/order/offer surfaces where the other party's
 * profile may be missing (guest checkout), deleted, or suspended.
 */
export function getCounterpartyName(
  profile: DisplayNameInput | null | undefined,
  role: NeutralRoleLabel = 'Guest',
): string {
  if (!profile) return role;
  if (profile.deleted_at) return FORMER_MEMBER_LABEL;
  if (profile.account_suspended) return UNAVAILABLE_SELLER_LABEL;
  return getPublicDisplayName(profile, role);
}
