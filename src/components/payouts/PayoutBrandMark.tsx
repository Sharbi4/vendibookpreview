import type { PayoutMethod } from '@/lib/payouts/methods';
import { cn } from '@/lib/utils';

/**
 * Brand marks for the manual payout methods, drawn as inline SVG so they stay
 * crisp at any size and never depend on a remote logo host. Colors match each
 * company's published brand palette.
 */

function PayPalMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 28" className={className} role="img" aria-label="PayPal">
      <path
        fill="#002F86"
        d="M4.9 27.3H1.1c-.5 0-.9-.5-.8-1L4.4 1.5c.1-.6.6-1 1.2-1h8.1c4.7 0 7.7 2.3 7.1 6.8-.1.4-.1.8-.2 1.2-1 4.7-4.2 6.8-8.8 6.8H8.3c-.6 0-1.1.4-1.2 1L5.9 26.3c-.1.6-.5 1-1 1Z"
      />
      <path
        fill="#009CDE"
        d="M20.8 8.5c-.9 4.7-4.1 7.1-9 7.1H8.3c-.6 0-1.1.4-1.2 1L5.6 25.3c-.1.5.3 1 .8 1h3.4c.5 0 .9-.4 1-.9l.9-5.6c.1-.5.5-.9 1-.9h1.6c4.2 0 7.4-1.7 8.4-6.6.4-2 .2-3.5-.9-4.6-.2-.1-.4-.2-.6-.3.1.4.1.7 0 1.1Z"
      />
    </svg>
  );
}

function VenmoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Venmo">
      <rect width="32" height="32" rx="7" fill="#008CFF" />
      <path
        fill="#fff"
        d="M22.6 7.3c.8 1.3 1.2 2.7 1.2 4.4 0 5.4-4.6 12.4-8.4 17.3H7L3.6 8.6l7.4-.7 1.8 14.5c1.7-2.7 3.8-7 3.8-9.9 0-1.6-.3-2.7-.7-3.6l6.7-1.6Z"
      />
    </svg>
  );
}

function CashAppMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Cash App">
      <rect width="32" height="32" rx="7" fill="#00D64F" />
      <path
        fill="#fff"
        d="M19.7 12.1c.3.3.8.3 1.1 0l1.2-1.1c.4-.3.3-.9 0-1.2a9.6 9.6 0 0 0-2.9-1.8l.3-1.6a.7.7 0 0 0-.7-.9h-2c-.4 0-.7.2-.7.6l-.3 1.5c-2.8.1-5.2 1.5-5.2 4.4 0 2.5 2 3.6 4.1 4.4 2 .8 3 1.1 3 2 0 .9-.9 1.4-2.2 1.4a5.6 5.6 0 0 1-3.7-1.5.8.8 0 0 0-1.1 0l-1.3 1.2c-.3.3-.3.9 0 1.2 1 .9 2.2 1.6 3.5 1.9l-.3 1.5c-.1.4.2.8.7.9h2c.4 0 .7-.3.7-.6l.3-1.5c3.3-.2 5.4-2 5.4-4.7 0-2.5-2.1-3.5-4.6-4.4-1.4-.5-2.6-.9-2.6-1.8s1-1.3 2-1.3c1.2 0 2.4.5 3.3 1.4Z"
      />
    </svg>
  );
}

function AchMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Bank transfer">
      <rect width="32" height="32" rx="7" fill="#1F2937" />
      <path
        fill="#E5E7EB"
        d="M16 5 5.5 10.4v1.9h21v-1.9L16 5Zm-7.6 9.2v9.1H6.1v2.6h19.8v-2.6h-2.3v-9.1h-2.6v9.1h-2.7v-9.1h-2.6v9.1h-2.7v-9.1H8.4Z"
      />
    </svg>
  );
}

const MARKS: Record<PayoutMethod, (p: { className?: string }) => JSX.Element> = {
  paypal: PayPalMark,
  venmo: VenmoMark,
  cash_app: CashAppMark,
  ach: AchMark,
};

export function PayoutBrandMark({
  method,
  className,
}: {
  method: PayoutMethod;
  className?: string;
}) {
  const Mark = MARKS[method];
  return <Mark className={cn('h-6 w-6', className)} />;
}

export default PayoutBrandMark;
