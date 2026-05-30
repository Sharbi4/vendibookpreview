import { ShieldCheck, Handshake, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecurePaymentStripProps {
  /** Compact variant for tight spaces (e.g. above sticky CTA). */
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

/**
 * Reusable trust strip placed near any payment surface.
 * One source of truth for the "your money is safe" reassurance,
 * styled in Satin Lux (hairline border, glass surface, no rainbow colors).
 */
export const SecurePaymentStrip = ({
  variant = 'default',
  className,
}: SecurePaymentStripProps) => {
  if (variant === 'inline') {
    return (
      <p
        className={cn(
          'flex items-center justify-center gap-1.5 text-xs text-muted-foreground',
          className,
        )}
      >
        <Lock className="h-3 w-3" />
        <span>Payment securely held until the booking is complete</span>
      </p>
    );
  }

  const items = [
    { icon: ShieldCheck, label: 'Securely held' },
    { icon: Handshake, label: 'Released on confirmation' },
    { icon: Lock, label: 'Protected for both sides' },
  ];

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground',
          className,
        )}
      >
        {items.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-primary/80" />
            {label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-muted/30 p-4',
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Vendibook Secure Checkout
      </p>
      <ul className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-primary/80 flex-shrink-0" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
        Your payment is securely held until the booking is complete. Funds release after both sides confirm.
      </p>
    </div>
  );
};

export default SecurePaymentStrip;
