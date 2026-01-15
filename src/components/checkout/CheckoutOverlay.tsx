import { Loader2, CreditCard, ShieldCheck } from 'lucide-react';
import { StripeLogo } from '@/components/ui/StripeLogo';

interface CheckoutOverlayProps {
  isVisible: boolean;
  message?: string;
}

const CheckoutOverlay = ({ isVisible, message = 'Redirecting to secure checkout...' }: CheckoutOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center space-y-6 p-8 max-w-sm mx-auto animate-fade-in">
        {/* Animated card icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-[#635bff]/20 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-[#635bff]/30 rounded-full animate-pulse delay-75" />
          <div className="absolute inset-4 bg-[#635bff]/40 rounded-full flex items-center justify-center">
            <StripeLogo size="lg" />
          </div>
        </div>

        {/* Loading spinner */}
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#635bff]" />
          <span className="text-lg font-medium text-foreground">{message}</span>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Powered by</span>
          <StripeLogo size="sm" />
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-[#635bff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-[#635bff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-[#635bff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default CheckoutOverlay;
