import { supabase } from '@/integrations/supabase/client';
import { getLegalDocument, type LegalDocumentSlug } from './versions';

/**
 * Reusable client-side writer for `legal_acceptances`.
 *
 * The UI write is for the user's own record and for surfaces where no edge
 * function is involved. Any gated action that moves data or money MUST also be
 * enforced server-side (see `handoff-ops` → `assertLegalAcceptance`), so that
 * skipping the UI does not skip the acceptance.
 */

export type LegalRelatedEntityType =
  | 'walkthrough'
  | 'order'
  | 'delivery'
  | 'listing'
  | 'booking'
  | 'account';

export type GrantedPermissions = {
  camera?: boolean;
  microphone?: boolean;
  location?: boolean;
  /** Explicit agreement to participate in a recorded meeting. */
  recording?: boolean;
};

export type RecordLegalAcceptanceInput = {
  userId: string;
  slugs: LegalDocumentSlug[];
  surface: string;
  relatedEntityType?: LegalRelatedEntityType | null;
  relatedEntityId?: string | null;
  grantedPermissions?: GrantedPermissions;
};

export async function recordLegalAcceptance(input: RecordLegalAcceptanceInput) {
  const rows = input.slugs.map((slug) => {
    const doc = getLegalDocument(slug);
    return {
      user_id: input.userId,
      document_slug: doc.slug,
      document_version: doc.version,
      surface: input.surface,
      route: typeof window !== 'undefined' ? window.location.pathname : null,
      related_entity_type: input.relatedEntityType ?? null,
      related_entity_id: input.relatedEntityId ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      granted_permissions: input.grantedPermissions ?? {},
    };
  });

  const { error } = await (supabase.from('legal_acceptances') as any).insert(rows);
  return { error };
}

/** True when the user already accepted the current version of every slug. */
export async function hasCurrentAcceptance(
  userId: string,
  slugs: LegalDocumentSlug[],
  relatedEntityId?: string | null,
): Promise<boolean> {
  let query = (supabase.from('legal_acceptances') as any)
    .select('document_slug, document_version')
    .eq('user_id', userId)
    .in('document_slug', slugs);
  if (relatedEntityId) query = query.eq('related_entity_id', relatedEntityId);
  const { data, error } = await query;
  if (error || !data) return false;
  return slugs.every((slug) => {
    const wanted = getLegalDocument(slug).version;
    return data.some((r: any) => r.document_slug === slug && r.document_version === wanted);
  });
}
