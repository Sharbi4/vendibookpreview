import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const cache = new Map<string, boolean>();

/**
 * Public read of a seller's Identity Verified badge.
 *
 * Backed by the server-side `is_seller_identity_verified` function, which
 * derives eligibility from Plaid success + captured payment + no revocation.
 * Never reads a user-editable profile column directly.
 */
export function useSellerVerifiedBadge(sellerId?: string | null) {
  const [verified, setVerified] = useState<boolean>(() =>
    sellerId ? cache.get(sellerId) ?? false : false,
  );
  const [loading, setLoading] = useState(!!sellerId && !cache.has(sellerId ?? ''));

  useEffect(() => {
    if (!sellerId) {
      setVerified(false);
      setLoading(false);
      return;
    }
    if (cache.has(sellerId)) {
      setVerified(cache.get(sellerId)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabase
      .rpc('is_seller_identity_verified', { _user_id: sellerId })
      .then(({ data, error }) => {
        if (cancelled) return;
        const value = !error && data === true;
        cache.set(sellerId, value);
        setVerified(value);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  return { verified, loading };
}
