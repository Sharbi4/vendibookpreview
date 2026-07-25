import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PromotionAsset {
  id: string;
  listing_id: string;
  channel: string; // 'meta' | 'google' | 'instagram' | 'email' | 'twitter' | 'tiktok'
  asset_type: string; // 'ad_copy' | 'social_post' | 'email_blast'
  title: string | null;
  content: any;
  is_active: boolean;
  performance_metrics: any;
  created_at: string;
}

export function usePromotionAssets(listingId?: string) {
  return useQuery<PromotionAsset[]>({
    queryKey: ['promotion-assets', listingId],
    queryFn: async () => {
      let query = supabase
        .from('promotion_assets')
        .select('*')
        .order('created_at', { ascending: false });
      if (listingId) query = query.eq('listing_id', listingId);
      const { data } = await query;
      return (data as PromotionAsset[]) || [];
    },
  });
}

export function useGenerateAdCopy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listing_id,
      channels,
    }: {
      listing_id: string;
      channels: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-ad-copy', {
        body: { listing_id, channels },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['promotion-assets', vars.listing_id] });
      qc.invalidateQueries({ queryKey: ['promotion-assets'] });
      toast({ title: 'Ad copy generated', description: 'Fresh marketing assets ready.' });
    },
    onError: (_e: any) => {
      // Caller (PromotionHub) handles the error — including surfacing
      // entitlement_required as the upsell overlay. Keep this quiet to
      // avoid a duplicate destructive toast.
    },

  });
}
