import { useState } from 'react';
import { BadgeCheck, ChevronRight, Clock, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSellerVerification } from '@/hooks/useSellerVerification';
import VerifiedSellerDialog from './VerifiedSellerDialog';
import { IDENTITY_VERIFIED_DISCLOSURE } from './IdentityVerifiedBadge';
import { cn } from '@/lib/utils';

type Variant = 'card' | 'compact' | 'success';

interface VerifiedSellerCTAProps {
  /** card = dashboard hero, compact = improve listing, success = post-publish */
  variant?: Variant;
  className?: string;
}

/**
 * Optional Verified Seller offer.
 *
 * Never blocks signup, publishing, editing or buyer access, and never shows a
 * negative "unverified" state — sellers who haven't bought it simply see an
 * invitation, and verified sellers see their badge state instead.
 */
const VerifiedSellerCTA = ({ variant = 'card', className }: VerifiedSellerCTAProps) => {
  const [open, setOpen] = useState(false);
  const v = useSellerVerification();

  // Hidden entirely while loading or when the offer is switched off.
  if (!v.state || v.offer.enabled === false) return null;

  const verified = v.state.badge_active;
  const pending = v.state.status === 'pending_review';
  const inProgress = v.state.status === 'identity_in_progress';
  const paymentOnly = v.state.needs_payment_only;

  const verifiedDate = v.state.verified_at
    ? new Date(v.state.verified_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const ctaLabel = paymentOnly
    ? 'Complete payment'
    : inProgress
    ? 'Resume verification'
    : `Get Verified — ${v.offer.display_price} one time`;

  const openDialog = () => setOpen(true);

  // -------------------------------------------------------------- compact
  if (variant === 'compact') {
    return (
      <>
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 p-3',
            className,
          )}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <ShieldCheck
              className={cn('h-4 w-4 mt-0.5 shrink-0', verified ? 'text-emerald-500' : 'text-muted-foreground')}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {verified ? 'Identity Verified' : 'Stand out as a Verified Seller'}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {verified
                  ? `Verified${verifiedDate ? ` on ${verifiedDate}` : ''} — your badge shows on every active listing.`
                  : 'Add an Identity Verified badge to your profile and active listings.'}
              </p>
            </div>
          </div>
          {!verified && (
            <Button size="sm" variant="outline" onClick={openDialog} className="shrink-0 min-h-11">
              {paymentOnly ? 'Complete payment' : v.offer.display_price}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
        <VerifiedSellerDialog open={open} onOpenChange={setOpen} onVerified={() => v.refresh()} />
      </>
    );
  }

  // -------------------------------------------------------------- success
  if (variant === 'success') {
    if (verified) return null;
    return (
      <>
        <div
          className={cn(
            'rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4',
            className,
          )}
        >
          <div className="flex items-start gap-3">
            <span className="verified-metallic flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <BadgeCheck className="h-4.5 w-4.5" strokeWidth={2.4} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Stand out as a Verified Seller
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Confirm your identity through Plaid and add an Identity Verified badge to your
                seller profile and active listings. Help buyers feel more confident and help your
                listings stand out.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={openDialog}
                className="mt-3 min-h-11 border-emerald-500/40"
              >
                {ctaLabel}
              </Button>
            </div>
          </div>
        </div>
        <VerifiedSellerDialog open={open} onOpenChange={setOpen} onVerified={() => v.refresh()} />
      </>
    );
  }

  // ----------------------------------------------------------------- card
  return (
    <>
      <section
        aria-labelledby="verified-seller-heading"
        className={cn(
          'relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-card/70 p-5 backdrop-blur-sm',
          className,
        )}
      >
        <div className="verified-sheen" aria-hidden="true" />

        <div className="relative flex items-start gap-3">
          <span className="verified-metallic flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <BadgeCheck className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h3 id="verified-seller-heading" className="text-base font-semibold text-foreground">
              {verified ? 'Identity Verified' : 'Stand out as a Verified Seller'}
            </h3>

            {verified ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Your badge is live on your seller profile and every active listing
                {verifiedDate ? ` — verified on ${verifiedDate}` : ''}.
              </p>
            ) : pending ? (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Your identity check is under review. Nothing has been charged.
              </p>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Confirm your identity through Plaid and add an Identity Verified badge to your
                seller profile and active listings. Help buyers feel more confident and help your
                listings stand out.
              </p>
            )}

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
              {IDENTITY_VERIFIED_DISCLOSURE}
            </p>

            {!verified && !pending && (
              <Button
                onClick={openDialog}
                disabled={v.busy}
                className="verified-cta mt-4 min-h-11 w-full sm:w-auto"
              >
                {v.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : paymentOnly ? (
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                )}
                {ctaLabel}
              </Button>
            )}
          </div>
        </div>
      </section>

      <VerifiedSellerDialog open={open} onOpenChange={setOpen} onVerified={() => v.refresh()} />
    </>
  );
};

export default VerifiedSellerCTA;
