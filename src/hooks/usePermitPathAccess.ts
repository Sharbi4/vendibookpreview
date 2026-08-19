/**
 * Resolves PermitPath Basic vs Plus for the signed-in user.
 *
 * Reads every host_subscriptions row (a member can hold Vendibook Pro AND
 * PermitPath Plus at the same time), the retired one-time Plus purchase, and
 * pre-cutoff permit activity for founding members. See
 * src/lib/permits/permitPathAccess.ts for the rules.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  PERMIT_PLUS_GRANDFATHER_CUTOFF,
  PERMIT_PLUS_SLUGS,
  resolvePermitPlus,
  type PermitPlusAccess,
} from '@/lib/permits/permitPathAccess';

export interface PermitPathAccess extends PermitPlusAccess {
  isLoading: boolean;
  /** Signed out users are Basic — they can still run the free checklist. */
  isSignedIn: boolean;
}

export function usePermitPathAccess(): PermitPathAccess {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['permit-path-access', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<PermitPlusAccess> => {
      const [subsRes, purchaseRes, legacyRoadmaps, legacyItems] = await Promise.all([
        (supabase as any)
          .from('host_subscriptions')
          .select('tier, status')
          .eq('user_id', user!.id),
        (supabase as any)
          .from('monetization_purchases')
          .select('status, monetization_products!inner(slug)')
          .eq('user_id', user!.id)
          .in('status', ['paid', 'fulfilled'])
          .in('monetization_products.slug', PERMIT_PLUS_SLUGS as unknown as string[]),
        (supabase as any)
          .from('saved_permit_roadmaps')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .lt('created_at', PERMIT_PLUS_GRANDFATHER_CUTOFF),
        (supabase as any)
          .from('permit_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .lt('created_at', PERMIT_PLUS_GRANDFATHER_CUTOFF),
      ]);

      return resolvePermitPlus({
        subscriptions: subsRes.data ?? [],
        purchasedSlugs: (purchaseRes.data ?? []).map(
          (row: any) => row?.monetization_products?.slug,
        ).filter(Boolean),
        legacyUser: (legacyRoadmaps.count ?? 0) + (legacyItems.count ?? 0) > 0,
      });
    },
  });

  return {
    isPlus: data?.isPlus ?? false,
    reason: data?.reason ?? 'locked',
    isLoading: !!user && isLoading,
    isSignedIn: !!user,
  };
}

export default usePermitPathAccess;
