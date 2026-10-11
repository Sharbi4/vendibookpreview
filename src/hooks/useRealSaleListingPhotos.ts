import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { excludeTestListings } from '@/lib/excludeTestListings';

export interface RealListingPhoto {
  id: string;
  title: string;
  city: string | null;
  state: string | null;
  priceSale: number | null;
  imageUrl: string;
}

/**
 * Real published for-sale listing photography for marketing surfaces.
 * Falls back to bundled imagery at the call site when empty.
 */
export const useRealSaleListingPhotos = (limit = 8) =>
  useQuery({
    queryKey: ['real-sale-listing-photos', limit],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<RealListingPhoto[]> => {
      let query = supabase
        .from('listings')
        .select('id, title, city, state, price_sale, cover_image_url')
        .eq('status', 'published')
        .eq('mode', 'sale')
        .in('category', ['food_truck', 'food_trailer'])
        .not('cover_image_url', 'is', null)
        .order('published_at', { ascending: false })
        .limit(limit);

      query = excludeTestListings(query as never) as typeof query;

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? [])
        .filter((row) => !!row.cover_image_url)
        .map((row) => ({
          id: row.id,
          title: row.title,
          city: row.city,
          state: row.state,
          priceSale: row.price_sale,
          imageUrl: row.cover_image_url as string,
        }));
    },
  });
