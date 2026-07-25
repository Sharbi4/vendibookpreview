import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BoostHistoryEntry {
  session_id: string;
  payment_intent_id: string | null;
  paid_at: string;
  amount_cents: number;
  starts_at: string;
  ends_at: string;
  receipt_url: string | null;
  /** 'active' when applied immediately, 'queued' when paid while listing was still a draft. */
  status: 'active' | 'queued' | 'expired' | 'refunded';
}

interface ListingBoostState {
  history: BoostHistoryEntry[];
  currentEndsAt: string | null;
  isActive: boolean;
}

/**
 * Fetches the boost history and the active-boost window for a single listing.
 * Reads the listing's `boost_history` JSONB array + `featured_expires_at`.
 * `history` is returned newest-first for UI display.
 */
export function useListingBoostHistory(listingId: string | null | undefined) {
  return useQuery<ListingBoostState>({
    queryKey: ['listing-boost-history', listingId],
    enabled: !!listingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('boost_history, featured_enabled, featured_expires_at')
        .eq('id', listingId!)
        .maybeSingle();
      if (error) throw error;

      const raw = Array.isArray((data as { boost_history?: unknown } | null)?.boost_history)
        ? ((data as { boost_history: unknown[] }).boost_history as BoostHistoryEntry[])
        : [];

      const nowMs = Date.now();
      const withDerivedStatus = raw.map((entry) => {
        const endsMs = new Date(entry.ends_at).getTime();
        const startsMs = new Date(entry.starts_at).getTime();
        let status: BoostHistoryEntry['status'] = entry.status;
        if (status !== 'refunded') {
          if (endsMs < nowMs) status = 'expired';
          else if (startsMs > nowMs) status = 'queued';
          else status = 'active';
        }
        return { ...entry, status };
      });

      // Newest first
      const history = [...withDerivedStatus].sort(
        (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime(),
      );

      const currentEndsAt =
        data?.featured_enabled && data.featured_expires_at
          ? data.featured_expires_at
          : null;
      const isActive =
        !!currentEndsAt && new Date(currentEndsAt).getTime() > nowMs;

      return { history, currentEndsAt, isActive };
    },
    staleTime: 30_000,
  });
}
