import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  FileText, 
  User, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  Zap,
  Shield,
  Clock,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ONBOARDING_KEY = 'vendibook_booking_onboarding_completed';

interface OnboardingStep {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const steps: OnboardingStep[] = [
  {
    icon: Calendar,
    title: 'Select Your Dates',
    description: 'Pick when you need the asset. Available dates are shown in the calendar.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: FileText,
    title: 'Check Requirements',
    description: 'See what documents you may need. Don\'t worry - you can upload them later.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    icon: User,
    title: 'Enter Your Details',
    description: 'Choose pickup or delivery, add a message, and confirm your contact info.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    icon: CreditCard,
    title: 'Review & Pay',
    description: 'Check your booking details and complete secure payment via Stripe.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
];

interface BookingOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instantBook?: boolean;
}

export const BookingOnboardingModal = ({
  open,
  onOpenChange,
  instantBook = false,
}: BookingOnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onOpenChange(false);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onOpenChange(false);
    setCurrentStep(0);
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header with trust badges */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {instantBook ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  Instant Book
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  Request to Book
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Shield className="h-3 w-3 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Protected</span>
              </div>
            </div>
          </div>
        </div>

        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">How Booking Works</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            4 simple steps to secure your rental
          </p>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 px-6 py-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'w-6 bg-primary' 
                  : index < currentStep 
                  ? 'w-2 bg-primary/50' 
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="p-6 pt-4 min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <div className={`w-16 h-16 rounded-full ${step.bgColor} flex items-center justify-center mx-auto mb-4`}>
                <Icon className={`h-8 w-8 ${step.color}`} />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">
                Step {currentStep + 1}: {step.title}
              </h3>
              
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>

              {/* Additional context */}
              {currentStep === 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Blocked dates are shown in gray</span>
                </div>
              )}
              {currentStep === 3 && instantBook && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-600">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Instant confirmation - no waiting!</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Skip intro
          </Button>
          
          <Button variant="dark-shine" onClick={handleNext} className="gap-1.5">
            {currentStep < steps.length - 1 ? (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Start Booking
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to check if onboarding should be shown
export const useBookingOnboarding = () => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    setShouldShow(!completed);
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShouldShow(true);
  };

  return { shouldShow, setShouldShow, resetOnboarding };
};

export default BookingOnboardingModal;
