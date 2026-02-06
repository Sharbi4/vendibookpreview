import React, { useState, useMemo } from 'react';
import { Calendar, DollarSign, Sparkles, Loader2, TrendingUp, TrendingDown, Target, Wallet, Info, Zap, CreditCard, Banknote, Check } from 'lucide-react';
import { ListingFormData, FreightPayer } from '@/types/listing';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateRentalFees,
  calculateSaleFees,
  formatCurrency,
  RENTAL_HOST_FEE_PERCENT,
  SALE_SELLER_FEE_PERCENT,
} from '@/lib/commissions';
import { FreightSettingsCard } from '@/components/freight';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { StripeConnectBanner } from './StripeConnectBanner';

interface StepPricingProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
}

interface RentalSuggestions {
  daily_low: number;
  daily_suggested: number;
  daily_high: number;
  weekly_low: number;
  weekly_suggested: number;
  weekly_high: number;
  reasoning: string;
  confidence?: 'low' | 'medium' | 'high';
  factors?: string[];
}

interface SaleSuggestions {
  sale_low: number;
  sale_suggested: number;
  sale_high: number;
  reasoning: string;
  confidence?: 'low' | 'medium' | 'high';
  factors?: string[];
}

export const StepPricing: React.FC<StepPricingProps> = ({
  formData,
  updateField,
}) => {
  const isRental = formData.mode === 'rent';
  const { toast } = useToast();
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [rentalSuggestions, setRentalSuggestions] = useState<RentalSuggestions | null>(null);
  const [saleSuggestions, setSaleSuggestions] = useState<SaleSuggestions | null>(null);

  // Calculate payout estimates
  const rentalPayoutEstimates = useMemo(() => {
    const dailyPrice = parseFloat(formData.price_daily) || 0;
    const weeklyPrice = parseFloat(formData.price_weekly) || 0;
    const monthlyPrice = parseFloat(formData.price_monthly) || 0;
    
    return {
      daily: dailyPrice > 0 ? calculateRentalFees(dailyPrice) : null,
      weekly: weeklyPrice > 0 ? calculateRentalFees(weeklyPrice) : null,
      monthly: monthlyPrice > 0 ? calculateRentalFees(monthlyPrice) : null,
    };
  }, [formData.price_daily, formData.price_weekly, formData.price_monthly]);

  // For sales with seller-paid freight, we need estimated freight cost (placeholder for now)
  const estimatedFreightCost = 500; // Placeholder - in production, this would be dynamically calculated
  
  const salePayoutEstimate = useMemo(() => {
    const salePrice = parseFloat(formData.price_sale) || 0;
    if (salePrice <= 0) return null;
    
    const isSellerPaidFreight = formData.vendibook_freight_enabled && formData.freight_payer === 'seller';
    const freightCost = formData.vendibook_freight_enabled ? estimatedFreightCost : 0;
    
    return calculateSaleFees(salePrice, freightCost, isSellerPaidFreight);
  }, [formData.price_sale, formData.vendibook_freight_enabled, formData.freight_payer]);

  const getLocation = () => {
    if (formData.address) return formData.address;
    if (formData.pickup_location_text) return formData.pickup_location_text;
    return '';
  };

  const handleGetSuggestions = async () => {
    if (!formData.title || !formData.category) {
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
          title: formData.title,
          category: formData.category,
          location: getLocation(),
          mode: formData.mode,
          description: formData.description,
          amenities: formData.amenities,
          highlights: formData.highlights,
          dimensions: {
            length: formData.length_inches ? Number(formData.length_inches) : undefined,
            width: formData.width_inches ? Number(formData.width_inches) : undefined,
            height: formData.height_inches ? Number(formData.height_inches) : undefined,
            weight: formData.weight_lbs ? Number(formData.weight_lbs) : undefined,
          },
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (isRental) {
        setRentalSuggestions(data as RentalSuggestions);
      } else {
        setSaleSuggestions(data as SaleSuggestions);
      }

      toast({
        title: 'Suggestions ready!',
        description: 'AI pricing suggestions have been generated based on your listing details.',
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

  const applyRentalSuggestion = (type: 'low' | 'suggested' | 'high') => {
    if (!rentalSuggestions) return;
    
    const dailyKey = `daily_${type}` as keyof RentalSuggestions;
    const weeklyKey = `weekly_${type}` as keyof RentalSuggestions;
    
    updateField('price_daily', String(rentalSuggestions[dailyKey]));
    updateField('price_weekly', String(rentalSuggestions[weeklyKey]));
  };

  const applySaleSuggestion = (type: 'low' | 'suggested' | 'high') => {
    if (!saleSuggestions) return;
    
    const key = `sale_${type}` as keyof SaleSuggestions;
    updateField('price_sale', String(saleSuggestions[key]));
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Core Price */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            {isRental ? 'Rental Rates' : 'Sale Price'}
          </h3>
          {/* Inline AI Button - subtle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGetSuggestions}
            disabled={isLoadingSuggestions}
            className="text-primary h-8"
          >
            {isLoadingSuggestions ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                AI Pricing
              </>
            )}
          </Button>
        </div>

        {isRental ? (
          <>
            {/* Rental Suggestions - Compact */}
            {rentalSuggestions && (
              <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyRentalSuggestion('low')}
                    className="p-2 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-0.5">
                      <TrendingDown className="w-3 h-3" />
                      Budget
                    </div>
                    <div className="font-semibold text-sm">${rentalSuggestions.daily_low}/day</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => applyRentalSuggestion('suggested')}
                    className="p-2 rounded-lg border-2 border-primary bg-primary/10 hover:bg-primary/15 transition-all text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-primary text-xs mb-0.5">
                      <Target className="w-3 h-3" />
                      Best
                    </div>
                    <div className="font-semibold text-sm">${rentalSuggestions.daily_suggested}/day</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => applyRentalSuggestion('high')}
                    className="p-2 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-0.5">
                      <TrendingUp className="w-3 h-3" />
                      Premium
                    </div>
                    <div className="font-semibold text-sm">${rentalSuggestions.daily_high}/day</div>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">{rentalSuggestions.reasoning}</p>
              </div>
            )}

            {/* Price Inputs - More Prominent */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price_daily" className="text-base font-medium">Daily Rate *</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                  <Input
                    id="price_daily"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_daily}
                    onChange={(e) => updateField('price_daily', e.target.value)}
                    placeholder="0"
                    className="pl-9 text-2xl font-bold h-14"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_weekly" className="text-base font-medium text-muted-foreground">
                  Weekly Rate <span className="text-xs text-green-600">(Save 15%)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                  <Input
                    id="price_weekly"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_weekly}
                    onChange={(e) => updateField('price_weekly', e.target.value)}
                    placeholder="0"
                    className="pl-9 text-xl h-14"
                  />
                </div>
              </div>
            </div>

            {/* Monthly Rate */}
            <div className="space-y-2">
              <Label htmlFor="price_monthly" className="text-base font-medium text-muted-foreground">
                Monthly Rate <span className="text-xs text-green-600">(Best Value)</span>
              </Label>
              <div className="relative max-w-xs">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                <Input
                  id="price_monthly"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_monthly}
                  onChange={(e) => updateField('price_monthly', e.target.value)}
                  placeholder="0"
                  className="pl-9 text-xl h-14"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Attract long-term renters with a discounted monthly rate.
              </p>
            </div>

            {/* Payout Estimate - Compact */}
            {(rentalPayoutEstimates.daily || rentalPayoutEstimates.weekly || rentalPayoutEstimates.monthly) && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
                <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {rentalPayoutEstimates.daily && (
                    <span>
                      Daily: <span className="font-semibold text-primary">{formatCurrency(rentalPayoutEstimates.daily.hostReceives)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({RENTAL_HOST_FEE_PERCENT}% fee)</span>
                    </span>
                  )}
                  {rentalPayoutEstimates.weekly && (
                    <span>
                      Weekly: <span className="font-semibold text-primary">{formatCurrency(rentalPayoutEstimates.weekly.hostReceives)}</span>
                    </span>
                  )}
                  {rentalPayoutEstimates.monthly && (
                    <span>
                      Monthly: <span className="font-semibold text-primary">{formatCurrency(rentalPayoutEstimates.monthly.hostReceives)}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Sale Suggestions - Compact */}
            {saleSuggestions && (
              <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applySaleSuggestion('low')}
                    className="p-2 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-0.5">
                      <TrendingDown className="w-3 h-3" />
                      Quick
                    </div>
                    <div className="font-semibold text-sm">${saleSuggestions.sale_low.toLocaleString()}</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => applySaleSuggestion('suggested')}
                    className="p-2 rounded-lg border-2 border-primary bg-primary/10 hover:bg-primary/15 transition-all text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-primary text-xs mb-0.5">
                      <Target className="w-3 h-3" />
                      Best
                    </div>
                    <div className="font-semibold text-sm">${saleSuggestions.sale_suggested.toLocaleString()}</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => applySaleSuggestion('high')}
                    className="p-2 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-center"
                  >
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-0.5">
                      <TrendingUp className="w-3 h-3" />
                      Premium
                    </div>
                    <div className="font-semibold text-sm">${saleSuggestions.sale_high.toLocaleString()}</div>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">{saleSuggestions.reasoning}</p>
              </div>
            )}

            {/* Sale Price Input - Hero */}
            <div className="max-w-md">
              <Label htmlFor="price_sale" className="text-base font-medium">Asking Price *</Label>
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">$</span>
                <Input
                  id="price_sale"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_sale}
                  onChange={(e) => updateField('price_sale', e.target.value)}
                  placeholder="0.00"
                  className="pl-10 text-3xl font-bold h-16"
                />
              </div>
            </div>

            {/* Payout Estimate - Compact */}
            {salePayoutEstimate && formData.accept_card_payment && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/60 max-w-md">
                <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 text-sm">
                  <span>You receive: </span>
                  <span className="font-semibold text-primary">{formatCurrency(salePayoutEstimate.sellerReceives)}</span>
                  <span className="text-xs text-muted-foreground ml-2">({SALE_SELLER_FEE_PERCENT}% fee)</span>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <div className="h-px bg-border" />

      {/* Section 2: Financial Settings - 2-column grid */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Protection */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Protection</h4>
          
          {isRental ? (
            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium">Security Deposit</Label>
                <InfoTooltip content="Refundable amount held during rental" />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.deposit_amount}
                  onChange={(e) => updateField('deposit_amount', e.target.value)}
                  placeholder="e.g., 500"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Typical deposits are $200-$1,000 depending on equipment value.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-border bg-card">
              <Label className="font-medium mb-3 block">Payment Methods</Label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox 
                    checked={formData.accept_card_payment} 
                    onCheckedChange={(c) => updateField('accept_card_payment', !!c)} 
                  />
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span className="text-sm">Pay by Card (Online)</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox 
                    checked={formData.accept_cash_payment} 
                    onCheckedChange={(c) => updateField('accept_cash_payment', !!c)} 
                  />
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Pay in Person</span>
                  </div>
                </label>
              </div>
              {!formData.accept_card_payment && !formData.accept_cash_payment && (
                <p className="text-xs text-destructive mt-3 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Select at least one payment method
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Settings</h4>
          
          {isRental && (
            <div className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <Label className="font-medium">Instant Book</Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-accept bookings from verified users
                </p>
              </div>
              <Switch
                checked={formData.instant_book}
                onCheckedChange={(checked) => updateField('instant_book', checked)}
              />
            </div>
          )}
          
          {/* Availability Window - Compact */}
          {isRental && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Availability Window</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="text-sm flex-1"
                  value={formData.available_from}
                  onChange={(e) => updateField('available_from', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  className="text-sm flex-1"
                  value={formData.available_to}
                  onChange={(e) => updateField('available_to', e.target.value)}
                  min={formData.available_from || new Date().toISOString().split('T')[0]}
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave blank for open availability</p>
            </div>
          )}

          {/* Stripe Banner for card payments */}
          {formData.accept_card_payment && !isRental && (
            <StripeConnectBanner variant="compact" />
          )}
        </div>
      </section>

      {/* Section 3: Logistics (Sale only) */}
      {!isRental && (
        <section className="pt-6 border-t border-border">
          <FreightSettingsCard
            enabled={formData.vendibook_freight_enabled}
            payer={formData.freight_payer}
            onEnabledChange={(enabled) => updateField('vendibook_freight_enabled', enabled)}
            onPayerChange={(payer) => updateField('freight_payer', payer)}
          />
        </section>
      )}
    </div>
  );
};
