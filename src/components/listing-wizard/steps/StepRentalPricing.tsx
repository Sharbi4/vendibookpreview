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
  priceMonthly: string;
  priceHourly: string;
  depositAmount: string;
  instantBook: boolean;
  hourlyEnabled: boolean;
  dailyEnabled: boolean;
  onPriceDailyChange: (value: string) => void;
  onPriceWeeklyChange: (value: string) => void;
  onPriceMonthlyChange: (value: string) => void;
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
  priceMonthly,
  priceHourly,
  depositAmount,
  instantBook,
  hourlyEnabled,
  dailyEnabled,
  onPriceDailyChange,
  onPriceWeeklyChange,
  onPriceMonthlyChange,
  onPriceHourlyChange,
  onDepositAmountChange,
  onInstantBookChange,
  onHourlyEnabledChange,
  onDailyEnabledChange,
}) => {
  const { toast } = useToast();
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<RentalSuggestions | null>(null);

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

  const payoutEstimates = useMemo(() => {
    const dailyPrice = parseFloat(priceDaily) || 0;
    const weeklyPrice = parseFloat(priceWeekly) || 0;
    const monthlyPrice = parseFloat(priceMonthly) || 0;
    const hourlyPrice = parseFloat(priceHourly) || 0;
    
    return {
      daily: dailyPrice > 0 ? calculateRentalFees(dailyPrice) : null,
      weekly: weeklyPrice > 0 ? calculateRentalFees(weeklyPrice) : null,
      monthly: monthlyPrice > 0 ? calculateRentalFees(monthlyPrice) : null,
      hourly: hourlyPrice > 0 ? calculateRentalFees(hourlyPrice) : null,
    };
  }, [priceDaily, priceWeekly, priceMonthly, priceHourly]);

  const handleGetSuggestions = async () => {
    if (!title || !category) {
      toast({
        title: 'Missing information',
        description: 'Please add a title and category first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-pricing', {
        body: { title, category, location, mode: 'rent', description },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSuggestions(data as RentalSuggestions);
      toast({ title: 'Suggestions ready!' });
    } catch (error) {
      toast({
        title: 'Could not get suggestions',
        description: error instanceof Error ? error.message : 'Please try again.',
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
    <div className="space-y-6">
      {/* Page Header with Inline AI Button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Set your pricing</h2>
            <p className="text-muted-foreground text-sm">
              Set competitive rates to attract renters.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGetSuggestions}
          disabled={isLoadingSuggestions}
          className="text-primary h-8 shrink-0"
        >
          {isLoadingSuggestions ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Analyzing
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI Help
            </>
          )}
        </Button>
      </div>

      {/* AI Suggestions */}
      {suggestions && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Suggested Pricing
          </h4>
          
          <div className="grid grid-cols-3 gap-2">
            {[
              { type: 'low' as const, label: 'Budget', icon: TrendingDown },
              { type: 'suggested' as const, label: 'Recommended', icon: Target },
              { type: 'high' as const, label: 'Premium', icon: TrendingUp },
            ].map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => applySuggestion(type)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  type === 'suggested'
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <div className={cn(
                  "flex items-center gap-1 text-xs mb-1",
                  type === 'suggested' ? "text-primary" : "text-muted-foreground"
                )}>
                  <Icon className="w-3 h-3" />
                  {label}
                </div>
                <div className="font-bold text-sm text-foreground">${suggestions[`daily_${type}`]}/day</div>
                <div className="text-xs text-muted-foreground">${suggestions[`weekly_${type}`]}/wk</div>
              </button>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground italic">{suggestions.reasoning}</p>
        </div>
      )}

      {/* Booking Type */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">Booking Type</Label>
        </div>
        <RadioGroup
          value={bookingType}
          onValueChange={(v) => handleBookingTypeChange(v as BookingType)}
          className="grid grid-cols-3 gap-2"
        >
          {[
            { value: 'daily', label: 'Daily', desc: 'Full day' },
            { value: 'hourly', label: 'Hourly', desc: 'By the hour' },
            { value: 'both', label: 'Both', desc: 'Both options' },
          ].map((opt) => (
            <Label
              key={opt.value}
              htmlFor={opt.value}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl border cursor-pointer transition-all text-center",
                bookingType === opt.value 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/40"
              )}
            >
              <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
              <span className="font-medium text-sm text-foreground">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.desc}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Pricing Inputs */}
      <div className="space-y-4">
        {(bookingType === 'hourly' || bookingType === 'both') && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Hourly Rate *</Label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={priceHourly}
                onChange={(e) => onPriceHourlyChange(e.target.value)}
                placeholder="0"
                className="pl-7 pr-14 h-12 text-lg font-semibold bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/hour</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Price per hour before any fees. Tip: Set this to about 10-15% of your daily rate.
            </p>
          </div>
        )}

        {(bookingType === 'daily' || bookingType === 'both') && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Daily Rate *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={priceDaily}
                    onChange={(e) => onPriceDailyChange(e.target.value)}
                    placeholder="0"
                    className="pl-7 pr-12 h-12 text-lg font-semibold bg-background"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/day</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your base daily rental price before platform fees.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Weekly Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={priceWeekly}
                    onChange={(e) => onPriceWeeklyChange(e.target.value)}
                    placeholder="0"
                    className="pl-7 pr-12 h-12 text-lg font-semibold bg-background"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/wk</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Offer a 10-20% discount for 7+ day rentals.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Monthly Rate</Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={priceMonthly}
                  onChange={(e) => onPriceMonthlyChange(e.target.value)}
                  placeholder="0"
                  className="pl-7 pr-14 h-12 text-lg font-semibold bg-background"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Offer a discount for long-term rentals (30+ days).
              </p>
            </div>
          </div>
        )}

        {/* Payout Estimate */}
        {(payoutEstimates.daily || payoutEstimates.weekly || payoutEstimates.monthly || payoutEstimates.hourly) && (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Wallet className="w-4 h-4 text-foreground" />
              </div>
              <h4 className="font-semibold text-sm text-foreground">Your Payout</h4>
            </div>
            <div className="space-y-2">
              {payoutEstimates.hourly && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hourly:</span>
                  <span className="font-semibold text-primary">{formatCurrency(payoutEstimates.hourly.hostReceives)}</span>
                </div>
              )}
              {payoutEstimates.daily && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daily:</span>
                  <span className="font-semibold text-primary">{formatCurrency(payoutEstimates.daily.hostReceives)}</span>
                </div>
              )}
              {payoutEstimates.weekly && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Weekly:</span>
                  <span className="font-semibold text-primary">{formatCurrency(payoutEstimates.weekly.hostReceives)}</span>
                </div>
              )}
              {payoutEstimates.monthly && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly:</span>
                  <span className="font-semibold text-primary">{formatCurrency(payoutEstimates.monthly.hostReceives)}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {RENTAL_HOST_FEE_PERCENT}% platform fee
            </p>
          </div>
        )}
      </div>

      {/* Security Deposit */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-foreground">Security Deposit</Label>
          <span className="text-xs text-muted-foreground">(Optional)</span>
        </div>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            type="number"
            min="0"
            step="1"
            value={depositAmount}
            onChange={(e) => onDepositAmountChange(e.target.value)}
            placeholder="0"
            className="pl-7 bg-background"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Refundable deposit held during the rental period.
        </p>
      </div>

      {/* Instant Book */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-foreground">Instant Book</h4>
              <p className="text-xs text-muted-foreground">
                Renters can book immediately without waiting for your approval. Listings with instant book get more bookings.
              </p>
            </div>
          </div>
          <Switch
            checked={instantBook}
            onCheckedChange={onInstantBookChange}
          />
        </div>
      </div>
    </div>
  );
};
