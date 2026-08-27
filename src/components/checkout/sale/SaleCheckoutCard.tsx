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
      'rounded-[22px] border border-border/70 bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_28px_64px_-40px_rgba(24,20,16,0.45)]',
      padding === 'md' ? 'p-6 sm:p-8' : 'p-5',
      className,
    )}
  >
    {(title || action) && (
      <header className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          {title ? <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">{title}</h2> : null}
          {subtitle ? <p className="text-sm leading-relaxed text-muted-foreground mt-1">{subtitle}</p> : null}
        </div>
        {action}
      </header>
    )}
    {children}
  </section>
);

export default SaleCheckoutCard;
