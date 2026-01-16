import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Clock, 
  Users, 
  Zap, 
  Gift, 
  ArrowRight,
  X,
  Lock,
  TrendingUp
} from 'lucide-react';

interface FounderPricingOverlayProps {
  onDismiss: () => void;
  onClaim: () => void;
}

const FounderPricingOverlay = ({ onDismiss, onClaim }: FounderPricingOverlayProps) => {
  // Simulated spots remaining - in production, this would come from a database
  const [spotsRemaining, setSpotsRemaining] = useState(847);
  const totalSpots = 1000;
  const spotsTaken = totalSpots - spotsRemaining;
  const percentageTaken = Math.round((spotsTaken / totalSpots) * 100);

  // Subtle animation for urgency - occasionally decrease spots
  useEffect(() => {
    const interval = setInterval(() => {
      // Random chance to decrease spots (simulates real-time signups)
      if (Math.random() < 0.1 && spotsRemaining > 100) {
        setSpotsRemaining(prev => prev - 1);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [spotsRemaining]);

  const benefits = [
    { icon: Lock, text: 'Locked-in price forever' },
    { icon: Zap, text: 'Priority access to new tools' },
    { icon: Gift, text: 'Exclusive founder badge' },
    { icon: TrendingUp, text: 'Early adopter community' },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Gradient overlay banner */}
      <div className="bg-gradient-to-r from-primary via-amber-500 to-orange-500 text-white py-3 px-4">
        <div className="container flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{spotsRemaining} spots left</span>
            </div>
            <span className="text-sm sm:text-base font-medium">
              🔥 <span className="font-bold">Founder Pricing:</span> $49.99/mo 
              <span className="line-through opacity-70 ml-2">$99/mo</span>
              <span className="hidden sm:inline ml-2 text-white/90">for the first 1,000 users</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="secondary" 
              className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
              onClick={onClaim}
            >
              Claim Your Spot
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <button 
              onClick={onDismiss}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating card - positioned strategically */}
      <div className="container py-6">
        <div className="max-w-xl mx-auto">
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer pointer-events-none" />
            
            {/* Corner badge */}
            <div className="absolute -top-0 -right-0">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                SAVE 50%
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary via-amber-500 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div>
                  <Badge className="mb-2 bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Clock className="h-3 w-3 mr-1" />
                    Limited Time Offer
                  </Badge>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                    Join 1,000 Founding Members
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Lock in founder pricing before it's gone
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{spotsTaken} founders joined</span>
                  <span className="font-semibold text-primary">{spotsRemaining} spots remaining</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${percentageTaken}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>

              {/* Pricing comparison */}
              <div className="bg-muted/50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Founder Price</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">$49.99</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">After 1,000 users</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl text-muted-foreground line-through">$99</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    You save $588/year — forever
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    {benefit.text}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button 
                onClick={onClaim}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary via-amber-500 to-orange-500 hover:opacity-90 transition-opacity shadow-lg"
              >
                <Lock className="h-5 w-5 mr-2" />
                Lock In Founder Pricing
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                No commitment • Cancel anytime • Full access to all 6 AI tools
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FounderPricingOverlay;
