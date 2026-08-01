/**
 * Server-side mirror of `src/lib/displayName.ts`.
 *
 * Edge functions must use this when a name is rendered for ANY party other
 * than the account owner (cross-party emails, notifications, order payloads,
 * buyer/seller timelines). Private legal names may only be used for legally
 * required documents, payment/tax/identity providers, and admin surfaces.
 */

const clean = (value?: string | null): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

function firstInitial(token: string): string {
  const chars = Array.from(token);
  return (chars[0] ?? "").toLocaleUpperCase();
}

export const FORMER_MEMBER_LABEL = "Former Vendibook member";

/** `formatPublicName('Shawnna','Harbin') → 'Shawnna H.'` */
export function formatPublicName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = "Vendibook member",
): string {
  const first = clean(firstName);
  const last = clean(lastName);
  if (!first) return fallback;
  if (!last) return first;
  // Spec: "de la Cruz" → "D." (first surname token).
  const surname = last.split(" ").filter(Boolean)[0] ?? "";
  const initial = firstInitial(surname);
  return initial ? `${first} ${initial}.` : first;
}

export interface PublicNameInput {
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  deleted_at?: string | null;
}

/** Public-safe display name. Never returns a full surname or email username. */
export function getPublicDisplayName(
  profile: PublicNameInput | null | undefined,
  fallback = "Vendibook member",
): string {
  if (!profile) return fallback;
  if (profile.deleted_at) return FORMER_MEMBER_LABEL;

  if (clean(profile.business_name)) return clean(profile.business_name);

  const first = clean(profile.first_name);
  if (first) return formatPublicName(first, profile.last_name, fallback);

  const parts = clean(profile.full_name).split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return formatPublicName(parts[0], parts.slice(1).join(" "), fallback);
  }
  if (parts.length === 1) return parts[0];

  const handle = clean(profile.display_name);
  if (handle) {
    const hp = handle.split(" ").filter(Boolean);
    return hp.length >= 2
      ? formatPublicName(hp[0], hp.slice(1).join(" "), fallback)
      : handle;
  }

  return fallback;
}

/**
 * Greeting name for an email addressed to the account owner themselves.
 * Owners may see their own first name; still never their full legal name in
 * subject lines.
 */
export function getGreetingFirstName(
  profile: PublicNameInput | null | undefined,
  fallback = "there",
): string {
  const first = clean(profile?.first_name);
  if (first) return first;
  const parts = clean(profile?.full_name).split(" ").filter(Boolean);
  return parts[0] || fallback;
}
