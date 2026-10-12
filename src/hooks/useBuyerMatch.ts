import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
const db = supabase as any;
export async function buyerMatchAction(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await db.rpc('buyermatch_action', { _action: action, _payload: payload });
  if (error) throw new Error(error.message);
  return data;
}
export function useBuyerMatch() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['buyermatch', user?.id], enabled: !!user, refetchInterval: 60000,
    queryFn: async () => {
      const config = await buyerMatchAction('config');
      const [campaigns, reports, listings, imports] = await Promise.all([
        db.from('buyermatch_campaigns').select('*').order('created_at', { ascending: false }),
        db.from('buyermatch_reports').select('*').order('published_at', { ascending: false }),
        db.from('listings').select('id,title,cover_image_url').eq('host_id', user!.id).eq('mode','sale').eq('status','published').is('deleted_at',null).or('unlisted.eq.false,unlisted.is.null'),
        config.is_admin ? db.from('buyermatch_imports').select('*').eq('status','pending_review').order('submitted_at') : Promise.resolve({ data: [], error: null }),
      ]);
      for (const result of [campaigns, reports, listings, imports]) if (result.error) throw new Error(result.error.message);
      return { config, campaigns: campaigns.data ?? [], reports: reports.data ?? [], listings: listings.data ?? [], imports: imports.data ?? [] };
    },
  });
}
