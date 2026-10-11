import { useQuery, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Public read of a seller's Identity Verified badge.
 *
 * Backed by the server-side `is_seller_identity_verified` function, which
 * derives eligibility from Plaid success + captured payment + no revocation.
 * Never reads a user-editable profile column directly.
 *
 * Cached through react-query so a seller who just finished the paid check can
 * have every badge surface refreshed immediately (see
 * `refreshSellerBadgeSurfaces`) instead of waiting for a full page reload.
 */
export function useSellerVerifiedBadge(sellerId?: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['seller-verified-badge', sellerId],
    enabled: !!sellerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_seller_identity_verified', {
        _user_id: sellerId as string,
      });
      if (error) return false;
      return data === true;
    },
  });

  return { verified: data === true, loading: !!sellerId && isLoading };
}

/**
 * Invalidate every surface that renders the Identity Verified badge so a
 * freshly verified seller sees it on their listings right away: single-seller
 * reads, batched listing lists, and the host's own listing collections.
 */
export function refreshSellerBadgeSurfaces(queryClient: QueryClient) {
  const keys = [
    'seller-verified-badge',
    'seller-identity-badges',
    'host-listings',
    'listings',
    'listing',
    'profile',
  ];
  keys.forEach((key) => {
    void queryClient.invalidateQueries({ queryKey: [key] });
  });
}
