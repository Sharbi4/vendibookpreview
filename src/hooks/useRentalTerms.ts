import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as { from: (table: string) => any };

export type RentalTermsValues = Record<string, unknown>;

/** Rental branch terms, saved independently from the spec sections. */
export const useRentalTerms = (listingId?: string | null, enabled = true) => {
  const [terms, setTerms] = useState<RentalTermsValues>({});
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(Boolean(listingId && enabled));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!listingId || !enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await db
      .from('listing_rental_terms')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle();
    if (data) {
      setTerms((data.terms as RentalTermsValues) ?? {});
      setConfirmed(Boolean(data.confirmed));
    }
    setLoading(false);
  }, [listingId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveGroup = useCallback(
    async (groupValues: RentalTermsValues) => {
      if (!listingId) return false;
      setSaving(true);
      const next = { ...terms, ...groupValues };
      const { error } = await db.from('listing_rental_terms').upsert(
        {
          listing_id: listingId,
          terms: next,
          confirmed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'listing_id' },
      );
      setSaving(false);
      if (error) return false;
      setTerms(next);
      setConfirmed(true);
      return true;
    },
    [listingId, terms],
  );

  return { terms, confirmed, loading, saving, saveGroup, reload: load };
};
