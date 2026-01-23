import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ShoppingCart, 
  Building2, 
  Truck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import vendibookLogo from '@/assets/vendibook-logo.png';
import { trackHeroCTAClick } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WalkthroughStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  visual: React.ReactNode;
}

const HeroWalkthrough = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance to trigger navigation (in pixels)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goNext();
    } else if (isRightSwipe) {
      goPrev();
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setIsGoogleLoading(false);
        toast({
          title: 'Google sign-in failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      const url = data?.url;
      if (url) {
        try {
          (window.top ?? window).location.assign(url);
        } catch {
          window.location.assign(url);
        }
      }
    } catch (error: any) {
      setIsGoogleLoading(false);
      toast({
        title: 'Google sign-in failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const steps: WalkthroughStep[] = [
    {
      id: 1,
      title: 'Find Your Perfect Asset',
      subtitle: 'Browse food trucks, trailers, kitchens & vendor lots',
      icon: <Search className="h-5 w-5" />,
      visual: (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            { name: 'Food Trucks', icon: <Truck className="h-5 w-5 sm:h-6 sm:w-6" /> },
            { name: 'Food Trailers', icon: <Truck className="h-5 w-5 sm:h-6 sm:w-6" /> },
            { name: 'Ghost Kitchens', icon: <Building2 className="h-5 w-5 sm:h-6 sm:w-6" /> },
            { name: 'Vendor Lots', icon: <Building2 className="h-5 w-5 sm:h-6 sm:w-6" /> },
          ].map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "p-3 sm:p-4 rounded-xl border-2 text-center transition-all bg-background/80 backdrop-blur-sm",
                i === 0 ? "border-primary bg-primary/10" : "border-border/50"
              )}
            >
              <div className="mx-auto mb-1.5 sm:mb-2 text-primary">{item.icon}</div>
              <span className="text-[11px] sm:text-xs font-medium">{item.name}</span>
            </motion.div>
          ))}
        </div>
      ),
    },
    {
      id: 2,
      title: 'Buy or Rent',
      subtitle: 'Flexible options to fit your business needs',
      icon: <ShoppingCart className="h-5 w-5" />,
      visual: (
        <div className="space-y-3 sm:space-y-4">
          {[
            { mode: 'Buy', desc: 'Own your asset outright', price: 'From $15,000' },
            { mode: 'Rent', desc: 'Flexible daily or weekly rentals', price: 'From $150/day' },
          ].map((option, i) => (
            <motion.div
              key={option.mode}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
              className={cn(
                "p-3 sm:p-4 rounded-xl border-2 transition-all bg-background/80 backdrop-blur-sm",
                i === 0 ? "border-primary" : "border-border/50"
              )}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-base sm:text-lg">{option.mode}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{option.desc}</div>
                </div>
                <div className="text-primary font-bold text-xs sm:text-sm">{option.price}</div>
              </div>
            </motion.div>
          ))}
        </div>
      ),
    },
    {
      id: 3,
      title: 'List Your Asset',
      subtitle: 'Create a free listing in minutes',
      icon: <Building2 className="h-5 w-5" />,
      visual: (
        <div className="space-y-2 sm:space-y-3">
          {[
            { step: 1, text: 'Upload photos & details' },
            { step: 2, text: 'Set your price' },
            { step: 3, text: 'Get inquiries instantly' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-bold shrink-0">
                {item.step}
              </div>
              <span className="font-medium text-sm sm:text-base">{item.text}</span>
            </motion.div>
          ))}
        </div>
      ),
    },
  ];

  // Auto-advance steps
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  const goToStep = (index: number) => {
    setCurrentStep(index);
    setIsPlaying(false);
  };

  const goNext = () => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
    setIsPlaying(false);
  };

  const goPrev = () => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
    setIsPlaying(false);
  };

  return (
    <section className="relative overflow-hidden py-6 sm:py-8 md:py-12 mx-2 sm:mx-4 mt-2 sm:mt-4 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-background via-muted/30 to-background border-2 border-border">

      <div className="container max-w-5xl mx-auto px-3 sm:px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-12">
          {/* Left side - Logo & CTAs */}
          <div className="flex-1 text-center lg:text-left w-full">
            {/* Logo */}
            <motion.div 
              className="flex justify-center lg:justify-start"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <img 
                src={vendibookLogo} 
                alt="Vendibook" 
                className="h-24 sm:h-32 md:h-40 lg:h-48 w-auto drop-shadow-lg"
              />
            </motion.div>

            {/* Tagline */}
            <motion.h1 
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight mt-3 sm:mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              The marketplace for food business
            </motion.h1>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2 sm:gap-3 mt-4 sm:mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Button
                variant="dark-shine"
                size="lg"
                onClick={() => {
                  trackHeroCTAClick('browse');
                  navigate('/search');
                }}
                className="text-sm sm:text-base px-5 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
              >
                <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Browse Listings
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="dark-shine"
                size="lg"
                onClick={() => {
                  trackHeroCTAClick('list');
                  navigate('/list');
                }}
                className="text-sm sm:text-base px-5 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
              >
                Create a Free Listing
              </Button>
            </motion.div>

            {/* Google Sign-in for logged out users */}
            {!user && (
              <motion.div 
                className="mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="gap-2"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
                </Button>
              </motion.div>
            )}
          </div>

          {/* Right side - Animated Walkthrough */}
          <motion.div 
            className="flex-1 w-full max-w-sm sm:max-w-md"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="relative bg-card border-2 border-border rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl">
                {/* Header */}
                <div className="bg-muted/50 border-b border-border px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 sm:gap-1.5">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground ml-1.5 sm:ml-2">How it works</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    ) : (
                      <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    )}
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-muted relative">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Content */}
                <div 
                  className="p-3 sm:p-5"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      {steps[currentStep].icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">Step {currentStep + 1} of {steps.length}</div>
                      <div className="font-semibold text-sm sm:text-base truncate">{steps[currentStep].title}</div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{steps[currentStep].subtitle}</p>

                  {/* Visual content */}
                  <div className="min-h-[180px] sm:min-h-[200px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {steps[currentStep].visual}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                    <div className="flex gap-1 sm:gap-1.5">
                      {steps.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToStep(index)}
                          className={cn(
                            "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all",
                            index === currentStep ? "bg-primary w-4 sm:w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                          )}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5 sm:gap-2">
                      <Button variant="outline" size="sm" onClick={goPrev} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                        <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={goNext} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroWalkthrough;
