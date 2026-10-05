import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { priceCheck, type PriceCheck } from '@/lib/listings/priceCheck';

/** Live asking prices for a category's sale listings, cached for an hour. */
export function useCategoryPriceCheck(listingId: string | undefined, category: string | undefined, price: number | null | undefined): PriceCheck | null {
  const { data } = useQuery({
    queryKey: ['category-sale-prices', category],
    enabled: !!category && !!price,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, price_sale')
        .eq('status', 'published')
        .eq('mode', 'sale')
        .eq('category', category as never)
        .is('deleted_at', null)
        .not('price_sale', 'is', null)
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as { id: string; price_sale: number | string | null }[];
    },
  });
  if (!data) return null;
  const comps = data.filter((r) => r.id !== listingId).map((r) => Number(r.price_sale));
  return priceCheck(price, comps);
}
