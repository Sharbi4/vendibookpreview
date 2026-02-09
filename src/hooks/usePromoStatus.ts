import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PromoStatus {
  promotion: any;
  listingReward: any;
  contestEntry: any;
  contestWinner: any;
  isStripeConnected: boolean;
  isIdentityVerified: boolean;
  hasEligibleListing: boolean;
}

export const usePromoStatus = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['promo-status', user?.id],
    queryFn: async (): Promise<PromoStatus> => {
      if (!user?.id) throw new Error('Not authenticated');

      // Fetch active promotion
      const { data: promos } = await supabase
        .from('promotions')
        .select('*')
        .eq('active', true)
        .limit(1);

      const promotion = promos?.[0] || null;

      if (!promotion) {
        return {
          promotion: null,
          listingReward: null,
          contestEntry: null,
          contestWinner: null,
          isStripeConnected: false,
          isIdentityVerified: false,
          hasEligibleListing: false,
        };
      }

      // Fetch user's listing reward, contest entry, profile info in parallel
      const [rewardRes, entryRes, profileRes, winnerRes] = await Promise.all([
        supabase
          .from('listing_rewards')
          .select('*')
          .eq('user_id', user.id)
          .eq('promotion_id', promotion.id)
          .maybeSingle(),
        supabase
          .from('contest_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('promotion_id', promotion.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('stripe_account_id, stripe_onboarding_complete, identity_verified')
          .eq('id', user.id)
          .single(),
        supabase
          .from('contest_winners')
          .select('*')
          .eq('user_id', user.id)
          .eq('promotion_id', promotion.id)
          .maybeSingle(),
      ]);

      return {
        promotion,
        listingReward: rewardRes.data,
        contestEntry: entryRes.data,
        contestWinner: winnerRes.data,
        isStripeConnected: !!profileRes.data?.stripe_account_id && !!profileRes.data?.stripe_onboarding_complete,
        isIdentityVerified: !!profileRes.data?.identity_verified,
        hasEligibleListing: !!rewardRes.data,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
};
