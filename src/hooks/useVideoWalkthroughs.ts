import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Walkthrough = {
  id: string; listing_id: string; seller_id: string; buyer_id: string;
  conversation_id: string | null; starts_at: string; ends_at: string;
  timezone_snapshot: string; status: string; requested_topics: string[];
  buyer_note: string | null; provider: string; created_at: string;
  listing?: { title: string; cover_image_url: string | null; mode: string; city: string | null; state: string | null } | null;
};

export function useVideoWalkthroughs() {
  const { user } = useAuth();
  const [walkthroughs, setWalkthroughs] = useState<Walkthrough[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user) { setWalkthroughs([]); setIsLoading(false); return; }
    const { data } = await (supabase.from('video_walkthroughs') as any)
      .select('*, listing:listings(title,cover_image_url,mode,city,state)')
      .order('starts_at', { ascending: false });
    setWalkthroughs((data || []) as Walkthrough[]);
    setIsLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);
  return { walkthroughs, isLoading, refetch: load };
}

export async function isWalkthroughEnabled(listingId?: string) {
  if (!listingId) return false;
  // Enablement lives on the seller's video settings, exposed through the
  // security-definer RPC (the listings table has no walkthrough column).
  const { data, error } = await (supabase as any).rpc('listing_video_walkthrough_enabled', { _listing_id: listingId });
  if (error) return false;
  return Boolean(data);
}