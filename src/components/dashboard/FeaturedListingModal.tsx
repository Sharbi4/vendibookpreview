import { useEffect, useState } from 'react';
import { Flame, TrendingUp, Eye, Award, ShieldCheck, Star, ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import PayPalPaymentPanel from '@/components/checkout/PayPalPaymentPanel';
import { useProBoostCredit, useRedeemProBoostCredit } from '@/hooks/useProBoostCredit';
import { toast } from 'sonner';
import BoostPaymentStatus, {
  useBoostActivation,
  type BoostPaymentStage,
} from '@/components/dashboard/BoostPaymentStatus';

interface FeaturedListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
}

const benefits = [
  {
    icon: TrendingUp,
    title: '3× more visibility',
    description: 'Featured listings sit at the top of search and category pages.',
  },
  {
    icon: Eye,
    title: 'Front-page Featured rail',
    description: 'Premium placement on the homepage discovery shelf.',
  },
  {
    icon: Award,
    title: '30 days of exposure',
    description: 'Your listing stays boosted for a full month.',
  },
  {
    icon: Star,
    title: 'Featured badge',
    description: 'A distinctive badge on every card and detail page.',
  },
];

type Step = 'overview' | 'pay' | 'status';

export const FeaturedListingModal = ({
  open,
  onOpenChange,
  listingId,
  listingTitle,
}: FeaturedListingModalProps) => {
  const [step, setStep] = useState<Step>('overview');
  const [stage, setStage] = useState<BoostPaymentStage>('authorized');
  const queryClient = useQueryClient();
  const { data: boostCredit } = useProBoostCredit();
  const redeemCredit = useRedeemProBoostCredit();

  // Reset the flow whenever the modal is dismissed.
  useEffect(() => {
    if (!open) {
      setStep('overview');
      setStage('authorized');
    }
  }, [open]);

  const { promo, timedOut } = useBoostActivation(listingId, step === 'status' && stage !== 'review');

  useEffect(() => {
    if (promo && stage !== 'review') {
      setStage('confirmed');
      queryClient.invalidateQueries({ queryKey: ['boost-history'] });
      queryClient.invalidateQueries({ queryKey: ['host-listings'] });
    }
  }, [promo, stage, queryClient]);

  useEffect(() => {
    if (timedOut && stage === 'authorized') setStage('review');
  }, [timedOut, stage]);

  return (
    <>
      <Dialog open={open && step !== 'pay'} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg overflow-hidden rounded-2xl border border-white/12 bg-[#08080a]/95 backdrop-blur-2xl p-0 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
          {/* Ember glow wash */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(60%_100%_at_50%_0%,hsl(14,100%,57%,0.22),transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_35%,rgba(255,255,255,0.05)_50%,transparent_65%)]"
          />

          <div className="relative p-6">
            {step === 'status' ? (
              <>
                <DialogHeader className="sr-only">
                  <DialogTitle>Boost payment status</DialogTitle>
                  <DialogDescription>
                    Live status of your Featured Boost payment.
                  </DialogDescription>
                </DialogHeader>
                <BoostPaymentStatus
                  listingTitle={listingTitle}
                  stage={stage}
                  promo={promo}
                  onDone={() => onOpenChange(false)}
                />
              </>
            ) : (
              <>
                <DialogHeader className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-[hsl(14,100%,57%)]/12 ring-1 ring-[hsl(14,100%,57%)]/35 flex items-center justify-center shadow-[0_0_30px_-10px_hsl(14,100%,57%)]">
                      <Flame className="h-5 w-5 text-[hsl(14,100%,62%)]" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Featured boost · 30 days
                    </span>
                  </div>
                  <DialogTitle className="text-2xl font-semibold tracking-tight">
                    Put this listing in front of more buyers
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    Boost <span className="text-foreground">“{listingTitle}”</span> to the top of
                    search, category pages, and the homepage Featured rail.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-5 grid gap-2.5">
                  {benefits.map((benefit) => (
                    <div
                      key={benefit.title}
                      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(14,100%,57%)]/10 ring-1 ring-[hsl(14,100%,57%)]/25">
                        <benefit.icon className="h-4 w-4 text-[hsl(14,100%,62%)]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-foreground">{benefit.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {boostCredit ? (
                  <div className="mt-5 rounded-2xl border border-[hsl(14,100%,57%)]/35 bg-[hsl(14,100%,57%)]/[0.07] p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs uppercase tracking-[0.16em] text-[hsl(14,100%,72%)]">
                        Vendibook Pro · included this month
                      </span>
                      <span className="text-2xl font-semibold tracking-tight text-foreground">$0</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Your membership includes one Featured Boost each billing period. This credit
                      expires{' '}
                      {new Date(boostCredit.period_end).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      and doesn’t roll over.
                    </p>
                    <Button
                      variant="cta"
                      className="mt-4 h-12 w-full rounded-xl text-base"
                      disabled={redeemCredit.isPending}
                      onClick={() => {
                        redeemCredit.mutate(listingId, {
                          onSuccess: () => {
                            setStage('authorized');
                            setStep('status');
                          },
                          onError: (err) =>
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : 'We couldn’t apply your boost credit.',
                            ),
                        });
                      }}
                    >
                      <Flame className="mr-2 h-4 w-4" />
                      {redeemCredit.isPending ? 'Applying your credit…' : 'Use my included boost'}
                    </Button>
                  </div>
                ) : null}

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {boostCredit ? 'Or pay once · 30 days' : 'One-time · 30 days'}
                    </span>
                    <span className="text-3xl font-semibold tracking-tight text-foreground">
                      $30
                    </span>
                  </div>

                  <Button
                    variant="dark-shine"
                    className="mt-4 h-12 w-full rounded-xl text-base"
                    onClick={() => setStep('pay')}
                  >
                    <Flame className="mr-2 h-4 w-4" />
                    Continue to PayPal checkout
                  </Button>

                  <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                    <PayPalMonogram className="h-4" />
                    <span>Payments by PayPal</span>
                    <span className="text-white/20">·</span>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Secure checkout</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {open && step === 'pay' ? (
        <PayPalPaymentPanel
          target={{ kind: 'product', slug: 'boost-featured-30', listing_id: listingId }}
          totalUsd={30}
          onClose={() => setStep('overview')}
          onSuccess={(result) => {
            setStage(result.pending ? 'review' : 'authorized');
            setStep('status');
          }}
          summary={
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setStep('overview')}
                className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Back to boost details
              </button>
              <p className="text-sm font-medium">Featured Boost — 30 days</p>
              <p className="text-xs text-muted-foreground">{listingTitle}</p>
              <p className="text-lg font-semibold">$30.00</p>
            </div>
          }
        />
      ) : null}
    </>
  );
};
