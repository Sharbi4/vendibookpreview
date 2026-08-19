import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermitPathAccess } from '@/hooks/usePermitPathAccess';
import { PermitPlusPanel } from '@/components/tools/permit-path/PermitPlusUpsell';

/**
 * Gates the saved/tracked permit layer in the dashboard. Unlocks for:
 *   - An active PermitPath Plus subscription
 *   - Vendibook Pro (Plus is included)
 *   - The retired one-time PermitPath Plus purchase
 *   - Founding members with pre-cutoff permit data
 *
 * PermitPath Basic stays free for everyone at /tools/permitpath — this gate
 * only covers "save + track + documents + renewal dashboard".
 *
 * Losing Plus never hides data a member already saved: if any permit record
 * exists we still render the tracker below the upsell, so the member can read
 * (and export) their history. Only new Plus actions are blocked, which the
 * database enforces through insert-only policies.
 */
function useHasSavedPermitData(enabled: boolean) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['permit-data-exists', user?.id],
    enabled: enabled && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [roadmaps, items] = await Promise.all([
        supabase
          .from('saved_permit_roadmaps')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id),
        supabase
          .from('permit_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id),
      ]);
      return (roadmaps.count ?? 0) + (items.count ?? 0) > 0;
    },
  });
  return data ?? false;
}

export function PermitsGate({ children }: { children: ReactNode }) {
  const { isPlus, isLoading } = usePermitPathAccess();
  const hasData = useHasSavedPermitData(!isLoading && !isPlus);

  if (isLoading) {
    return <div className="h-40" aria-hidden />;
  }

  if (isPlus) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold mb-1">
          Permits &amp; Licenses
        </div>
        <h2 className="text-2xl font-bold text-white leading-tight">Your permit tracker</h2>
        <p className="text-sm text-white/60 mt-1">
          Save your roadmaps, track progress, and keep expirations in one place.
        </p>
      </div>

      <PermitPlusPanel returnPath="/host/dashboard?tab=permits" />

      {hasData && (
        <div className="space-y-3">
          <p className="text-xs text-white/50">
            Your previously saved permits stay here and remain readable. Restart Plus to add or
            update records.
          </p>
          {children}
        </div>
      )}
    </div>
  );
}

export default PermitsGate;
