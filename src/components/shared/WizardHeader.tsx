import { ShieldCheck, HelpCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StripeLogo } from '@/components/ui/StripeLogo';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface WizardStep {
  step: number;
  label: string;
  short: string;
}

interface WizardHeaderProps {
  mode: 'checkout' | 'booking';
  currentStep: number;
  totalSteps: number;
  steps: WizardStep[];
  instantBook?: boolean;
  onHelpClick?: () => void;
  listingTitle?: string;
  priceDaily?: number | null;
}

const WizardHeader = ({
  mode,
  currentStep,
  totalSteps,
  steps,
  instantBook = false,
  onHelpClick,
  listingTitle,
  priceDaily,
}: WizardHeaderProps) => {
  return (
    <div className="relative bg-gradient-to-r from-primary/15 via-amber-500/10 to-yellow-400/5 border-b border-primary/20">
      {/* Top bar with title and price */}
      <div className="px-4 sm:px-6 py-3">
        {listingTitle ? (
          <div className="mb-2">
            <h2 className="font-semibold text-base text-foreground line-clamp-2">{listingTitle}</h2>
            {priceDaily && (
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                ${priceDaily}/day
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground">
              {mode === 'checkout' ? 'Secure Checkout' : 'Secure Booking'}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Trust badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Protected</span>
          </div>
          
          {/* Stripe badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/50">
            <StripeLogo className="h-3.5 w-auto" />
            <span className="text-[10px] text-muted-foreground hidden sm:inline">Secure</span>
          </div>
          
          {/* Help button */}
          <Popover>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                onClick={onHelpClick}
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Need help?</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 text-sm">
              <h4 className="font-semibold mb-2">Need assistance?</h4>
              <p className="text-muted-foreground text-xs mb-3">
                Our support team is here to help you complete your {mode === 'checkout' ? 'purchase' : 'booking'}.
              </p>
              <button 
                className="w-full text-xs text-primary hover:underline text-left"
                onClick={() => {
                  // @ts-ignore - Zendesk widget
                  if (typeof window !== 'undefined' && window.zE) {
                    // @ts-ignore
                    window.zE('messenger', 'open');
                  }
                }}
              >
                Chat with Support →
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Step indicator */}
      <div className="px-4 sm:px-6 pb-4">
        {/* Mode badge + step counter */}
        <div className="flex items-center justify-between mb-3">
          {mode === 'booking' ? (
            instantBook ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                Instant Book
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                Request to Book
              </span>
            )
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Escrow Protected
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        
        {/* Progress bar with labels */}
        <div className="flex gap-1">
          {steps.map((s) => (
            <div key={s.step} className="flex-1">
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  s.step < currentStep 
                    ? 'bg-primary' 
                    : s.step === currentStep 
                    ? 'bg-primary/70' 
                    : 'bg-muted'
                )}
              />
              <span className={cn(
                "text-[10px] mt-1 block text-center transition-colors",
                s.step === currentStep 
                  ? 'text-primary font-medium' 
                  : s.step < currentStep
                  ? 'text-foreground/70'
                  : 'text-muted-foreground'
              )}>
                {s.short}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WizardHeader;
