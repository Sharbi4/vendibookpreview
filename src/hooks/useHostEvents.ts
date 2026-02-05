import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HostEvent {
  id: string;
  listing_id: string;
  host_id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined listing data
  listing_title?: string;
}

export const useHostEvents = (hostId: string | undefined) => {
  return useQuery({
    queryKey: ['host-events', hostId],
    queryFn: async (): Promise<HostEvent[]> => {
      if (!hostId) return [];

      // Get all active events for this host's published listings
      const { data, error } = await supabase
        .from('listing_events')
        .select(`
          *,
          listings!inner(title, status)
        `)
        .eq('host_id', hostId)
        .eq('is_active', true)
        .eq('listings.status', 'published')
        .order('event_date', { ascending: true, nullsFirst: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map((event: any) => ({
        ...event,
        listing_title: event.listings?.title,
      }));
    },
    enabled: !!hostId,
    staleTime: 60000, // 1 minute
  });
};
