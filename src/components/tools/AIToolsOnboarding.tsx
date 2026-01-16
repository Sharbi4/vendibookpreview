import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  DollarSign, 
  FileCheck, 
  Wrench, 
  FileText, 
  Lightbulb, 
  Search,
  ChevronRight,
  ChevronLeft,
  X,
  Rocket,
  Clock,
  Zap
} from 'lucide-react';

const ONBOARDING_KEY = 'vendi_ai_tools_onboarded';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Welcome to Vendi AI',
    description: 'Your AI-powered toolkit for running a successful mobile food business. Let us show you around!',
    icon: <Sparkles className="h-8 w-8" />,
    tip: 'All tools are free to try—no credit card needed'
  },
  {
    title: 'PricePilot',
    description: 'Not sure what to charge? Get smart pricing suggestions based on your location and what you offer.',
    icon: <DollarSign className="h-8 w-8" />,
    tip: 'Takes about 30 seconds to get your prices'
  },
  {
    title: 'PermitPath',
    description: 'Find out exactly which permits and licenses you need for your city. No more guessing.',
    icon: <FileCheck className="h-8 w-8" />,
    tip: 'We cover all 50 states'
  },
  {
    title: 'BuildKit',
    description: 'Get equipment recommendations and maintenance tips to keep your kitchen running smoothly.',
    icon: <Wrench className="h-8 w-8" />,
    tip: 'Includes cleaning schedules & troubleshooting'
  },
  {
    title: 'Listing Studio',
    description: 'Write a listing that actually gets bookings. Just enter your details and we do the rest.',
    icon: <FileText className="h-8 w-8" />,
    tip: 'Copy & paste directly into your listing'
  },
  {
    title: 'Concept Lab',
    description: 'Brainstorm food truck ideas tailored to your budget, location, and what you love to cook.',
    icon: <Lightbulb className="h-8 w-8" />,
    tip: 'Great for new entrepreneurs'
  },
  {
    title: 'Market Radar',
    description: 'Research your local market, see what competitors are doing, and find opportunities.',
    icon: <Search className="h-8 w-8" />,
    tip: 'AI-powered market research in seconds'
  }
];

interface AIToolsOnboardingProps {
  onComplete?: () => void;
}

const AIToolsOnboarding = ({ onComplete }: AIToolsOnboardingProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasOnboarded = localStorage.getItem(ONBOARDING_KEY);
    if (!hasOnboarded) {
      // Small delay to let the page load first
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const step = onboardingSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:max-w-lg md:w-full"
          >
            <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-6 text-white relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                {/* Close button */}
                <button
                  onClick={handleSkip}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Step indicator */}
                <div className="flex gap-1.5 mb-4">
                  {onboardingSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === currentStep 
                          ? 'w-8 bg-white' 
                          : index < currentStep 
                            ? 'w-4 bg-white/60' 
                            : 'w-4 bg-white/30'
                      }`}
                    />
                  ))}
                </div>

                {/* Icon and title */}
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-4"
                >
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    {step.icon}
                  </div>
                  <div>
                    <Badge className="bg-white/20 text-white border-0 mb-1 text-xs">
                      {isFirstStep ? 'Getting Started' : `Tool ${currentStep} of 6`}
                    </Badge>
                    <h2 className="text-2xl font-bold">{step.title}</h2>
                  </div>
                </motion.div>
              </div>

              <CardContent className="p-6">
                {/* Description */}
                <motion.p
                  key={`desc-${currentStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-muted-foreground text-lg mb-4"
                >
                  {step.description}
                </motion.p>

                {/* Tip */}
                <motion.div
                  key={`tip-${currentStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10 mb-6"
                >
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{step.tip}</span>
                </motion.div>

                {/* Quick stats for first step */}
                {isFirstStep && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="grid grid-cols-3 gap-3 mb-6"
                  >
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <Rocket className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                      <p className="text-xs text-muted-foreground">6 AI Tools</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                      <p className="text-xs text-muted-foreground">30 Sec Results</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <Sparkles className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                      <p className="text-xs text-muted-foreground">Free to Try</p>
                    </div>
                  </motion.div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Skip tour
                  </Button>

                  <div className="flex gap-2">
                    {!isFirstStep && (
                      <Button
                        variant="outline"
                        onClick={handlePrevious}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </Button>
                    )}
                    <Button
                      onClick={handleNext}
                      className="gap-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    >
                      {isLastStep ? (
                        <>
                          Get Started
                          <Rocket className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Hook to manually trigger onboarding
export const useAIToolsOnboarding = () => {
  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    window.location.reload();
  };

  const hasCompletedOnboarding = () => {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  };

  return { resetOnboarding, hasCompletedOnboarding };
};

export default AIToolsOnboarding;
