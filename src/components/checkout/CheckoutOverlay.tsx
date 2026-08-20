import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TRUST_COPY } from '@/lib/transactionVocabulary';

interface CheckoutOverlayProps {
  isVisible: boolean;
  message?: string;
}

/**
 * Calm, Satin Lux redirect overlay shown while the user is being
 * handed off to PayPal. No rainbow colors, no busy
 * orbiting icons — single shield mark and one reassurance line.
 * The isVisible / message API is preserved for backwards compatibility.
 */
const CheckoutOverlay = ({ isVisible, message = 'Redirecting to secure checkout' }: CheckoutOverlayProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }
    const t1 = setTimeout(() => setProgress(33), 300);
    const t2 = setTimeout(() => setProgress(66), 800);
    const t3 = setTimeout(() => setProgress(95), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-sm mx-auto animate-fade-in">
        {/* Single shield mark — calm halo, no spinning rings */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="absolute inset-0 rounded-full border border-border/60 bg-card flex items-center justify-center shadow-sm">
            <ShieldCheck className="h-9 w-9 text-primary" />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-base font-medium">{message}</span>
          </div>

          {/* Hairline progress bar */}
          <div className="h-[2px] w-full bg-border/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* One-line reassurance */}
        <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2 justify-center">
          <Lock className="h-3.5 w-3.5 text-primary/80 flex-shrink-0 mt-0.5" />
          <span>{TRUST_COPY.short}</span>
        </p>
      </div>
    </div>
  );
};

export default CheckoutOverlay;
