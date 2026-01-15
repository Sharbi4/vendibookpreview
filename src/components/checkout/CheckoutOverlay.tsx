import { Loader2, ShieldCheck, Lock, CreditCard, Smartphone, Clock } from 'lucide-react';
import { StripeLogo } from '@/components/ui/StripeLogo';
import { useEffect, useState } from 'react';

interface CheckoutOverlayProps {
  isVisible: boolean;
  message?: string;
}

const CheckoutOverlay = ({ isVisible, message = 'Redirecting to secure checkout...' }: CheckoutOverlayProps) => {
  const [step, setStep] = useState(0);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setStep(0);
      setShowTip(false);
      return;
    }

    // Animate through steps
    const stepTimer = setTimeout(() => setStep(1), 500);
    const step2Timer = setTimeout(() => setStep(2), 1000);
    const tipTimer = setTimeout(() => setShowTip(true), 2500);

    return () => {
      clearTimeout(stepTimer);
      clearTimeout(step2Timer);
      clearTimeout(tipTimer);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const tips = [
    { icon: CreditCard, text: 'All major cards' },
    { icon: Smartphone, text: 'Apple & Google Pay' },
    { icon: Lock, text: '256-bit encryption' },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-background via-background to-background/98 backdrop-blur-md flex items-center justify-center">
      <div className="text-center space-y-8 p-8 max-w-md mx-auto animate-fade-in">
        {/* Animated card icon with ripple effect */}
        <div className="relative mx-auto w-28 h-28">
          {/* Outer ripple rings */}
          <div className="absolute inset-0 bg-[#635bff]/10 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 bg-[#635bff]/15 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          
          {/* Static rings */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#635bff]/20 to-[#7c75ff]/20 rounded-full" />
          <div className="absolute inset-3 bg-gradient-to-br from-[#635bff]/30 to-[#7c75ff]/30 rounded-full" />
          <div className="absolute inset-6 bg-gradient-to-br from-[#635bff] to-[#7c75ff] rounded-full flex items-center justify-center shadow-xl shadow-[#635bff]/30">
            <StripeLogo size="lg" className="brightness-0 invert" />
          </div>
          
          {/* Orbiting lock icon */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <Lock className="h-3 w-3 text-white" />
            </div>
          </div>
        </div>

        {/* Status message */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#635bff]" />
            <span className="text-xl font-semibold text-foreground">{message}</span>
          </div>
          
          {/* Progress steps */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`transition-all duration-300 ${step >= 0 ? 'bg-[#635bff]' : 'bg-muted'} h-1.5 w-16 rounded-full`} />
            <div className={`transition-all duration-300 ${step >= 1 ? 'bg-[#635bff]' : 'bg-muted'} h-1.5 w-16 rounded-full`} />
            <div className={`transition-all duration-300 ${step >= 2 ? 'bg-[#635bff]' : 'bg-muted'} h-1.5 w-16 rounded-full`} />
          </div>
        </div>

        {/* Security badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-medium">SSL Secured</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#635bff]/10 rounded-full text-[#635bff]">
            <span>Powered by</span>
            <StripeLogo size="sm" />
          </div>
        </div>

        {/* Payment tips - fades in after delay */}
        <div className={`transition-all duration-500 ${showTip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>This usually takes just a moment...</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {tips.map((tip, i) => (
                <div 
                  key={i}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-background/50"
                >
                  <tip.icon className="h-5 w-5 text-primary" />
                  <span className="text-xs text-center text-muted-foreground">{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Animated dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 bg-[#635bff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 bg-[#635bff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 bg-[#635bff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default CheckoutOverlay;