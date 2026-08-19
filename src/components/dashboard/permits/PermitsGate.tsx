import { ReactNode } from 'react';
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
 */
export function PermitsGate({ children }: { children: ReactNode }) {
  const { isPlus, isLoading } = usePermitPathAccess();

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
    </div>
  );
}

export default PermitsGate;
