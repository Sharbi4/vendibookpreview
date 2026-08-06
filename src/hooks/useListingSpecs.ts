import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  SpecValues,
  computeReadiness,
  sectionsForListing,
  ReadinessResult,
} from '@/lib/listings/readiness';

// The generated Supabase types lag behind new tables; these tables are simple
// JSONB buckets so a loose client is safe here.
const db = supabase as unknown as {
  from: (table: string) => any;
};

interface UseListingSpecsArgs {
  listingId?: string | null;
  category?: string | null;
  mode?: string | null;
  /** Skip loading entirely (e.g. drafts). */
  enabled?: boolean;
}

export interface UseListingSpecsResult {
  values: SpecValues;
  confirmedSections: string[];
  readiness: ReadinessResult;
  loading: boolean;
  saving: boolean;
  saveSection: (sectionKey: string, sectionValues: Record<string, unknown>) => Promise<boolean>;
}

const SECTION_KEYS = [
  'cooking', 'refrigeration', 'electrical', 'propane', 'plumbing', 'hood',
  'dimensions', 'mechanical', 'inspections', 'inclusions', 'viewing', 'site',
];

export const useListingSpecs = ({
  listingId,
  category,
  mode,
  enabled = true,
}: UseListingSpecsArgs): UseListingSpecsResult => {
  const [values, setValues] = useState<SpecValues>({});
  const [confirmedSections, setConfirmedSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(listingId && enabled));
  const [saving, setSaving] = useState(false);

  const sections = sectionsForListing(category, mode);

  useEffect(() => {
    if (!listingId || !enabled) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await db
        .from('listing_specs')
        .select('*')
        .eq('listing_id', listingId)
        .maybeSingle();
      if (!active) return;
      if (data) {
        const next: SpecValues = {};
        for (const key of SECTION_KEYS) {
          next[key] = (data[key] as Record<string, unknown>) ?? {};
        }
        setValues(next);
        setConfirmedSections((data.confirmed_sections as string[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [listingId, enabled]);

  const saveSection = useCallback(
    async (sectionKey: string, sectionValues: Record<string, unknown>) => {
      if (!listingId) return false;
      setSaving(true);
      const nextConfirmed = confirmedSections.includes(sectionKey)
        ? confirmedSections
        : [...confirmedSections, sectionKey];

      const { error } = await db.from('listing_specs').upsert(
        {
          listing_id: listingId,
          [sectionKey]: sectionValues,
          confirmed_sections: nextConfirmed,
        },
        { onConflict: 'listing_id' },
      );
      setSaving(false);
      if (error) return false;

      const nextValues = { ...values, [sectionKey]: sectionValues };
      setValues(nextValues);
      setConfirmedSections(nextConfirmed);

      const readiness = computeReadiness(sections, nextValues);
      await db.from('listing_completeness').upsert(
        {
          listing_id: listingId,
          score: readiness.score,
          readiness_level: readiness.level,
          missing_sections: readiness.missingSections,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'listing_id' },
      );
      return true;
    },
    [listingId, confirmedSections, values, sections],
  );

  return {
    values,
    confirmedSections,
    readiness: computeReadiness(sections, values),
    loading,
    saving,
    saveSection,
  };
};
