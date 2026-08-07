import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSellerVerification } from '@/hooks/useSellerVerification';
import { IDENTITY_VERIFIED_DISCLOSURE } from './IdentityVerifiedBadge';
import { cn } from '@/lib/utils';

interface VerifiedSellerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the badge goes live so the host surface can refresh. */
  onVerified?: () => void;
}

type Step = 'terms' | 'pay' | 'working' | 'result';

/**
 * Verified Seller purchase flow.
 *
 * Terms -> PayPal authorization (a hold, not a charge) -> Plaid identity check
 * -> server captures ONLY on a confirmed successful identity result.
 */
const VerifiedSellerDialog = ({ open, onOpenChange, onVerified }: VerifiedSellerDialogProps) => {
  const v = useSellerVerification({ enabled: open });
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState<Step>('terms');
  const [orderId, setOrderId] = useState<string | null>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const notifiedRef = useRef(false);

  const status = v.state?.status ?? 'not_started';
  const paymentOnly = v.state?.needs_payment_only ?? false;

  // Reset local state each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setAccepted(false);
    setOrderId(null);
    notifiedRef.current = false;
    setStep(status === 'verified' || status === 'pending_review' ? 'result' : 'terms');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (v.state?.badge_active && !notifiedRef.current) {
      notifiedRef.current = true;
      setStep('result');
      onVerified?.();
    }
  }, [v.state?.badge_active, onVerified]);

  const beginPayment = useCallback(async () => {
    const id = paymentOnly ? await v.completePayment() : await v.start(accepted);
    if (!id) return;
    setOrderId(id);
    setStep('pay');
  }, [accepted, paymentOnly, v]);

  // Mount PayPal's authorize buttons once we have an order to approve.
  useEffect(() => {
    if (step !== 'pay' || !orderId || !buttonsRef.current) return;
    let disposed = false;

    v.mountAuthorizeButtons(buttonsRef.current, {
      createOrder: async () => orderId,
      onAuthorized: async (approvedOrderId) => {
        setStep('working');
        await v.authorizeAndVerify(approvedOrderId);
        if (!disposed) setStep('result');
      },
      onCancel: () => {
        v.setNotice('Payment canceled. Nothing was charged.');
        setStep('terms');
      },
      onError: (message) => {
        v.setError(message);
        setStep('terms');
      },
    })
      .then((cleanup) => {
        if (disposed) cleanup?.();
        else cleanupRef.current = cleanup;
      })
      .catch(() => v.setError('PayPal could not load. Nothing was charged.'));

    return () => {
      disposed = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, orderId]);

  const handleClose = (next: boolean) => {
    if (!next && step === 'working') return; // never close mid-settlement
    onOpenChange(next);
  };

  const busy = v.phase === 'verifying' || v.phase === 'settling' || step === 'working';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            {paymentOnly ? 'Complete your payment' : 'Stand out as a Verified Seller'}
          </DialogTitle>
          <DialogDescription>
            {paymentOnly
              ? 'Your identity check already succeeded. Finish payment to activate your badge — you will not need to verify again.'
              : 'Confirm your identity and add an Identity Verified badge to your seller profile and active listings.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {v.error && (
            <div
              role="alert"
              className="mb-4 flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{v.error}</span>
            </div>
          )}
          {v.notice && !v.error && (
            <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              {v.notice}
            </div>
          )}

          {/* ---------------------------------------------------- terms */}
          {step === 'terms' && (
            <div className="space-y-4 pb-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Verified Seller identity check
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {v.offer.display_price}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  One-time Vendibook service fee. Applies to your whole account — every current
                  and future active listing.
                </p>
              </div>

              <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                <p className="text-sm font-medium text-foreground">Before you continue</p>
                <p>
                  {v.offer.display_price} is a one-time Vendibook identity-verification service fee.
                </p>
                <p>
                  PayPal first places a temporary authorization. Vendibook captures it only after
                  Plaid reports a successful identity verification.
                </p>
                <p>
                  A failed, canceled, expired, or uncompleted verification is not charged. An open
                  authorization may appear as pending on your PayPal or card statement until it is
                  released.
                </p>
                <p>{IDENTITY_VERIFIED_DISCLOSURE}</p>
                <p>
                  Plaid processes the identity data under its applicable privacy disclosures, shown
                  during the check.
                </p>
                <p>
                  Vendibook may revoke a badge for fraud, account compromise, or policy violations.
                  Revocation does not itself determine refund eligibility.
                </p>
              </div>

              {!paymentOnly && (
                <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
                  <Checkbox
                    checked={accepted}
                    onCheckedChange={(c) => setAccepted(c === true)}
                    aria-label="Accept the Verified Seller terms"
                    className="mt-0.5"
                  />
                  <span className="text-xs text-muted-foreground">
                    I have read and accept the Verified Seller terms above ({v.offer.terms_version}).
                  </span>
                </label>
              )}

              <Button
                onClick={beginPayment}
                disabled={(!accepted && !paymentOnly) || v.busy}
                className="w-full min-h-11"
              >
                {v.busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Continue to PayPal — {v.offer.display_price}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ------------------------------------------------------ pay */}
          {step === 'pay' && (
            <div className="space-y-4 pb-2">
              <p className="text-xs text-muted-foreground">
                PayPal will place a temporary {v.offer.display_price} hold. You are charged only if
                your identity check succeeds.
              </p>
              <div ref={buttonsRef} />
              <Button
                variant="ghost"
                className="w-full min-h-11"
                onClick={async () => {
                  await v.cancel();
                  setStep('terms');
                }}
              >
                Cancel verification
              </Button>
            </div>
          )}

          {/* -------------------------------------------------- working */}
          {step === 'working' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">
                {v.phase === 'settling' ? 'Confirming your result…' : 'Opening the identity check…'}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Keep this window open. Your payment is only a hold until we confirm the result.
              </p>
            </div>
          )}

          {/* --------------------------------------------------- result */}
          {step === 'result' && (
            <div className="space-y-4 pb-2 text-center">
              {v.state?.badge_active ? (
                <>
                  <CheckCircle2
                    className="mx-auto h-10 w-10 text-emerald-500"
                    aria-hidden="true"
                  />
                  <p className="text-base font-semibold text-foreground">You&rsquo;re verified</p>
                  <p className="text-sm text-muted-foreground">
                    Your Identity Verified badge is live on your seller profile and every active
                    listing. A receipt is on its way to your inbox.
                  </p>
                </>
              ) : status === 'pending_review' ? (
                <>
                  <Clock className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
                  <p className="text-base font-semibold text-foreground">Pending review</p>
                  <p className="text-sm text-muted-foreground">
                    Your check is being reviewed. Nothing has been charged and no hold will be
                    captured unless it succeeds.
                  </p>
                </>
              ) : paymentOnly ? (
                <>
                  <CreditCard className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
                  <p className="text-base font-semibold text-foreground">Payment needed</p>
                  <p className="text-sm text-muted-foreground">
                    Your identity check succeeded but the payment did not go through. Complete
                    payment to activate your badge — no need to verify again.
                  </p>
                  <Button onClick={beginPayment} className="w-full min-h-11" disabled={v.busy}>
                    Complete payment — {v.offer.display_price}
                  </Button>
                </>
              ) : (
                <>
                  <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
                  <p className="text-base font-semibold text-foreground">
                    Verification not completed
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You were not charged and any hold has been released.
                  </p>
                  {v.state?.can_retry && (
                    <Button
                      variant="outline"
                      className="w-full min-h-11"
                      disabled={v.busy}
                      onClick={async () => {
                        const result = await v.retry();
                        if (result.orderId) {
                          setOrderId(result.orderId);
                          setStep('pay');
                        } else {
                          setStep('result');
                        }
                      }}
                    >
                      Try the identity check again
                    </Button>
                  )}
                  {!v.state?.can_retry && (
                    <p className="text-xs text-muted-foreground">
                      Contact support and we&rsquo;ll review your verification.
                    </p>
                  )}
                </>
              )}

              <Button
                variant={v.state?.badge_active ? 'default' : 'ghost'}
                className={cn('w-full min-h-11')}
                onClick={() => onOpenChange(false)}
              >
                {v.state?.badge_active ? (
                  <>
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    Done
                  </>
                ) : (
                  'Close'
                )}
              </Button>
            </div>
          )}
        </ScrollArea>

        {busy && <span className="sr-only" role="status">Working, please wait.</span>}
      </DialogContent>
    </Dialog>
  );
};

export default VerifiedSellerDialog;
