import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, TrendingUp, DollarSign, Brain, Lightbulb, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';

const AI_FEATURES = [
  {
    icon: DollarSign,
    title: 'Smart Pricing Suggestions',
    description: 'Get AI-powered pricing recommendations based on market analysis',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Revenue Insights',
    description: 'Track performance and get actionable tips to boost earnings',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Lightbulb,
    title: 'Description Optimizer',
    description: 'AI rewrites your listings for maximum impact and bookings',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Brain,
    title: 'Market Analysis',
    description: 'Understand demand trends and optimize your availability',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
];

interface AIFeaturesPopupProps {
  triggerAfterResults?: number; // Show after viewing this many results
}

export const AIFeaturesPopup = ({ triggerAfterResults = 3 }: AIFeaturesPopupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if popup should be suppressed
  const shouldSuppressPopup = () => {
    if (user || hasShown) return true;
    
    const dismissedAt = localStorage.getItem('ai_popup_dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < twentyFourHours) {
        return true;
      }
    }
    return false;
  };

  const showPopup = () => {
    if (shouldSuppressPopup()) return;
    setIsOpen(true);
    setHasShown(true);
  };

  // Exit intent detection
  useEffect(() => {
    if (shouldSuppressPopup()) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Detect when mouse moves to top of viewport (exit intent)
      if (e.clientY <= 5 && e.relatedTarget === null) {
        showPopup();
      }
    };

    // Add listener after a short delay to avoid triggering immediately
    const setupTimer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 2000);

    return () => {
      clearTimeout(setupTimer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [user, hasShown]);

  // Fallback: Show popup after browsing time
  useEffect(() => {
    if (shouldSuppressPopup()) return;

    const timer = setTimeout(() => {
      showPopup();
    }, 12000); // Increased to 12 seconds as fallback

    return () => clearTimeout(timer);
  }, [user, hasShown]);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('ai_popup_dismissed', Date.now().toString());
  };

  const handleSignUp = () => {
    handleDismiss();
    navigate('/auth?tab=signup');
  };

  const handleSignIn = () => {
    handleDismiss();
    navigate('/auth?tab=login');
  };

  // Don't render for logged-in users
  if (user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 bg-transparent">
        <div className="relative bg-gradient-to-br from-background via-background to-primary/5 rounded-2xl border shadow-2xl">
          {/* Header with gradient background */}
          <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 px-6 pt-6 pb-8">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/50 hover:bg-background"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Icon and title */}
            <div className="relative flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white shadow-lg shadow-primary/25">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Unlock AI-Powered Tools</h2>
                <p className="text-sm text-muted-foreground">Join Vendibook to supercharge your business</p>
              </div>
            </div>
          </div>

          {/* Features grid */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              {AI_FEATURES.map((feature, index) => (
                <div
                  key={index}
                  className="group p-3 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${feature.bg} mb-2`}>
                    <feature.icon className={`h-4 w-4 ${feature.color}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1 text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Free tier callout */}
            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">Free to start</span>
                <span className="text-xs text-muted-foreground">• No credit card required</span>
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="px-6 pb-6 space-y-3">
            <Button
              onClick={handleSignUp}
              className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-semibold shadow-lg shadow-primary/25"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Already have an account?</span>
              <button
                onClick={handleSignIn}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIFeaturesPopup;
