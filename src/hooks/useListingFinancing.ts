import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePublicFeatureFlag } from '@/hooks/usePublicFeatureFlag';
import {
  EQUINOX_FLAG_KEY,
  EQUINOX_DISCLOSURE_VERSION,
  isFinanceableSaleListing,
} from '@/lib/financing/disclosure';

import { trackSellerFinancingToggled } from '@/lib/analytics';

export interface ListingFinancingPreference {
  listing_id: string;
  equinox_opt_in: boolean;
  include_vin: boolean;
  disclosure_version: string | null;
  disclosure_accepted_at: string | null;
}

/**
 * Reads a single listing's financing opt-in row. Publicly readable (booleans
 * only — never the VIN itself). Fails closed to `null`.
 */
export function useListingFinancingPreference(listingId?: string | null) {
  return useQuery({
    queryKey: ['listing-financing-preference', listingId],
    enabled: !!listingId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ListingFinancingPreference | null> => {
      const { data, error } = await (supabase as any)
        .from('listing_financing_preferences')
        .select('listing_id, equinox_opt_in, include_vin, disclosure_version, disclosure_accepted_at')
        .eq('listing_id', listingId)
        .maybeSingle();
      if (error) return null;
      return (data as ListingFinancingPreference) ?? null;
    },
  });
}

/**
 * Public gate for every Equinox surface (badge, apply link, purchase sheet).
 * Buyer financing is a marketplace-level benefit: it requires only the global
 * launch flag and a published for-sale listing. There is no seller opt-in.
 */
export function useEquinoxFinancingEnabled(listing: any): boolean {
  const flagOn = usePublicFeatureFlag(EQUINOX_FLAG_KEY);
  return flagOn && isFinanceableSaleListing(listing);
}

/**
 * Batch-loads financing preferences for a set of the seller's listings.
 * Returns a map of listing_id -> equinox_opt_in (missing = false).
 */
export function useHostFinancingPreferences(listingIds: string[]) {
  const key = [...listingIds].sort().join(',');
  return useQuery({
    queryKey: ['host-financing-preferences', key],
    enabled: listingIds.length > 0,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data, error } = await (supabase as any)
        .from('listing_financing_preferences')
        .select('listing_id, equinox_opt_in')
        .in('listing_id', listingIds);
      if (error) return {};
      const map: Record<string, boolean> = {};
      for (const row of (data ?? []) as { listing_id: string; equinox_opt_in: boolean }[]) {
        map[row.listing_id] = !!row.equinox_opt_in;
      }
      return map;
    },
  });
}

/**
 * Seller-controlled opt-in toggle for a single listing. Enabling always
 * records the exact disclosure version the seller accepted; disabling only
 * flips that one listing to false.
 */
export function useSetListingFinancing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, enabled }: { listingId: string; enabled: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const hostId = auth?.user?.id;
      if (!hostId) throw new Error('You must be signed in.');

      const { error } = await (supabase as any)
        .from('listing_financing_preferences')
        .upsert(
          {
            listing_id: listingId,
            host_id: hostId,
            equinox_opt_in: enabled,
            disclosure_version: enabled ? EQUINOX_DISCLOSURE_VERSION : null,
            disclosure_accepted_at: enabled ? new Date().toISOString() : null,
          },
          { onConflict: 'listing_id' },
        );
      if (error) throw error;
      return { listingId, enabled };
    },
    onSuccess: ({ listingId, enabled }) => {
      trackSellerFinancingToggled(listingId, enabled);
      void qc.invalidateQueries({ queryKey: ['host-financing-preferences'] });
      void qc.invalidateQueries({ queryKey: ['listing-financing-preference', listingId] });
    },
  });
}
