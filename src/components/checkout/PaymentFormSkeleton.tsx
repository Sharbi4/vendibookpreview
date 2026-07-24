/**
 * Shimmer skeleton that mimics the Express Checkout row + tabs +
 * input rows Stripe will render, so the modal never shows an empty
 * spinner while Stripe.js boots.
 */
const shimmer =
  'relative overflow-hidden bg-muted/30 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent';

const PaymentFormSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-live="polite">
    <div className="grid grid-cols-3 gap-2">
      <div className={`h-11 rounded-xl ${shimmer}`} />
      <div className={`h-11 rounded-xl ${shimmer}`} />
      <div className={`h-11 rounded-xl ${shimmer}`} />
    </div>
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border/60" />
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        or pay with card
      </span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className={`h-9 rounded-lg ${shimmer}`} />
      <div className={`h-9 rounded-lg ${shimmer}`} />
      <div className={`h-9 rounded-lg ${shimmer}`} />
    </div>
    <div className={`h-12 rounded-xl ${shimmer}`} />
    <div className="grid grid-cols-2 gap-3">
      <div className={`h-12 rounded-xl ${shimmer}`} />
      <div className={`h-12 rounded-xl ${shimmer}`} />
    </div>
    <div className={`h-12 rounded-xl ${shimmer}`} />
    <span className="sr-only">Loading secure payment form…</span>
  </div>
);

export default PaymentFormSkeleton;
