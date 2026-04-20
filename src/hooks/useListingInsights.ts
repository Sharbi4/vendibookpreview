import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AIRecommendation {
  type: 'pricing' | 'media' | 'copy' | 'availability' | 'features' | 'marketing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  action: string;
  expected_impact: string;
}

export interface AIInsight {
  id?: string;
  listing_id: string;
  health_score: number;
  recommendations: AIRecommendation[];
  competitor_summary?: { summary?: string; market?: any } | null;
  generated_at: string;
}

export function useListingInsights(listingId: string | undefined) {
  return useQuery<AIInsight | null>({
    queryKey: ['listing-ai-insights', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const { data } = await supabase
        .from('listing_ai_insights')
        .select('*')
        .eq('listing_id', listingId)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        listing_id: data.listing_id,
        health_score: data.health_score,
        recommendations: (data.recommendations as unknown as AIRecommendation[]) || [],
        competitor_summary: data.competitor_summary as any,
        generated_at: data.generated_at,
      };
    },
    enabled: !!listingId,
  });
}

export function useGenerateInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listing_id: string) => {
      const { data, error } = await supabase.functions.invoke('generate-listing-insights', {
        body: { listing_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, listingId) => {
      qc.invalidateQueries({ queryKey: ['listing-ai-insights', listingId] });
      qc.invalidateQueries({ queryKey: ['all-listing-insights'] });
      toast({ title: 'AI insights ready', description: 'Fresh recommendations generated.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Could not generate insights',
        description: err?.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Pull insights for many listings at once (for the analytics overview grid).
 */
export function useAllHostInsights(hostId: string | undefined) {
  return useQuery({
    queryKey: ['all-listing-insights', hostId],
    queryFn: async () => {
      if (!hostId) return [];
      const { data } = await supabase
        .from('listing_ai_insights')
        .select('listing_id, health_score, generated_at')
        .eq('host_id', hostId)
        .gt('expires_at', new Date().toISOString())
        .order('generated_at', { ascending: false });
      // Deduplicate to most recent per listing
      const map = new Map<string, { listing_id: string; health_score: number; generated_at: string }>();
      for (const row of data || []) {
        if (!map.has(row.listing_id)) map.set(row.listing_id, row);
      }
      return Array.from(map.values());
    },
    enabled: !!hostId,
  });
}
