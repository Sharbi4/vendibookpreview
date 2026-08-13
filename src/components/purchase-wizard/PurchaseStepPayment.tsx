import { CreditCard, Banknote, FileText, ShieldCheck, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import NextStepHint from '@/components/shared/NextStepHint';

export type PurchasePaymentMethod = 'card' | 'cash';

interface PurchaseStepPaymentProps {
  paymentMethod: PurchasePaymentMethod;
  setPaymentMethod: (value: PurchasePaymentMethod) => void;
  acceptPayPalCheckout: boolean;
  acceptCashPayment: boolean;
  /** Titled-equipment paperwork context, when the listing carries it. */
  titleStatus?: string | null;
  hasLien?: string | null;
  vin?: string | null;
  /** Grand total shown back to the buyer so the choice is unambiguous. */
  totalPrice?: number;
  /** True while a purchase is already in flight — locks the whole step. */
  submitting?: boolean;
  onBack: () => void;
  onContinue: () => void;
}

const formatUsd = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const humanize = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const TitlePanel = ({
  titleStatus,
  hasLien,
  vin,
}: {
  titleStatus?: string | null;
  hasLien?: string | null;
  vin?: string | null;
}) => {
  if (!titleStatus && !hasLien && !vin) return null;
  const lienOpen = typeof hasLien === 'string' && /^(yes|true)$/i.test(hasLien.trim());

  return (
    <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Title &amp; paperwork</h3>
      </div>

      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {titleStatus && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Title status</dt>
            <dd className="text-foreground font-medium">{humanize(titleStatus)}</dd>
          </div>
        )}
        {hasLien && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Lien on file</dt>
            <dd className="text-foreground font-medium">{humanize(hasLien)}</dd>
          </div>
        )}
        {vin && (
          <div className="flex justify-between gap-3 sm:col-span-2">
            <dt className="text-muted-foreground">VIN / serial</dt>
            <dd className="text-foreground font-mono text-xs">{vin}</dd>
          </div>
        )}
      </dl>

      {lienOpen ? (
        <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">This unit has a lien. </span>
            Payment protection holds your funds until the seller provides a lien-release letter and a signed
            bill of sale. Do not accept keys before you see the release.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          A signed bill of sale and title transfer are exchanged at handoff. Both documents are attached to your
          order record so you can download them later.
        </p>
      )}
    </div>
  );
};

const PurchaseStepPayment = ({
  paymentMethod,
  setPaymentMethod,
  acceptPayPalCheckout,
  acceptCashPayment,
  titleStatus,
  hasLien,
  vin,
  totalPrice,
  submitting = false,
  onBack,
  onContinue,
}: PurchaseStepPaymentProps) => {
  const options: {
    id: PurchasePaymentMethod;
    available: boolean;
    icon: typeof CreditCard;
    name: string;
    tagline: string;
    badge: string;
    detail: string;
  }[] = [
    {
      id: 'card' as PurchasePaymentMethod,
      available: acceptPayPalCheckout,
      icon: CreditCard,
      name: 'Pay online — protected',
      tagline: 'Card, bank or PayPal balance through PayPal.',
      badge: 'Payment protection included',
      detail:
        'Your money is held until you confirm you received the item. If it never arrives or is not as described, you are covered.',
    },
    {
      id: 'cash' as PurchasePaymentMethod,
      available: acceptCashPayment,
      icon: Banknote,
      name: 'Pay in person',
      tagline: 'Settle directly with the seller at handoff.',
      badge: 'No Vendibook fees',
      detail:
        'Pay-in-person sales are completely free — no commission, no buyer fee. In exchange, there is no payment protection: you are transacting directly with the seller.',
    },
  ].filter((o) => o.available);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">How you'll pay</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {options.length > 1
            ? 'This seller accepts both. Protection differs — pick with that in mind.'
            : 'Here\'s the payment method this seller accepts.'}
        </p>
      </div>

      <div className="space-y-3">
        {options.map((o) => {
          const Icon = o.icon;
          const selected = paymentMethod === o.id;
          const selectable = options.length > 1;
          return (
            <button
              key={o.id}
              type="button"
              disabled={submitting}
              onClick={() => selectable && !submitting && setPaymentMethod(o.id)}
              className={cn(
                'w-full text-left rounded-lg border-2 p-5 transition-all',
                selected
                  ? 'border-primary bg-primary/[0.05] shadow-[0_0_0_1px_rgba(255,81,36,0.35)]'
                  : 'border-border bg-card/40 hover:border-white/25',
                !selectable && 'cursor-default',
                submitting && 'opacity-60 pointer-events-none',
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-xl shrink-0',
                    selected ? 'bg-primary/10' : 'bg-muted',
                  )}
                >
                  <Icon className={cn('h-6 w-6', selected ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{o.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{o.tagline}</p>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 mt-2 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                      o.id === 'card'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-border bg-muted/40 text-muted-foreground',
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {o.badge}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2">{o.detail}</p>
                </div>
                {selectable && selected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirmation strip — restates the exact choice before review. */}
      {options.length > 0 && (
        <div className="rounded-lg border border-primary/25 bg-primary/[0.04] p-4 flex items-start gap-3">
          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            {typeof totalPrice === 'number' ? (
              <>
                You'll pay <span className="font-semibold">{formatUsd(totalPrice)}</span>{' '}
              </>
            ) : (
              <>You'll pay </>
            )}
            {paymentMethod === 'cash'
              ? 'directly to the seller in person. No Vendibook fees, and no payment protection.'
              : 'online through PayPal. Funds are held until you confirm you received the item.'}
          </p>
        </div>
      )}

      <TitlePanel titleStatus={titleStatus} hasLien={hasLien} vin={vin} />

      <NextStepHint text="Last step: review everything, then complete your purchase." />

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="flex-1" size="lg">
          Back
        </Button>
        <Button onClick={onContinue} disabled={submitting} className="flex-1" size="lg">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Finishing your payment…
            </>
          ) : (
            'Review your order'
          )}
        </Button>
      </div>
    </div>
  );
};

export default PurchaseStepPayment;
