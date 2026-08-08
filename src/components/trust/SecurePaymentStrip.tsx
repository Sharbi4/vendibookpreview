import { ShieldCheck, Handshake, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PayPalMonogram, PayPalWordmark } from '@/components/brand/ProviderLogos';

interface SecurePaymentStripProps {
  /** Compact variant for tight spaces (e.g. above sticky CTA). */
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

/** Shared high-end glass surface: hairline border, soft gradient, top sheen. */
const luxSurface =
  'relative overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(140deg,hsl(var(--foreground)/0.06),transparent_45%,hsl(var(--primary)/0.07))] backdrop-blur-sm ' +
  'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,hsl(var(--foreground)/0.25),transparent)]';

/**
 * Reusable trust strip placed near any payment surface.
 * One source of truth for the "your money is safe" reassurance,
 * styled in Satin Lux (hairline border, glass surface, no rainbow colors),
 * with the official PayPal brand mark for processor attribution.
 */
export const SecurePaymentStrip = ({
  variant = 'default',
  className,
}: SecurePaymentStripProps) => {
  if (variant === 'inline') {
    return (
      <p
        className={cn(
          'flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground',
          className,
        )}
      >
        <Lock className="h-3 w-3" />
        <span>Payment securely held until the booking is complete</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="inline-flex items-center gap-1.5">
          Processed by
          <PayPalMonogram className="h-3.5" />
        </span>
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
          luxSurface,
          'flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-3 py-2 text-xs text-muted-foreground',
          className,
        )}
      >
        {items.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-primary/80" />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 border-l border-white/10 pl-3">
          <PayPalMonogram className="h-4" />
          <PayPalWordmark className="h-3 opacity-80" />
        </span>
      </div>
    );
  }

  return (
    <div className={cn(luxSurface, 'p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Vendibook Secure Checkout
        </p>
        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(120deg,hsl(var(--foreground)/0.08),transparent)] px-2.5 py-1">
          <PayPalMonogram className="h-4" />
          <PayPalWordmark className="h-3 opacity-90" />
        </span>
      </div>
      <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 flex-shrink-0 text-primary/80" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Your payment is securely held until the booking is complete. Funds release after both sides confirm.
      </p>
    </div>
  );
};

export default SecurePaymentStrip;
