import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SaleCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'warm';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bronze?: boolean;
  children: ReactNode;
}

const padMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

/**
 * Premium dark glass card used across the sale listing detail layout.
 * Replaces hairline dividers with card-level separation.
 */
export const SaleCard = ({
  variant = 'default',
  padding = 'md',
  bronze = false,
  className,
  children,
  ...rest
}: SaleCardProps) => {
  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        variant === 'warm' ? 'bg-sale-card-warm' : 'bg-sale-card',
        bronze ? 'ring-bronze' : 'ring-hairline',
        padMap[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

export default SaleCard;
