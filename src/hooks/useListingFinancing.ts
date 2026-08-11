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
 * Requires the global launch flag, a for-sale listing (any category), the
 * seller's per-listing opt-in, and a current, accepted disclosure.
 *
 * Financing is arranged directly with Equinox Funding, so this deliberately
 * does NOT require PayPal checkout — cash / pay-in-person sellers may opt in.
 */
export function useEquinoxFinancingEnabled(listing: any): boolean {
  const flagOn = usePublicFeatureFlag(EQUINOX_FLAG_KEY);
  const eligible = isFinanceableSaleListing(listing);
  const { data } = useListingFinancingPreference(flagOn && eligible ? listing?.id : null);
  return (
    flagOn &&
    eligible &&
    data?.equinox_opt_in === true &&
    data?.disclosure_version === EQUINOX_DISCLOSURE_VERSION &&
    !!data?.disclosure_accepted_at
  );
}
