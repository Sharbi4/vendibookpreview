import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SaleCheckoutCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  padding?: 'sm' | 'md';
  children: ReactNode;
}

/** White surface with soft hairline + restrained shadow — one radius everywhere. */
const SaleCheckoutCard = ({
  title,
  subtitle,
  action,
  className,
  padding = 'md',
  children,
}: SaleCheckoutCardProps) => (
  <section
    className={cn(
      'rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_12px_32px_-24px_rgba(24,20,16,0.35)]',
      padding === 'md' ? 'p-5 sm:p-6' : 'p-4',
      className,
    )}
  >
    {(title || action) && (
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {title ? <h2 className="text-base sm:text-lg font-semibold text-foreground">{title}</h2> : null}
          {subtitle ? <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p> : null}
        </div>
        {action}
      </header>
    )}
    {children}
  </section>
);

export default SaleCheckoutCard;
