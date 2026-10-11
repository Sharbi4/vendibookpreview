import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SellerSoldItem {
  id: string;
  listingId: string;
  buyerId: string;
  amount: number | null;
  soldAt: string;
  title: string;
  coverImageUrl: string | null;
  buyerName: string | null;
}

/**
 * Completed sales for the signed-in seller, with the listing title and a safe
 * buyer display name (via the SECURITY DEFINER participant profile RPC).
 */
export function useSellerSoldItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['seller-sold-items', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SellerSoldItem[]> => {
      if (!user?.id) return [];

      const { data: sales, error } = await supabase
        .from('sale_transactions')
        .select('id, listing_id, buyer_id, amount, updated_at')
        .eq('seller_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(24);

      if (error || !sales?.length) return [];

      const listingIds = [...new Set(sales.map((s) => s.listing_id).filter(Boolean))] as string[];
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, cover_image_url, image_urls')
        .in('id', listingIds.length ? listingIds : ['00000000-0000-0000-0000-000000000000']);

      const listingMap = new Map(
        (listings ?? []).map((l) => [
          l.id,
          {
            title: l.title as string,
            cover:
              (l.cover_image_url as string | null) ||
              ((l.image_urls as string[] | null)?.[0] ?? null),
          },
        ]),
      );

      const buyerIds = [...new Set(sales.map((s) => s.buyer_id).filter(Boolean))] as string[];
      const buyerNames = new Map<string, string | null>();
      await Promise.all(
        buyerIds.map(async (id) => {
          const { data } = await supabase.rpc('get_conversation_participant_profile', {
            _user_id: id,
          });
          const row = Array.isArray(data) ? (data[0] as { full_name?: string | null }) : null;
          buyerNames.set(id, row?.full_name ?? null);
        }),
      );

      return sales
        .filter((s) => s.listing_id && s.buyer_id)
        .map((s) => ({
          id: s.id as string,
          listingId: s.listing_id as string,
          buyerId: s.buyer_id as string,
          amount: (s.amount as number | null) ?? null,
          soldAt: s.updated_at as string,
          title: listingMap.get(s.listing_id as string)?.title ?? 'Listing',
          coverImageUrl: listingMap.get(s.listing_id as string)?.cover ?? null,
          buyerName: buyerNames.get(s.buyer_id as string) ?? null,
        }));
    },
  });
}

export default useSellerSoldItems;
