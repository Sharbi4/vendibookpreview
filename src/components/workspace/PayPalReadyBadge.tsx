import { Link } from 'react-router-dom';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { StatusPill, type StatusTone } from '@/components/workspace/ui';
import { cn } from '@/lib/utils';

/**
 * Compact "PayPal Ready" status indicator for sellers.
 * Shows connected/ready vs not connected at a glance, driven by real
 * seller_paypal_accounts state. States that need a step link to Payment setup.
 */
export function PayPalReadyBadge({
  tone = 'light',
  showDetails = false,
}: {
  /** 'dark' for charcoal surfaces, 'light' for white and ivory surfaces */
  tone?: 'light' | 'dark';
  showDetails?: boolean;
}) {
  const { connection, status, isReady, isLoading, isRefreshing, lastRefreshError } = useMyPayPalConnection();
  // On charcoal the tinted pills keep their own background, so text stays readable;
  // the ring just separates the pill from the surface.
  const onDark = tone === 'dark' ? 'ring-1 ring-inset ring-white/15' : undefined;

  const linked = (pillTone: StatusTone, label: string) => (
    <Link
      to="/dashboard/payments/setup"
      className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A]"
    >
      <StatusPill tone={pillTone} className={cn('hover:brightness-95', onDark)}>{label}</StatusPill>
    </Link>
  );

  if (isLoading || (isRefreshing && !connection)) {
    return <StatusPill tone="muted" className={onDark}>Checking PayPal…</StatusPill>;
  }

  if (isReady) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <StatusPill tone="ok" className={onDark}>PayPal Ready</StatusPill>
        {showDetails && connection?.paypal_email ? (
          <span className={cn('text-[12.5px]', tone === 'dark' ? 'text-white/70' : 'text-[#8A847B]')}>{connection.paypal_email}</span>
        ) : null}
      </span>
    );
  }

  if (lastRefreshError) return linked('warn', 'PayPal check failed, retry');
  if (status === 'action_required' || status === 'revoked') {
    return linked('alert', status === 'revoked' ? 'PayPal access revoked' : 'PayPal action required');
  }
  if (status === 'link_sent' || status === 'onboarding') return linked('warn', 'PayPal setup in progress');
  return linked('muted', 'PayPal not connected');
}

export default PayPalReadyBadge;
