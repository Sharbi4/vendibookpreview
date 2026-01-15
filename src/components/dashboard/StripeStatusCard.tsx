import { Check, Loader2, ArrowRight, ExternalLink, CreditCard, Wallet, TrendingUp, Shield, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StripeLogo } from '@/components/ui/StripeLogo';
import { Progress } from '@/components/ui/progress';

interface StripeStatusCardProps {
  isConnected: boolean;
  hasAccountStarted: boolean;
  isLoading: boolean;
  isOpeningDashboard?: boolean;
  onConnect: () => void;
  onOpenDashboard?: () => void;
}

const StripeStatusCard = ({ 
  isConnected, 
  hasAccountStarted, 
  isLoading, 
  isOpeningDashboard,
  onConnect,
  onOpenDashboard 
}: StripeStatusCardProps) => {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:via-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/30 dark:bg-emerald-700/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Check className="h-6 w-6 text-white" strokeWidth={3} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-emerald-900 rounded-full flex items-center justify-center border-2 border-emerald-500">
                <Shield className="h-3 w-3 text-emerald-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StripeLogo size="sm" />
                <span className="font-bold text-emerald-800 dark:text-emerald-200 text-lg">Connected</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-300">
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  Accept payments
                </span>
                <span className="text-emerald-400">•</span>
                <span className="flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" />
                  Receive payouts
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onOpenDashboard && (
              <Button 
                onClick={onOpenDashboard}
                variant="outline"
                className="border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 bg-white/50 dark:bg-emerald-950/50"
                disabled={isOpeningDashboard}
              >
                {isOpeningDashboard ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2" />
                )}
                <StripeLogo size="xs" />
                <span className="ml-1.5">Dashboard</span>
                <ExternalLink className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // User started onboarding but didn't complete it
  if (hasAccountStarted) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-violet-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 dark:bg-blue-700/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Clock className="h-6 w-6 text-white animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white dark:border-blue-900">
                  <AlertCircle className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-blue-800 dark:text-blue-200 text-lg">Almost There!</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Complete your <StripeLogo size="xs" className="inline mx-0.5" /> setup to start accepting payments
                </p>
              </div>
            </div>
            <Button 
              onClick={onConnect}
              className="bg-gradient-to-r from-[#635bff] to-[#7c75ff] hover:from-[#5850e6] hover:to-[#6b65e6] shadow-lg shadow-[#635bff]/25"
            >
              <StripeLogo size="sm" className="mr-2 brightness-0 invert" />
              Continue Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 dark:text-blue-300 font-medium">Setup Progress</span>
              <span className="text-blue-600 dark:text-blue-400">50%</span>
            </div>
            <Progress value={50} className="h-2 bg-blue-100 dark:bg-blue-900" />
            <div className="flex items-center gap-4 text-xs text-blue-600 dark:text-blue-400 mt-2">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-500" />
                Account created
              </span>
              <span className="flex items-center gap-1 opacity-60">
                <Clock className="h-3 w-3" />
                Verification pending
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 dark:bg-amber-700/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-amber-800 dark:text-amber-200 text-lg">Connect</span>
              <StripeLogo size="sm" />
              <span className="font-bold text-amber-800 dark:text-amber-200 text-lg">to Publish</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Set up payouts to start accepting bookings and sales
            </p>
          </div>
        </div>
        <Button 
          onClick={onConnect}
          className="bg-gradient-to-r from-[#635bff] to-[#7c75ff] hover:from-[#5850e6] hover:to-[#6b65e6] shadow-lg shadow-[#635bff]/25"
        >
          <StripeLogo size="sm" className="mr-2 brightness-0 invert" />
          Connect Stripe
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      
      {/* Benefits list */}
      <div className="relative mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-800/50">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Secure payments</span>
          </div>
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <CreditCard className="h-4 w-4 text-blue-500" />
            <span>Cards, Apple Pay & more</span>
          </div>
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>2-7 day payouts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeStatusCard;
