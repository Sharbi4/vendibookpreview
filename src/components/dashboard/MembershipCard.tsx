/**
 * MembershipCard — the single Vendibook Pro membership surface on the dashboard.
 *
 * Styling matches the redesigned for-sale pages: the `.sale-light` scope gives
 * a warm off-white canvas, white card, charcoal type, soft gray hairlines and
 * restrained shadow. Orange is reserved for the primary action/accent.
 *
 * No money logic lives here:
 *   - price/cadence come from the monetization catalog (`useCatalogPrice`)
 *   - status/dates come from `host_subscriptions` (PayPal webhook mirror)
 *   - cancellation reuses the existing `useSubscriptionManagement().cancel`
 *     (PayPal lifecycle) — there is no second cancellation path.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown, CalendarClock, Percent, Rocket, Loader2, ExternalLink, ArrowRight, AlertTriangle,
  CheckCircle2, ClipboardCheck, Gauge, LineChart, Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { useProBoostCredit } from '@/hooks/useProBoostCredit';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return '—';
  }
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <section
    aria-label="Membership"
    className="sale-light rounded-3xl border border-[rgba(24,20,16,0.09)] p-5 sm:p-7 shadow-[0_1px_2px_rgba(24,20,16,0.04),0_16px_40px_-28px_rgba(24,20,16,0.4)]"
  >
    {children}
  </section>
);

const MembershipCard = () => {
  const {
    tier, planLabel, status, currentPeriodEnd, currentPeriodStart,
    cancelAtPeriodEnd, isPastDue, isLoading,
  } = useHostEntitlements();
  const { sub, provider, accessEndsAt, busy, cancel, openBilling } = useSubscriptionManagement();
  const { data: boostCredit, isLoading: creditLoading } = useProBoostCredit();
  const proPrice = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.vendibookPro);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelledOn, setCancelledOn] = useState<string | null>(null);

  if (isLoading) return null;

  const isPro = tier === 'pro' || tier === 'premium';
  const endsOn = accessEndsAt ?? currentPeriodEnd;

  // ---------- Free ----------
  if (!isPro) {
    return (
      <Shell>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Membership
            </p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-foreground">
              You&apos;re on Free
            </h2>
            <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-muted-foreground">
              Vendibook Pro lowers your seller/host fee to 10.9%, includes a monthly Featured Boost
              credit, and unlocks the premium tools — {proPrice.labelWithCadence}. Cancel anytime.
            </p>
          </div>
          <Button asChild variant="cta" className="shrink-0">
            <Link to="/pricing">
              Upgrade to Vendibook Pro
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  // ---------- Pro ----------
  const boostState = creditLoading
    ? 'Checking…'
    : boostCredit
    ? '1 available this period'
    : endsOn
    ? `Used this period — renews ${fmtDate(endsOn)}`
    : 'Used this period';

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Membership
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-primary ring-1 ring-primary/25">
              <Crown className="h-3.5 w-3.5" />
              Vendibook Pro
            </span>
            <span className="text-[14px] text-muted-foreground">{planLabel}</span>
          </div>
          <p className="mt-2 text-[15px] font-semibold text-foreground">
            {proPrice.labelWithCadence}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span
            className={
              isPastDue
                ? 'inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-3 py-1 text-[12px] font-semibold text-amber-700 ring-1 ring-amber-500/25'
                : cancelAtPeriodEnd
                ? 'inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[12px] font-semibold text-muted-foreground ring-1 ring-[rgba(24,20,16,0.09)]'
                : 'inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-500/25'
            }
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isPastDue ? 'Payment issue' : cancelAtPeriodEnd ? 'Cancels at period end' : 'Active'}
          </span>
          {status && !isPastDue && (
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Billed monthly via PayPal
            </p>
          )}
        </div>
      </div>

      {/* Billing dates */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[rgba(24,20,16,0.09)] bg-card px-4 py-3.5">
          <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            Current period started
          </p>
          <p className="mt-1.5 text-[15px] font-semibold text-foreground">
            {fmtDate(currentPeriodStart)}
          </p>
        </div>
        <div className="rounded-2xl border border-[rgba(24,20,16,0.09)] bg-card px-4 py-3.5">
          <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            {cancelAtPeriodEnd ? 'Access through' : 'Next billing date'}
          </p>
          <p className="mt-1.5 text-[15px] font-semibold text-foreground">{fmtDate(endsOn)}</p>
        </div>
      </div>

      {cancelAtPeriodEnd && (
        <div className="mt-5 rounded-2xl border border-[rgba(24,20,16,0.09)] bg-secondary/60 px-4 py-3 text-[13.5px] text-foreground">
          Cancels on <strong>{fmtDate(endsOn)}</strong> — Pro benefits remain active until then.
        </div>
      )}

      {cancelledOn && !cancelAtPeriodEnd && (
        <div className="mt-5 rounded-2xl border border-[rgba(24,20,16,0.09)] bg-secondary/60 px-4 py-3 text-[13.5px] text-foreground">
          Cancellation confirmed. No future renewals — your Pro benefits stay active through{' '}
          <strong>{fmtDate(cancelledOn)}</strong>.
        </div>
      )}

      {isPastDue && (
        <div className="mt-5 flex gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[13.5px] text-amber-800">
            We couldn&apos;t collect your last payment. Update your funding source in PayPal to keep
            Pro benefits active.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[rgba(24,20,16,0.09)] bg-card px-4 py-4">
          <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Percent className="h-3.5 w-3.5 text-primary" />
            Your fee benefit
          </p>
          <p className="mt-2 text-[15px] font-semibold text-foreground">
            10.9% seller/host fee
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Instead of 12.9% — up to $500 saved per transaction.
          </p>
        </div>

        <div className="rounded-2xl border border-[rgba(24,20,16,0.09)] bg-card px-4 py-4">
          <p className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Rocket className="h-3.5 w-3.5 text-primary" />
            Featured Boost credit
          </p>
          <p className="mt-2 text-[15px] font-semibold text-foreground">{boostState}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            One credit per billing period. Credits don&apos;t roll over.
          </p>
        </div>
      </div>

      {/* Included entitlements */}
      <div className="mt-6 rounded-2xl border border-[rgba(24,20,16,0.09)] bg-card px-4 py-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Included with your membership
        </p>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {[
            { icon: ClipboardCheck, label: 'PermitPath Plus', detail: 'Save, track & export permit roadmaps' },
            { icon: LineChart, label: 'Advanced analytics', detail: 'Listing performance & demand insights' },
            { icon: Gauge, label: 'Priority placement', detail: 'Higher visibility in search results' },
            { icon: Headphones, label: 'Priority support', detail: 'Faster response from the Vendibook team' },
          ].map(({ icon: Icon, label, detail }) => (
            <li key={label} className="flex gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-foreground">{label}</span>
                <span className="block text-[12.5px] text-muted-foreground">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <Button asChild variant="cta">
          <Link to="/account/subscription">Manage membership</Link>
        </Button>
        {provider === 'paypal' && (
          <Button variant="cta-outline" onClick={openBilling} disabled={busy === 'portal'}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Payment method
          </Button>
        )}
        {!cancelAtPeriodEnd && sub?.status !== 'canceled' && (
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setConfirmOpen(true)}
            disabled={busy !== null}
          >
            {busy === 'cancel' ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Cancelling…
              </>
            ) : (
              'Cancel membership'
            )}
          </Button>
        )}
      </div>

      <p className="mt-3 text-[12.5px] text-muted-foreground">
        Cancel anytime. Cancelling stops future renewals only — your benefits stay active through
        the end of the period you&apos;ve already paid for.
      </p>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Vendibook Pro?</AlertDialogTitle>
            <AlertDialogDescription>
              Future renewals stop right away. You keep the 10.9% fee benefit, your Featured Boost
              credit, and premium tools through <strong>{fmtDate(endsOn)}</strong>. After that your
              account returns to Free — nothing is deleted and you can rejoin anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my membership</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const through = endsOn;
                await cancel();
                setCancelledOn(through ?? null);
              }}
            >
              Cancel membership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
};

export default MembershipCard;
