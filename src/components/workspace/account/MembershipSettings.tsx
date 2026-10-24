import FeaturedSubscriptions from '@/components/account/FeaturedSubscriptions';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { StatusPill, ws } from '@/components/workspace/ui';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { useSubscriptionManagement, fmtSubDate } from '@/hooks/useSubscriptionManagement';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';
import { SettingsRow, SettingsSection, rowActionCls } from './SettingsKit';

const PROVIDER_NAME = { paypal: 'PayPal', square: 'Square', legacy: 'a legacy plan', none: '' } as const;

/**
 * Membership rows for the Account hub. Plan and dates come from
 * useHostEntitlements; cancel and billing use the same useSubscriptionManagement
 * handlers as MembershipSummaryCard (edge functions unchanged).
 */
export default function MembershipSettings({ id = 'membership' }: { id?: string }) {
  const plan = useHostEntitlements();
  const m = useSubscriptionManagement();
  const proPrice = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.vendibookPro);

  const loading = plan.isLoading || m.isLoading;
  const paid = plan.tier !== 'free';
  const ending = plan.cancelAtPeriodEnd || m.scheduledCancel;
  const endsAt = m.accessEndsAt ?? plan.currentPeriodEnd;

  const status = loading ? null : paid ? (
    <StatusPill tone={plan.isPastDue ? 'warn' : ending ? 'muted' : 'ok'}>
      {plan.isPastDue ? 'Payment failed' : ending ? 'Ending' : 'Active'}
    </StatusPill>
  ) : null;

  const planHint = loading ? undefined : paid
    ? endsAt ? `${ending ? 'Access ends' : 'Renews'} ${fmtSubDate(endsAt)}` : undefined
    : `Vendibook Pro is ${proPrice.labelWithCadence}. BuyerMatch looks for buyers for your sale listings, plus a Featured Boost credit each billing period.`;

  return (
    <SettingsSection
      id={id}
      title="Membership"
      description="Your Vendibook plan and platform purchases."
      footer={!loading && !paid ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] leading-5 text-[#8A847B]">No buyer, offer or sale is guaranteed. Cancel any time.</p>
          <Button asChild variant="cta" className={ws.cta}>
            <Link to="/pricing">See Vendibook Pro</Link>
          </Button>
        </div>
      ) : undefined}
    >
      <SettingsRow
        label="Plan"
        status={status}
        value={loading ? <span className={ws.skeleton + ' block h-4 w-28'} aria-label="Loading plan" /> : paid ? plan.planLabel : 'Free'}
        hint={planHint}
        action={!loading && paid ? { label: 'Manage', to: '/account/subscription' } : undefined}
      >
        {!loading && plan.isPastDue && (
          <p role="alert" className="mt-2 text-[12.5px] font-medium leading-5 text-[#7A4F00]">
            Your last membership payment failed. Update your payment method to keep your plan active.
          </p>
        )}
      </SettingsRow>

      {!loading && m.hasSubscription && (
        <SettingsRow
          label="Billing"
          value={`Billed through ${PROVIDER_NAME[m.provider]}`}
          action={
            <button type="button" className={rowActionCls} onClick={() => void m.openBilling()} disabled={m.busy === 'portal'}>
              {m.busy === 'portal' ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Opening…</> : m.provider === 'paypal' ? 'Manage in PayPal' : 'Billing details'}
            </button>
          }
        />
      )}

      {!loading && m.hasSubscription && m.canReactivate && (
        <SettingsRow
          label="Resume membership"
          value="Keep your plan after the current period."
          action={
            <button type="button" className={rowActionCls} onClick={() => void m.reactivate()} disabled={m.busy !== null}>
              {m.busy === 'reactivate' ? 'Resuming…' : 'Resume'}
            </button>
          }
        />
      )}

      {!loading && m.hasSubscription && !m.scheduledCancel && !m.canReactivate && (
        <SettingsRow
          label="Cancel membership"
          value="Your plan stays active until the end of the period you paid for."
          muted
          action={
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className={rowActionCls} disabled={m.busy !== null}>
                  {m.busy === 'cancel' ? 'Cancelling…' : 'Cancel'}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your membership?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your {plan.planLabel} plan stays active until{' '}
                    <strong>{fmtSubDate(m.sub?.current_period_end)}</strong>. After that
                    your account returns to the free tier.
                    {m.provider === 'paypal'
                      ? ' Future PayPal billing stops immediately. You can resubscribe any time.'
                      : ' You can resume any time before then.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep plan</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void m.cancel()}>
                    {m.provider === 'paypal' ? 'Cancel membership' : 'Schedule cancellation'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          }
        />
      )}

      {!loading && paid && (
        <SettingsRow label="BuyerMatch" value="Buyer matches for your sale listings." action={{ label: 'Open', to: '/dashboard/buyermatch' }} />
      )}

      <SettingsRow label="Plans, boosts & services" value="Receipts for platform purchases." action={{ label: 'View', to: '/account/purchases' }} />
      <FeaturedSubscriptions />
    </SettingsSection>
  );
}
