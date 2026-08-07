import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, CheckCircle2, CreditCard, ShieldCheck, BadgeCheck, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePaymentsTransition } from '@/hooks/usePaymentsTransition';
import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { GetVerifiedButton } from '@/components/verification/GetVerifiedButton';

const PANEL =
  'rounded-2xl border-2 border-white/12 bg-[linear-gradient(140deg,#101014_0%,#08080a_60%,#15151b_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]';

/**
 * One-time login notice for sellers who previously accepted card payments.
 * Purely informational: listings stay live and nothing here blocks
 * publication, checkout, or payouts.
 */
export function PaymentsTransitionModal() {
  const { isLoading, isEligible, acknowledged, membership, acknowledge } = usePaymentsTransition();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isEligible && !acknowledged) setOpen(true);
  }, [isLoading, isEligible, acknowledged]);

  const close = async () => {
    setOpen(false);
    await acknowledge();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) void close(); }}>
      <DialogContent className="max-w-xl border-2 border-white/12 bg-[#08080a]/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 ring-1 ring-primary/25 flex items-center justify-center">
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-2.5">
              <PayPalMonogram className="h-6" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Payments partner
              </span>
            </div>
          </div>
          <DialogTitle className="text-lg">
            Vendibook payments are now powered by PayPal.
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Your listings stay live exactly as they are. Stripe is no longer used on Vendibook.
            Financing is provided by Equinox Funding LLC.
          </DialogDescription>
        </DialogHeader>

        <div className={`${PANEL} p-4 space-y-3 text-sm`}>
          <div className="flex items-start gap-2.5">
            <CreditCard className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              Supported buyer payments run through PayPal checkout.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Banknote className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              You choose how you get paid: PayPal, Venmo, Cash App, or ACH. Vendibook reviews and
              sends seller payouts manually.
            </p>
          </div>
          {membership === 'all_set' && (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">You&rsquo;re all set</span> &mdash;
                your membership is already billing through PayPal.
              </p>
            </div>
          )}
          {membership === 'needs_paypal_authorization' && (
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-muted-foreground leading-relaxed">
                Your paid membership still bills through the old card processor. Please authorize
                PayPal billing by <span className="text-foreground font-medium">August 31, 2026</span>{' '}
                so your paid benefits continue on September 1. Your listings stay live either way &mdash;
                only paid benefits would pause.
              </p>
            </div>
          )}
        </div>

        {/* Upgrade options */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Optional upgrades for your listings
          </p>

          <div className={`${PANEL} p-4`}>
            <div className="flex items-start gap-3">
              <span className="verified-metallic flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <BadgeCheck className="h-4.5 w-4.5" strokeWidth={2.4} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Stand out as a Verified Seller
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Add a green Identity Verified badge to your profile and every active listing. One-time fee. Not a subscription, never required.
                </p>
                <div className="mt-3">
                  <GetVerifiedButton size="sm" showPrice />
                </div>
              </div>
            </div>
          </div>

          <div className={`${PANEL} p-4`}>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
                <TrendingUp className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <EquinoxFundingLogo className="h-5" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Funding partner
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Offer financing on your equipment listings
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Equinox Funding LLC provides business loans & equipment financing from $2.5K – $25M. Add a financing option to eligible sale listings.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="glass-cta" asChild className="rounded-md">
                    <Link to="/dashboard?view=host" onClick={() => void close()}>
                      Add to your listing
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild className="rounded-md">
                    <Link to="/financing" onClick={() => void close()}>
                      Learn more
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => void close()}>
            Not now
          </Button>
          <Button asChild onClick={() => void close()}>
            <Link to="/dashboard?view=host&tab=payouts">Review payment &amp; financing options</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PaymentsTransitionModal;
