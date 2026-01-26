import React, { useState, useMemo } from 'react';
import { DollarSign, Sparkles, Loader2, TrendingUp, TrendingDown, Target, Wallet, Info, Zap, Shield, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  calculateRentalFees,
  formatCurrency,
  RENTAL_HOST_FEE_PERCENT,
} from '@/lib/commissions';

interface RentalSuggestions {
  daily_low: number;
  daily_suggested: number;
  daily_high: number;
  weekly_low: number;
  weekly_suggested: number;
  weekly_high: number;
  reasoning: string;
  confidence?: 'low' | 'medium' | 'high';
}

type BookingType = 'daily' | 'hourly' | 'both';

interface StepRentalPricingProps {
  title: string;
  category: string | null;
  description: string;
  location: string;
  priceDaily: string;
  priceWeekly: string;
  priceHourly: string;
  depositAmount: string;
  instantBook: boolean;
  hourlyEnabled: boolean;
  dailyEnabled: boolean;
  onPriceDailyChange: (value: string) => void;
  onPriceWeeklyChange: (value: string) => void;
  onPriceHourlyChange: (value: string) => void;
  onDepositAmountChange: (value: string) => void;
  onInstantBookChange: (value: boolean) => void;
  onHourlyEnabledChange: (value: boolean) => void;
  onDailyEnabledChange: (value: boolean) => void;
}

