import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the user's lifetime earned referral reward amount
 * (sum of paid referrer rewards). Returns 0 if not logged in or no rewards.
 */
export function useReferralEarnings() {
  const { user } = useAuth();
  const [earned, setEarned] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setEarned(0);
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select('referrer_reward_amount, referrer_reward_status')
        .eq('referrer_id', user.id)
        .eq('referrer_reward_status', 'paid');
      if (cancelled) return;
      if (error) {
        setEarned(0);
      } else {
        const total = (data || []).reduce(
          (sum, r: any) => sum + Number(r.referrer_reward_amount || 0),
          0,
        );
        setEarned(total);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { earned, loading };
}
