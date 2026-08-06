import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * AI-proposed structured facts parsed from a seller's existing description.
 *
 * Suggestions live in their own table and are never public facts. A seller
 * must accept (optionally after editing) each one before it can populate a
 * listing field; rejecting removes it. Nothing is bulk-published.
 */
export interface SpecSuggestion {
  id: string;
  listing_id: string;
  section: string;
  field: string;
  suggested_value: unknown;
  source_text: string | null;
  confidence: number | null;
  status: 'suggested' | 'accepted' | 'rejected';
}

const db = supabase as unknown as { from: (table: string) => any };

export const useSpecSuggestions = (listingId?: string | null) => {
  const [suggestions, setSuggestions] = useState<SpecSuggestion[]>([]);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    const { data } = await db
      .from('listing_spec_suggestions')
      .select('*')
      .eq('listing_id', listingId)
      .eq('status', 'suggested')
      .order('created_at', { ascending: true });
    setSuggestions((data as SpecSuggestion[]) ?? []);
    setLoading(false);
  }, [listingId]);

  useEffect(() => {
    if (!listingId) {
      setLoading(false);
      return;
    }
    void load();
  }, [listingId, load]);

  /** Ask the AI parser to re-read the seller's description. */
  const generate = useCallback(async () => {
    if (!listingId) return false;
    setGenerating(true);
    const { error } = await supabase.functions.invoke('listing-spec-suggest', {
      body: { listingId },
    });
    setGenerating(false);
    if (error) return false;
    await load();
    return true;
  }, [listingId, load]);

  const resolve = useCallback(
    async (id: string, status: 'accepted' | 'rejected', acceptedValue?: unknown) => {
      const { error } = await db
        .from('listing_spec_suggestions')
        .update({
          status,
          accepted_value: status === 'accepted' ? (acceptedValue ?? null) : null,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) return false;
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      return true;
    },
    [],
  );

  return { suggestions, loading, generating, generate, resolve, reload: load };
};
