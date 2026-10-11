import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import { usePaymentsTransition } from '@/hooks/usePaymentsTransition';

/**
 * Compact post-dismissal reminder. Shows ONLY while a real action remains:
 * a missing payout preference, or a legacy membership that still needs PayPal
 * authorization. Never blocks anything.
 */
export function PaymentsTransitionReminder() {
  const { isLoading, acknowledged, needsFollowUp, hasPayoutPreference, membership } =
    usePaymentsTransition();

  if (isLoading || !acknowledged || !needsFollowUp) return null;

  const message = !hasPayoutPreference
    ? 'Vendibook payments run on PayPal. Add your payout preference (PayPal, Venmo, Cash App, or ACH) so we know where to send your proceeds.'
    : 'Authorize PayPal billing for your membership by August 31, 2026 so your paid benefits continue on September 1. Your listings stay live.';

  const to = !hasPayoutPreference
    ? '/dashboard?view=host&tab=payouts'
    : '/account/subscription';

  return (
    <Link
      to={to}
      className="group relative flex items-center gap-3 rounded-2xl border-2 border-white/12 bg-[linear-gradient(140deg,#101014_0%,#08080a_60%,#15151b_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:border-white/20"
    >
      <span className="shrink-0 w-8 h-8 rounded-full bg-white/[0.06] ring-1 ring-white/15 flex items-center justify-center">
        <PayPalMonogram className="h-4" />
      </span>
      <p className="min-w-0 flex-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        {message}
      </p>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
      <span className="sr-only">
        {membership === 'needs_paypal_authorization' ? 'Review membership' : 'Add payout details'}
      </span>
    </Link>
  );
}

export default PaymentsTransitionReminder;
