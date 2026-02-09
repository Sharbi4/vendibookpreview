import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAdminPromo = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: promotions, isLoading: promosLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['admin-listing-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listing_rewards')
        .select('*, listings(title), profiles:user_id(full_name, email, display_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['admin-contest-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contest_entries')
        .select('*, listings(title), profiles:user_id(full_name, email, display_name)')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: winners, isLoading: winnersLoading } = useQuery({
    queryKey: ['admin-contest-winners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contest_winners')
        .select('*, contest_entries(facebook_post_url, listings(title)), profiles:user_id(full_name, email)')
        .order('selected_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const verifyEntry = useMutation({
    mutationFn: async ({ entryId, status, notes }: { entryId: string; status: 'verified' | 'rejected'; notes?: string }) => {
      const { error } = await supabase
        .from('contest_entries')
        .update({
          status,
          verified_at: status === 'verified' ? new Date().toISOString() : null,
          notes: notes || null,
        })
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contest-entries'] });
      toast({ title: 'Entry updated' });
    },
  });

  const overrideReward = useMutation({
    mutationFn: async ({ rewardId, action }: { rewardId: string; action: 'approve' | 'disqualify' }) => {
      if (action === 'approve') {
        const { error } = await supabase
          .from('listing_rewards')
          .update({ admin_override: true, payout_status: 'eligible', eligible_at: new Date().toISOString() })
          .eq('id', rewardId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('listing_rewards')
          .update({ disqualified_at: new Date().toISOString(), disqualified_reason: 'Admin disqualified', payout_status: 'disqualified' })
          .eq('id', rewardId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listing-rewards'] });
      toast({ title: 'Reward updated' });
    },
  });

  return {
    promotions,
    rewards,
    entries,
    winners,
    isLoading: promosLoading || rewardsLoading || entriesLoading || winnersLoading,
    verifyEntry,
    overrideReward,
  };
};
