import { CheckCircle2, AlertTriangle, Loader2, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';

/**
 * Compact "PayPal Ready" status indicator for sellers.
 * Shows connected/ready vs not connected at a glance, driven by real
 * seller_paypal_accounts state. Hidden entirely for pure buyers.
 */
export function PayPalReadyBadge({
  tone = 'light',
  showDetails = false,
}: {
  /** 'dark' for the charcoal PayPal module, 'light' for ivory surfaces */
  tone?: 'light' | 'dark';
  showDetails?: boolean;
}) {
  const { connection, status, isReady, isLoading, isRefreshing, lastRefreshError } = useMyPayPalConnection();

  if (isLoading || (isRefreshing && !connection)) {
    return (
      <span className={`v2-paypal-badge is-loading ${tone === 'dark' ? 'on-dark' : ''}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking PayPal…
      </span>
    );
  }

  if (isReady) {
    return (
      <span className={`v2-paypal-badge is-ready ${tone === 'dark' ? 'on-dark' : ''}`}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        PayPal Ready
        {showDetails && connection?.paypal_email ? (
          <span className="v2-paypal-badge-detail">{connection.paypal_email}</span>
        ) : null}
      </span>
    );
  }

  if (lastRefreshError) {
    return (
      <Link
        to="/dashboard/payments/setup"
        className={`v2-paypal-badge is-warn ${tone === 'dark' ? 'on-dark' : ''}`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        PayPal check failed — retry
      </Link>
    );
  }

  if (status === 'action_required' || status === 'revoked') {
    return (
      <Link
        to="/dashboard/payments/setup"
        className={`v2-paypal-badge is-warn ${tone === 'dark' ? 'on-dark' : ''}`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {status === 'revoked' ? 'PayPal access revoked' : 'PayPal action required'}
      </Link>
    );
  }

  if (status === 'link_sent' || status === 'onboarding') {
    return (
      <Link
        to="/dashboard/payments/setup"
        className={`v2-paypal-badge is-pending ${tone === 'dark' ? 'on-dark' : ''}`}
      >
        <Loader2 className="h-3.5 w-3.5" />
        PayPal setup in progress
      </Link>
    );
  }

  return (
    <Link
      to="/dashboard/payments/setup"
      className={`v2-paypal-badge is-off ${tone === 'dark' ? 'on-dark' : ''}`}
    >
      <Link2 className="h-3.5 w-3.5" />
      PayPal not connected
    </Link>
  );
}

export default PayPalReadyBadge;
