import stripeLogo from '@/assets/stripe-logo.png';
import { cn } from '@/lib/utils';

interface StripeLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

const sizeClasses = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const StripeLogo = ({ size = 'md', className, showText = false }: StripeLogoProps) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img 
        src={stripeLogo} 
        alt="Stripe" 
        className={cn(sizeClasses[size], 'object-contain')}
      />
      {showText && (
        <span className="font-semibold text-[#635bff]">Stripe</span>
      )}
    </div>
  );
};
