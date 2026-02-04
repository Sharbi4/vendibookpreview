import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, CheckCircle2, ArrowRightLeft, Store, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Step {
  targetId: string;
  title: string;
  description: string;
  position: 'bottom' | 'top' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

interface DashboardOnboardingProps {
  mode: 'host' | 'shopper';
  onComplete: () => void;
}

const hostSteps: Step[] = [
  {
    targetId: 'mode-switch-container',
    title: 'Two Modes, One Account',
    description: 'Switch between "Buying" and "Hosting" instantly. No need to log out.',
    position: 'bottom',
    align: 'end'
  },
  {
    targetId: 'storefront-button',
    title: 'Your Public Storefront',
    description: 'This is your digital business card. Share this link on Instagram or Google Maps to drive direct bookings.',
    position: 'bottom',
    align: 'start'
  },
  {
    targetId: 'add-asset-button',
    title: 'List Your First Asset',
    description: 'Add a food truck, trailer, or kitchen to start earning revenue.',
    position: 'bottom',
    align: 'end'
  }
];

const shopperSteps: Step[] = [
  {
    targetId: 'discovery-hero',
    title: 'Start Your Search',
    description: 'Find food trucks, trailers, and commercial kitchens available for rent near you.',
    position: 'bottom',
    align: 'start'
  },
  {
    targetId: 'become-host-card',
    title: 'Earn with Assets',
    description: 'Have idle equipment? Switch roles and list it here to start generating revenue.',
    position: 'top',
    align: 'end'
  }
];

export const DashboardOnboarding = ({ mode, onComplete }: DashboardOnboardingProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = mode === 'host' ? hostSteps : shopperSteps;
  const currentStep = steps[stepIndex];

  // Auto-scroll to element
  useEffect(() => {
    if (!isVisible) return;
    const element = document.getElementById(currentStep.targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [stepIndex, currentStep.targetId, isVisible]);

  const handleNext = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      setIsVisible(false);
      onComplete();
    }
  }, [stepIndex, steps.length, onComplete]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop with Spotlight */}
          <SpotlightOverlay targetId={currentStep.targetId} />

          {/* Popover Content */}
          <PopoverContent
            step={currentStep}
            index={stepIndex}
            total={steps.length}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        </>
      )}
    </AnimatePresence>
  );
};

// Helper: Calculates position relative to the target ID
const PopoverContent = ({ step, index, total, onNext, onSkip }: {
  step: Step;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}) => {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        let top = 0;
        let left = 0;

        if (step.position === 'bottom') {
          top = rect.bottom + window.scrollY + 20;
          left = step.align === 'end' ? rect.right - 320 : step.align === 'center' ? rect.left + rect.width / 2 - 160 : rect.left;
        } else if (step.position === 'top') {
          top = rect.top + window.scrollY - 200;
          left = step.align === 'end' ? rect.right - 320 : rect.left;
        }

        // Safety bounds
        if (left < 20) left = 20;
        if (left + 320 > window.innerWidth) left = window.innerWidth - 340;

        setCoords({ top, left });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [step.targetId, step.position, step.align]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      style={{ top: coords.top, left: coords.left }}
      className="fixed z-[60] w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Premium Gradient Border Top */}
      <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/50" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          {index === 0 ? (
            <ArrowRightLeft className="h-5 w-5 text-primary" />
          ) : index === 1 ? (
            <Store className="h-5 w-5 text-primary" />
          ) : (
            <Search className="h-5 w-5 text-primary" />
          )}
        </div>
        <button
          onClick={onSkip}
          className="p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Skip tour"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 bg-muted/30 border-t border-border">
        {/* Progress Dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === index ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <Button onClick={onNext} size="sm" className="rounded-full">
          {index === total - 1 ? 'Finish' : 'Next'}
          {index === total - 1 ? (
            <CheckCircle2 className="ml-1.5 h-4 w-4" />
          ) : (
            <ChevronRight className="ml-1 h-4 w-4" />
          )}
        </Button>
      </div>
    </motion.div>
  );
};

// Helper: Darkens screen except for target
const SpotlightOverlay = ({ targetId }: { targetId: string }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      const el = document.getElementById(targetId);
      if (el) setRect(el.getBoundingClientRect());
    };
    updateRect();
    
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);
    
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [targetId]);

  if (!rect) return null;

  const padding = 8;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 pointer-events-none"
    >
      {/* Dark overlay with cutout */}
      <svg className="w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Glow Ring around target */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed',
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }}
        className="rounded-xl ring-2 ring-primary/50 ring-offset-2 ring-offset-transparent"
      />
    </motion.div>
  );
};

export default DashboardOnboarding;
