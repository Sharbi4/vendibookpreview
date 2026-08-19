/**
 * ProMemberBadge — small "Pro" chip for active Vendibook Pro members.
 *
 * Intentionally minimal and rendered only in the dashboard header area. This
 * does not replace or restyle verified-seller badges.
 */
import { Crown } from 'lucide-react';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';

const ProMemberBadge = ({ className = '' }: { className?: string }) => {
  const { tier, isLoading } = useHostEntitlements();
  if (isLoading || (tier !== 'pro' && tier !== 'premium')) return null;

  return (
    <span
      title="Vendibook Pro member"
      className={`inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary ring-1 ring-primary/25 ${className}`}
    >
      <Crown className="h-3 w-3" />
      Pro
    </span>
  );
};

export default ProMemberBadge;
