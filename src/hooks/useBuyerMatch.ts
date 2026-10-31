import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { BuyerMatchData, BuyerMatchProgressUpdate } from '@/lib/monetization/buyerMatchIntelligence';
const db = supabase as any;
export async function buyerMatchAction(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await db.rpc('buyermatch_action', { _action: action, _payload: payload });
  if (error) throw new Error(error.message);
  return data;
}
export function useBuyerMatch() {
  const { user } = useAuth();
  const client = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`buyermatch-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buyermatch_campaigns', filter: `seller_id=eq.${user.id}` }, () => client.invalidateQueries({ queryKey: ['buyermatch', user.id] }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, client]);
  return useQuery<BuyerMatchData>({
    queryKey: ['buyermatch', user?.id], enabled: !!user, refetchInterval: 60000,
    queryFn: async () => {
      if (!user) throw new Error('Sign in required');
      const config = await buyerMatchAction('config');
      const [campaigns, reports, listings, events, links, progress] = await Promise.all([
        db.from('buyermatch_campaigns').select('*').order('created_at', { ascending: false }),
        db.from('buyermatch_reports').select('*').order('published_at', { ascending: false }),
        db.from('listings').select('id,title,cover_image_url,mode,price_sale,price_daily,price_hourly,price_weekly,price_monthly,city,state,description,image_urls,included_items').eq('host_id', user.id).in('mode',['sale','rent']).eq('status','published').is('deleted_at',null).or('unlisted.eq.false,unlisted.is.null'),
        db.from('buyermatch_events').select('id,event_key,campaign_id,listing_id,event_type,occurred_at,source,verification_status,outcome,next_step,feedback').order('occurred_at', { ascending: false }),
        db.from('buyermatch_links').select('*').order('created_at', { ascending: false }),
        db.from('buyermatch_progress_updates').select('id,campaign_id,steps,created_at,next_update_at,report,monitoring_report').order('created_at', { ascending: false }),
      ]);
      for (const result of [campaigns, reports, listings, events, links, progress]) if (result.error) throw new Error(result.error.message);
      return { config, campaigns: campaigns.data ?? [], reports: reports.data ?? [], listings: listings.data ?? [], events: events.data ?? [], links: links.data ?? [], progress: (progress.data ?? []).map((row: BuyerMatchProgressUpdate & { monitoring_report?: BuyerMatchProgressUpdate['report'] }) => ({ ...row, report: row.monitoring_report ?? row.report })) };
    },
  });
}
