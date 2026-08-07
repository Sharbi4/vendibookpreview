import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SellerBadgeEntry {
  verified: boolean;
  verifiedAt: string | null;
}

/**
 * Batched Identity Verified lookup for lists of listings.
 *
 * One request per unique set of seller ids — never one per card. Backed by the
 * sanitized `seller_identity_badges` function, which returns only the user id
 * and verified date for sellers whose paid verification is currently eligible
 * (Plaid success + captured, unrefunded payment + no revocation).
 *
 * Deliberately NOT `profiles.identity_verified`: that column is legacy history
 * and is not an authoritative source for this paid badge.
 */
export function useSellerIdentityBadgeMap(sellerIds: (string | null | undefined)[]) {
  const ids = useMemo(
    () => [...new Set(sellerIds.filter(Boolean) as string[])].sort(),
    [sellerIds],
  );

  const { data } = useQuery({
    queryKey: ['seller-identity-badges', ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('seller_identity_badges', { _user_ids: ids });
      if (error) throw error;
      return (data ?? []) as { user_id: string; verified_at: string | null }[];
    },
  });

  return useMemo(() => {
    const map: Record<string, SellerBadgeEntry> = {};
    (data ?? []).forEach((row) => {
      map[row.user_id] = { verified: true, verifiedAt: row.verified_at };
    });
    return map;
  }, [data]);
}

/** Convenience shape for surfaces that only need a boolean per seller. */
export function useSellerVerifiedMap(sellerIds: (string | null | undefined)[]) {
  const map = useSellerIdentityBadgeMap(sellerIds);
  return useMemo(() => {
    const flat: Record<string, boolean> = {};
    Object.entries(map).forEach(([id, entry]) => {
      flat[id] = entry.verified;
    });
    return flat;
  }, [map]);
}