export const StepRentalPricing: React.FC<StepRentalPricingProps> = ({
  title,
  category,
  description,
  location,
  priceDaily,
  priceWeekly,
  priceHourly,
  depositAmount,
  instantBook,
  hourlyEnabled,
  dailyEnabled,
  onPriceDailyChange,
  onPriceWeeklyChange,
  onPriceHourlyChange,
  onDepositAmountChange,
  onInstantBookChange,
  onHourlyEnabledChange,
  onDailyEnabledChange,
}) => {
  const { toast } = useToast();
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<RentalSuggestions | null>(null);

  // Derive booking type from enabled flags
  const bookingType: BookingType = hourlyEnabled && dailyEnabled ? 'both' : hourlyEnabled ? 'hourly' : 'daily';

  const handleBookingTypeChange = (type: BookingType) => {
    if (type === 'daily') {
      onDailyEnabledChange(true);
      onHourlyEnabledChange(false);
    } else if (type === 'hourly') {
      onDailyEnabledChange(false);
      onHourlyEnabledChange(true);
    } else {
      onDailyEnabledChange(true);
      onHourlyEnabledChange(true);
    }
  };

  // Calculate payout estimates
  const payoutEstimates = useMemo(() => {
    const dailyPrice = parseFloat(priceDaily) || 0;
    const weeklyPrice = parseFloat(priceWeekly) || 0;
    const hourlyPrice = parseFloat(priceHourly) || 0;
    
    return {
      daily: dailyPrice > 0 ? calculateRentalFees(dailyPrice) : null,
      weekly: weeklyPrice > 0 ? calculateRentalFees(weeklyPrice) : null,
      hourly: hourlyPrice > 0 ? calculateRentalFees(hourlyPrice) : null,
    };
  }, [priceDaily, priceWeekly, priceHourly]);

  const handleGetSuggestions = async () => {
    if (!title || !category) {
      toast({
        title: 'Missing information',
        description: 'Please add a title and category first to get pricing suggestions.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-pricing', {
        body: {
          title,
          category,
          location,
          mode: 'rent',
          description,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSuggestions(data as RentalSuggestions);
      toast({
        title: 'Suggestions ready!',
        description: 'AI pricing suggestions have been generated.',
      });
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        title: 'Could not get suggestions',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const applySuggestion = (type: 'low' | 'suggested' | 'high') => {
    if (!suggestions) return;
    onPriceDailyChange(String(suggestions[`daily_${type}`]));
    onPriceWeeklyChange(String(suggestions[`weekly_${type}`]));
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
          <DollarSign className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Set your pricing</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Set competitive rates to attract renters while maximizing your earnings.
        </p>
      </div>

      {/* AI Pricing Assistant */}
      <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse pointer-events-none" />
        <div className="relative flex items-start gap-3">
          <div className="p-2.5 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">AI Pricing Assistant</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Get smart pricing suggestions based on your listing details and market data.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={handleGetSuggestions}
              disabled={isLoadingSuggestions}
              className="bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
            >
              {isLoadingSuggestions ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing market...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get AI Suggestions
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* AI Suggestions Display */}
      {suggestions && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Suggested Pricing
          </h4>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => applySuggestion('low')}
              className="p-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                <TrendingDown className="w-3 h-3" />
                Budget
              </div>
              <div className="font-bold text-foreground">${suggestions.daily_low}/day</div>
              <div className="text-xs text-muted-foreground">${suggestions.weekly_low}/week</div>
            </button>
            
            <button
              type="button"
              onClick={() => applySuggestion('suggested')}
              className="p-3 rounded-xl border-2 border-primary bg-primary/10 hover:bg-primary/15 transition-all text-left shadow-sm"
            >
              <div className="flex items-center gap-1 text-primary text-xs mb-1">
                <Target className="w-3 h-3" />
                Recommended
              </div>
              <div className="font-bold text-foreground">${suggestions.daily_suggested}/day</div>
              <div className="text-xs text-muted-foreground">${suggestions.weekly_suggested}/week</div>
            </button>
            
            <button
              type="button"
              onClick={() => applySuggestion('high')}
              className="p-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                <TrendingUp className="w-3 h-3" />
                Premium
              </div>
              <div className="font-bold text-foreground">${suggestions.daily_high}/day</div>
              <div className="text-xs text-muted-foreground">${suggestions.weekly_high}/week</div>
            </button>
          </div>
          
          {suggestions.confidence && (
            <div className="flex items-center gap-2 text-xs">
              <span className={cn(
                "px-2 py-0.5 rounded-full font-medium",
                suggestions.confidence === 'high' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : suggestions.confidence === 'medium'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              )}>
                {suggestions.confidence} confidence
              </span>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground italic">
            {suggestions.reasoning}
          </p>
        </div>
      )}

      {/* Booking Type Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <Label className="text-base font-semibold">Booking Type</Label>
        </div>
        <RadioGroup
          value={bookingType}
          onValueChange={(v) => handleBookingTypeChange(v as BookingType)}
          className="grid grid-cols-3 gap-3"
        >
          <Label
            htmlFor="daily"
            className={cn(
              "flex flex-col items-center gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all",
              bookingType === 'daily' 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="daily" id="daily" className="sr-only" />
            <span className="font-medium">Daily Only</span>
            <span className="text-xs text-muted-foreground text-center">Full day rentals</span>
          </Label>
          <Label
            htmlFor="hourly"
            className={cn(
              "flex flex-col items-center gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all",
              bookingType === 'hourly' 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="hourly" id="hourly" className="sr-only" />
            <span className="font-medium">Hourly Only</span>
            <span className="text-xs text-muted-foreground text-center">By the hour</span>
          </Label>
          <Label
            htmlFor="both"
            className={cn(
              "flex flex-col items-center gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all",
              bookingType === 'both' 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="both" id="both" className="sr-only" />
            <span className="font-medium">Both</span>
            <span className="text-xs text-muted-foreground text-center">Hourly & Daily</span>
          </Label>
        </RadioGroup>
      </div>

      {/* Pricing Inputs */}
      <div className="space-y-4">
        {/* Hourly Rate - shown when hourly or both */}
        {(bookingType === 'hourly' || bookingType === 'both') && (
          <div className="space-y-2">
            <Label htmlFor="price_hourly" className="text-base font-semibold">Hourly Rate *</Label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
              <Input
                id="price_hourly"
                type="number"
                min="0"
                step="1"
                value={priceHourly}
                onChange={(e) => onPriceHourlyChange(e.target.value)}
                placeholder="0"
                className="pl-8 text-xl h-14 font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">/hour</span>
            </div>
            <p className="text-xs text-muted-foreground">Set your rate for hourly bookings</p>
          </div>
        )}

        {/* Daily & Weekly Rates - shown when daily or both */}
        {(bookingType === 'daily' || bookingType === 'both') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_daily" className="text-base font-semibold">Daily Rate *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                <Input
                  id="price_daily"
                  type="number"
                  min="0"
                  step="1"
                  value={priceDaily}
                  onChange={(e) => onPriceDailyChange(e.target.value)}
                  placeholder="0"
                  className="pl-8 text-xl h-14 font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">/day</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_weekly" className="text-base font-semibold">Weekly Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                <Input
                  id="price_weekly"
                  type="number"
                  min="0"
                  step="1"
                  value={priceWeekly}
                  onChange={(e) => onPriceWeeklyChange(e.target.value)}
                  placeholder="0"
                  className="pl-8 text-xl h-14 font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">/week</span>
              </div>
              <p className="text-xs text-muted-foreground">Offer a discount for weekly rentals</p>
            </div>
          </div>
        )}

        {/* Payout Estimate */}
        {(payoutEstimates.daily || payoutEstimates.weekly || payoutEstimates.hourly) && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-muted rounded-xl">
                <Wallet className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2">Your Estimated Payout</h4>
                <div className="space-y-2">
                  {payoutEstimates.hourly && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Hourly rental:</span>
                      <div className="text-right">
                        <span className="font-bold text-lg text-primary">
                          {formatCurrency(payoutEstimates.hourly.hostReceives)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({formatCurrency(payoutEstimates.hourly.hostFee)} fee)
                        </span>
                      </div>
                    </div>
                  )}
                  {payoutEstimates.daily && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Daily rental:</span>
                      <div className="text-right">
                        <span className="font-bold text-lg text-primary">
                          {formatCurrency(payoutEstimates.daily.hostReceives)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({formatCurrency(payoutEstimates.daily.hostFee)} fee)
                        </span>
                      </div>
                    </div>
                  )}
                  {payoutEstimates.weekly && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Weekly rental:</span>
                      <div className="text-right">
                        <span className="font-bold text-lg text-primary">
                          {formatCurrency(payoutEstimates.weekly.hostReceives)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({formatCurrency(payoutEstimates.weekly.hostFee)} fee)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-1.5 mt-3 text-xs text-muted-foreground">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Platform fee is {RENTAL_HOST_FEE_PERCENT}% of the rental price</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Security Deposit */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <Label htmlFor="deposit" className="text-base font-semibold">Security Deposit</Label>
          <span className="text-sm text-muted-foreground">(Optional)</span>
        </div>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="deposit"
            type="number"
            min="0"
            step="1"
            value={depositAmount}
            onChange={(e) => onDepositAmountChange(e.target.value)}
            placeholder="0"
            className="pl-7"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          A refundable deposit held during the rental period for peace of mind.
        </p>
      </div>

      {/* Instant Book */}
      <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-foreground">Instant Book</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Allow renters to book immediately without waiting for your approval.
                </p>
              </div>
              <Switch
                checked={instantBook}
                onCheckedChange={onInstantBookChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
