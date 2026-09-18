/**
 * Server-side mirror of the client legal document registry versions.
 *
 * Edge functions that gate an action on acceptance MUST compare against these
 * constants. Keep them in step with `src/lib/legal/versions.ts` — the smoke
 * test `scripts/smoke/legal-routes-smoke.ts` asserts they match.
 */
export const LEGAL_VERSIONS = {
  "terms-of-service": "2026-09-18",
  "privacy-policy": "2026-09-18",
  "payments-terms": "2026-09-18b",
  "seller-payment-terms": "2026-09-18c",
  "esign": "2026-09-18",
  "handoff-terms": "2026-09-18",
  "financing-disclosure": "2026-09-18",
  "video-walkthrough-terms": "2026-09-18b",
  "recording-consent": "2026-09-18",
  "device-permissions-privacy": "2026-09-18b",
  "location-tracking": "2026-09-18",
} as const;

export type LegalSlug = keyof typeof LEGAL_VERSIONS;

/**
 * True when `userId` has accepted the current version of `slug`.
 * `db` is a service-role Supabase client.
 */
export async function hasCurrentLegalAcceptance(
  db: { from: (t: string) => any },
  userId: string,
  slug: LegalSlug,
): Promise<boolean> {
  const { data } = await db
    .from("legal_acceptances")
    .select("id")
    .eq("user_id", userId)
    .eq("document_slug", slug)
    .eq("document_version", LEGAL_VERSIONS[slug])
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

/** Record an acceptance server-side (used for signed-in gated actions). */
export async function recordServerLegalAcceptance(
  db: { from: (t: string) => any },
  input: {
    userId: string;
    slug: LegalSlug;
    surface: string;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    grantedPermissions?: Record<string, boolean>;
  },
) {
  await db.from("legal_acceptances").insert({
    user_id: input.userId,
    document_slug: input.slug,
    document_version: LEGAL_VERSIONS[input.slug],
    surface: input.surface,
    related_entity_type: input.relatedEntityType ?? null,
    related_entity_id: input.relatedEntityId ?? null,
    granted_permissions: input.grantedPermissions ?? {},
  });
}
