import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CheckoutSectionProps {
  /** Small step-free label, e.g. "Review your purchase". */
  title: string;
  description?: ReactNode;
  /** Right-aligned status/edit affordance in the section header. */
  aside?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}

/** One card-like block inside the continuous checkout column. */
const CheckoutSection = ({
  title,
  description,
  aside,
  id,
  className,
  children,
}: CheckoutSectionProps) => (
  <section id={id} className={cn('v2-checkout-section', className)}>
    <div className="v2-checkout-section-head">
      <div className="min-w-0">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {aside ? <div className="v2-checkout-section-aside">{aside}</div> : null}
    </div>
    <div className="v2-checkout-section-body">{children}</div>
  </section>
);

export default CheckoutSection;
