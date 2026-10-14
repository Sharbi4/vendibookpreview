import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel, StatusPill, ws, type StatusTone } from '@/components/workspace/ui';
import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { PAYOUT_METHOD_LABEL, PAYOUT_STATUS_LABEL, type PayoutPreferenceStatus } from '@/lib/payouts/methods';
import { supabase } from '@/integrations/supabase/client';
import { PayPalReadyBadge } from '@/components/workspace/PayPalReadyBadge';

const PREF_TONE: Record<PayoutPreferenceStatus, StatusTone> = {
  not_set: 'muted',
  pending_review: 'warn',
  verified: 'ok',
  needs_attention: 'alert',
};

interface SquareStatus {
  available: boolean;
  connection: { status: 'active' | 'needs_reconnect' | 'revoked'; business_name: string | null } | null;
}

/**
 * Read-only Square connection status: the same `status` request the Square
 * card on Payment setup makes when it opens. Connecting and disconnecting stay
 * on that page.
 */
function useSquareStatus() {
  return useQuery({
    queryKey: ['square-seller-status'],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<SquareStatus> => {
      const { data, error } = await supabase.functions.invoke('square-seller-oauth', { body: { action: 'status' } });
      if (error) throw error;
      return { available: Boolean(data?.available), connection: data?.connection ?? null };
    },
  });
}

function Row({ label, detail, status, action }: { label: string; detail: ReactNode; status: ReactNode; action?: ReactNode }) {
  return (
    <li className="flex flex-col gap-2 px-5 py-4 sm:px-6 md:py-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <span className="text-[14px] font-semibold text-[#1C1B1A]">{label}</span>
        <span className="shrink-0">{status}</span>
      </div>
      <p className="text-[13px] leading-5 text-[#8A847B]">{detail}</p>
      {action && <div className="pt-0.5">{action}</div>}
    </li>
  );
}

/** Where payouts go and which payment accounts are connected, with one clear next step. */
export default function PayoutMethodPanel() {
  const { preference, isLoading } = usePayoutPreference();
  const paypal = useMyPayPalConnection();
  const square = useSquareStatus();

  const sq = square.data?.connection;
  const squarePill: { tone: StatusTone; label: string } = square.isLoading
    ? { tone: 'muted', label: 'Checking…' }
    : square.isError
      ? { tone: 'muted', label: 'Status unavailable' }
      : sq?.status === 'active'
        ? { tone: 'ok', label: 'Connected' }
        : sq?.status === 'needs_reconnect'
          ? { tone: 'alert', label: 'Reconnect needed' }
          : !square.data?.available
            ? { tone: 'muted', label: 'Opening soon' }
            : { tone: 'neutral', label: 'Not connected' };

  const needsDestination = !isLoading && !preference;

  return (
    <Panel
      title="Payout method"
      description="Where Vendibook sends your payouts, and the accounts buyers pay through."
      flush
      footer={
        needsDestination ? (
          <Button asChild variant="cta" className={ws.cta}>
            <Link to="/dashboard/account/payouts">Add payout details</Link>
          </Button>
        ) : (
          <Link to="/dashboard/payments/setup" className={ws.actionLink}>
            Payment setup <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        )
      }
    >
      <ul className="grid divide-y divide-[#F1ECE5] md:grid-cols-3 md:divide-x md:divide-y-0">
        <Row
          label="Payout destination"
          status={
            isLoading ? (
              <span className={ws.skeleton + ' block h-5 w-20'} />
            ) : preference ? (
              <StatusPill tone={PREF_TONE[preference.status]}>{PAYOUT_STATUS_LABEL[preference.status]}</StatusPill>
            ) : (
              <StatusPill tone="warn">Not added</StatusPill>
            )
          }
          detail={
            preference
              ? `${PAYOUT_METHOD_LABEL[preference.method]}${preference.masked_destination ? ` · ${preference.masked_destination}` : ''}. Our team reviews and sends each payout here.`
              : 'Choose PayPal, Venmo, Cash App or bank transfer (ACH). You need this before requesting a payout.'
          }
          action={preference ? <Link to="/dashboard/account/payouts" className={ws.link}>Update payout details</Link> : undefined}
        />
        <Row
          label="PayPal Business · equipment sales"
          status={
            // Sales checkout is paused, so "not connected" is not something to fix:
            // show the real state only when a connection exists or needs attention.
            paypal.isReady || paypal.isLoading || paypal.connection ? <PayPalReadyBadge /> : <StatusPill tone="muted">Not needed yet</StatusPill>
          }
          detail={
            paypal.isReady
              ? paypal.connection?.paypal_email
                ? `Connected as ${paypal.connection.paypal_email}.`
                : 'Your PayPal Business account is connected.'
              : 'Online payment for equipment sales is paused, so no PayPal connection is needed right now.'
          }
        />
        <Row
          label="Square · rental card payments"
          status={<StatusPill tone={squarePill.tone}>{squarePill.label}</StatusPill>}
          detail={
            sq?.status === 'active'
              ? `Renters pay ${sq.business_name || 'your Square account'} by card. Transfers follow your Square payout schedule.`
              : 'Connect Square so renters pay you directly by card. Without it, your rental proceeds are recorded here for payout review.'
          }
          action={
            <Link to="/dashboard/payments/setup" className={ws.link}>
              {sq?.status === 'active' ? 'Manage Square' : sq?.status === 'needs_reconnect' ? 'Reconnect Square' : 'Set up Square'}
            </Link>
          }
        />
      </ul>
    </Panel>
  );
}
