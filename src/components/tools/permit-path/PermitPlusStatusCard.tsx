/**
 * PermitPath Plus status + manage surface.
 *
 * Scoped strictly to the PermitPath Plus subscription via
 * `useSubscriptionManagement('permit_path_plus')` so cancelling here can never
 * touch a Vendibook Pro subscription. Pro members see a simple "included"
 * line and are never offered a separate PermitPath purchase or cancellation.
 */
import { CalendarClock, CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { usePermitPathAccess } from '@/hooks/usePermitPathAccess';
import {
  fmtSubDate,
  useSubscriptionManagement,
} from '@/hooks/useSubscriptionManagement';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { PERMIT_PLUS_SLUG } from '@/lib/permits/permitPathAccess';

export function PermitPlusStatusCard({ className }: { className?: string }) {
  const access = usePermitPathAccess();
  const price = useCatalogPrice(PERMIT_PLUS_SLUG);
  const {
    sub,
    hasSubscription,
    scheduledCancel,
    isPastDue,
    accessEndsAt,
    isLoading,
    busy,
    cancel,
    openBilling,
  } = useSubscriptionManagement('permit_path_plus');

  if (!access.isSignedIn || access.isLoading || isLoading) return null;
  // Basic users get the upsell panel elsewhere — nothing to manage here.
  if (!access.isPlus) return null;

  const shell =
    'rounded-3xl border border-stone-200 bg-white p-6 md:p-7 shadow-[0_10px_40px_-24px_rgba(28,25,23,0.35)]';

  // Pro / grandfathered / legacy purchase: access with nothing to bill.
  if (!hasSubscription) {
    const label =
      access.reason === 'included'
        ? 'Included with Vendibook Pro'
        : access.reason === 'grandfathered'
        ? 'Included — founding member'
        : 'Included with your purchase';
    return (
      <div className={`${shell} ${className ?? ''}`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-[hsl(var(--brand-ember))] mt-0.5 shrink-0" />
          <div>
            <div className="text-[15px] font-semibold text-stone-900">PermitPath Plus · {label}</div>
            <p className="text-sm text-stone-600 mt-1 leading-relaxed">
              Saving, tracking, documents and PDF export are switched on. There&apos;s no separate
              PermitPath subscription to manage.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusLine = isPastDue
    ? 'Payment issue — update your PayPal funding source to keep access.'
    : scheduledCancel
    ? `Cancelled — access continues through ${fmtSubDate(accessEndsAt)}.`
    : `Active — renews ${fmtSubDate(sub?.current_period_end ?? accessEndsAt)}.`;

  return (
    <div className={`${shell} ${className ?? ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-semibold mb-1.5">
            Your subscription
          </div>
          <div className="text-[17px] font-semibold text-stone-900 tracking-tight">
            PermitPath Plus · {price.labelWithCadence}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-stone-600 mt-1.5">
            <CalendarClock className="h-4 w-4 text-stone-400 shrink-0" />
            {statusLine}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9 text-xs border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
            onClick={() => { void openBilling(); }}
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Manage payment
          </Button>

          {!scheduledCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                  disabled={busy === 'cancel'}
                >
                  {busy === 'cancel' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cancel'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel PermitPath Plus?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Future renewals stop right away. Saving, tracking and PDF export stay available
                    through {fmtSubDate(sub?.current_period_end ?? accessEndsAt)}, and your saved
                    roadmaps are never deleted. This does not affect any other Vendibook membership.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Plus</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { void cancel(); }}>
                    Cancel subscription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}

export default PermitPlusStatusCard;
