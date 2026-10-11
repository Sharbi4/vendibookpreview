import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserTransaction {
  id: string;
  reference: string | null;
  transaction_type: string | null;
  provider: string | null;
  payment_status: string | null;
  internal_status: string | null;
  dispute_status: string | null;
  currency: string | null;
  gross_amount_cents: number | null;
  refunded_cents: number | null;
  seller_proceeds_cents: number | null;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  payment_source: string | null;
  created_at: string;
  captured_at: string | null;
  listing_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  booking_request_id: string | null;
  sale_transaction_id: string | null;
  role: 'buyer' | 'seller';
  listing?: { title: string | null; cover_image_url: string | null } | null;
}

/**
 * The latest 200 payment records the signed-in user participates in (as buyer or
 * seller), with dispute state. RLS on `payment_records` already restricts
 * rows to participants; the explicit filter also scopes administrator accounts.
 */
export function useUserTransactions(userId?: string) {
  const query = useQuery({
    queryKey: ['user-transactions', userId],
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<UserTransaction[]> => {
      const { data, error } = await supabase
        .from('payment_records')
        .select(
          'id, reference, transaction_type, provider, payment_status, internal_status, dispute_status, currency, gross_amount_cents, refunded_cents, seller_proceeds_cents, paypal_order_id, paypal_capture_id, payment_source, created_at, captured_at, listing_id, buyer_id, seller_id, booking_request_id, sale_transaction_id',
        )
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        // `created` rows are checkout attempts that were never approved at PayPal
        // (no money moved). They are not activity and must never be listed.
        .not('payment_status', 'in', '("created","cancelled")')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!data) return [];

      const listingIds = Array.from(new Set(data.map((r: any) => r.listing_id).filter(Boolean)));
      let listings: Record<string, { title: string | null; cover_image_url: string | null }> = {};
      if (listingIds.length) {
        const { data: rows } = await supabase
          .from('listings')
          .select('id, title, cover_image_url')
          .in('id', listingIds as string[]);
        listings = Object.fromEntries(
          (rows ?? []).map((l: any) => [l.id, { title: l.title, cover_image_url: l.cover_image_url }]),
        );
      }

      return data.map((r: any) => ({
        ...r,
        role: r.buyer_id === userId ? 'buyer' : 'seller',
        listing: r.listing_id ? listings[r.listing_id] ?? null : null,
      }));
    },
  });

  return { transactions: query.data ?? [], isLoading: query.isLoading, isError: query.isError, refresh: query.refetch };
}

export const DISPUTE_REASONS: { value: string; label: string }[] = [
  { value: 'not_received', label: 'Item or booking not received' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'cancelled_by_other_party', label: 'Cancelled by the other party' },
  { value: 'duplicate_charge', label: 'Duplicate or unexpected charge' },
  { value: 'refund_not_received', label: 'Refund not received' },
  { value: 'other', label: 'Other issue' },
];

export const OPEN_DISPUTE_STATUSES = ['open', 'buyer_reported', 'seller_reported', 'under_review'];
