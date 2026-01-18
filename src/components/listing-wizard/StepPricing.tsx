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
    
    return {
      daily: dailyPrice > 0 ? calculateRentalFees(dailyPrice) : null,
      weekly: weeklyPrice > 0 ? calculateRentalFees(weeklyPrice) : null,
    };
  }, [formData.price_daily, formData.price_weekly]);

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
    <div className="space-y-6">
      {/* AI Suggestions Button */}
      <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse pointer-events-none" />
        <div className="relative flex items-start gap-3">
          <div className="p-2.5 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">AI Pricing Assistant</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Get smart pricing suggestions based on your listing details, equipment, and location.
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

      {isRental ? (
        <>
          {/* Rental Suggestions Display */}
          {rentalSuggestions && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Suggested Pricing
              </h4>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => applyRentalSuggestion('low')}
                  className="p-3 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <TrendingDown className="w-3 h-3" />
                    Budget
                  </div>
                  <div className="font-semibold text-foreground">${rentalSuggestions.daily_low}/day</div>
                  <div className="text-xs text-muted-foreground">${rentalSuggestions.weekly_low}/week</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => applyRentalSuggestion('suggested')}
                  className="p-3 rounded-lg border-2 border-primary bg-primary/10 hover:bg-primary/15 transition-all text-left shadow-sm"
                >
                  <div className="flex items-center gap-1 text-primary text-xs mb-1">
                    <Target className="w-3 h-3" />
                    Recommended
                  </div>
                  <div className="font-semibold text-foreground">${rentalSuggestions.daily_suggested}/day</div>
                  <div className="text-xs text-muted-foreground">${rentalSuggestions.weekly_suggested}/week</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => applyRentalSuggestion('high')}
                  className="p-3 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Premium
                  </div>
                  <div className="font-semibold text-foreground">${rentalSuggestions.daily_high}/day</div>
                  <div className="text-xs text-muted-foreground">${rentalSuggestions.weekly_high}/week</div>
                </button>
              </div>

              {/* Confidence and Factors */}
              {rentalSuggestions.confidence && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    rentalSuggestions.confidence === 'high' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : rentalSuggestions.confidence === 'medium'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {rentalSuggestions.confidence} confidence
                  </span>
                  {rentalSuggestions.factors && rentalSuggestions.factors.length > 0 && (
                    <span className="text-muted-foreground">
                      Based on: {rentalSuggestions.factors.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
              )}
              
              <p className="text-sm text-muted-foreground italic">
                {rentalSuggestions.reasoning}
              </p>
            </div>
          )}

          {/* Rental Pricing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Rental Pricing</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_daily" className="text-base font-medium">Daily Rate *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="price_daily"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_daily}
                    onChange={(e) => updateField('price_daily', e.target.value)}
                    placeholder="0.00"
                    className="pl-7 text-lg"
                  />
                </div>
                <p className="text-sm text-muted-foreground">Price per day</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_weekly" className="text-base font-medium">Weekly Rate (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="price_weekly"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_weekly}
                    onChange={(e) => updateField('price_weekly', e.target.value)}
                    placeholder="0.00"
                    className="pl-7 text-lg"
                  />
                </div>
                <p className="text-sm text-muted-foreground">Offer a discount for weekly rentals</p>
              </div>
            </div>

            {/* Payout Estimate for Rentals */}
            {(rentalPayoutEstimates.daily || rentalPayoutEstimates.weekly) && (
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-muted rounded-xl">
                    <Wallet className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-2">Estimated Payout</h4>
                    <div className="space-y-2">
                      {rentalPayoutEstimates.daily && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Daily rental:</span>
                          <div className="text-right">
                            <span className="font-semibold text-primary">
                              {formatCurrency(rentalPayoutEstimates.daily.hostReceives)}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({formatCurrency(rentalPayoutEstimates.daily.hostFee)} fee)
                            </span>
                          </div>
                        </div>
                      )}
                      {rentalPayoutEstimates.weekly && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Weekly rental:</span>
                          <div className="text-right">
                            <span className="font-semibold text-primary">
                              {formatCurrency(rentalPayoutEstimates.weekly.hostReceives)}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({formatCurrency(rentalPayoutEstimates.weekly.hostFee)} fee)
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

          {/* Availability */}
          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Availability (Optional)</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Set a date range when your listing is available. Leave blank for open availability.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="available_from">Available From</Label>
                <Input
                  id="available_from"
                  type="date"
                  value={formData.available_from}
                  onChange={(e) => updateField('available_from', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="available_to">Available Until</Label>
                <Input
                  id="available_to"
                  type="date"
                  value={formData.available_to}
                  onChange={(e) => updateField('available_to', e.target.value)}
                  min={formData.available_from || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Instant Book Toggle */}
          <div className="pt-6 border-t">
            <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 pointer-events-none" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2.5 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">Instant Book</h4>
                      <InfoTooltip 
                        content="When enabled, renters can book and pay immediately. Documents are still reviewed - if rejected, the booking is cancelled and payment is fully refunded." 
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Allow renters to book immediately without waiting for approval. Booking is confirmed once documents are reviewed.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.instant_book}
                  onCheckedChange={(checked) => updateField('instant_book', checked)}
                />
              </div>
              
              {formData.instant_book && (
                <div className="mt-4 p-3 bg-card rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-primary">How it works:</strong> Renters pay immediately when booking. 
                    Your required documents will still be reviewed. If documents are approved, the booking is confirmed. 
                    If not approved, the booking is automatically cancelled and the renter receives a full refund.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Security Deposit */}
          <div className="pt-6 border-t">
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-muted rounded-xl">
                  <Wallet className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">Security Deposit</h4>
                    <InfoTooltip 
                      content="A refundable security deposit is charged at booking and returned after the rental ends without damage or delays." 
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Protect your equipment with a refundable deposit. Returned in full if no damage or late returns.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="deposit_amount" className="text-sm">Deposit Amount (Optional)</Label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="deposit_amount"
                        type="number"
                        min="0"
                        step="50"
                        value={formData.deposit_amount}
                        onChange={(e) => updateField('deposit_amount', e.target.value)}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave blank for no deposit. Typical deposits are $200-$1,000 depending on equipment value.
                    </p>
                  </div>

                  {parseFloat(formData.deposit_amount) > 0 && (
                    <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-primary">How it works:</strong> The ${parseFloat(formData.deposit_amount).toLocaleString()} deposit is charged when the booking is confirmed. 
                        After the rental ends, you can release the deposit in full or deduct for any damage/late fees.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Sale Suggestions Display */}
          {saleSuggestions && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Suggested Pricing
              </h4>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => applySaleSuggestion('low')}
                  className="p-3 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <TrendingDown className="w-3 h-3" />
                    Quick Sale
                  </div>
                  <div className="font-semibold text-foreground">${saleSuggestions.sale_low.toLocaleString()}</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => applySaleSuggestion('suggested')}
                  className="p-3 rounded-lg border-2 border-primary bg-primary/10 hover:bg-primary/15 transition-all text-left shadow-sm"
                >
                  <div className="flex items-center gap-1 text-primary text-xs mb-1">
                    <Target className="w-3 h-3" />
                    Recommended
                  </div>
                  <div className="font-semibold text-foreground">${saleSuggestions.sale_suggested.toLocaleString()}</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => applySaleSuggestion('high')}
                  className="p-3 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Premium
                  </div>
                  <div className="font-semibold text-foreground">${saleSuggestions.sale_high.toLocaleString()}</div>
                </button>
              </div>

              {/* Confidence and Factors */}
              {saleSuggestions.confidence && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    saleSuggestions.confidence === 'high' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : saleSuggestions.confidence === 'medium'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {saleSuggestions.confidence} confidence
                  </span>
                  {saleSuggestions.factors && saleSuggestions.factors.length > 0 && (
                    <span className="text-muted-foreground">
                      Based on: {saleSuggestions.factors.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
              )}
              
              <p className="text-sm text-muted-foreground italic">
                {saleSuggestions.reasoning}
              </p>
            </div>
          )}

          {/* Sale Pricing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Sale Price</h3>
            </div>

            <div className="space-y-2 max-w-sm">
              <Label htmlFor="price_sale" className="text-base font-medium">Asking Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="price_sale"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_sale}
                  onChange={(e) => updateField('price_sale', e.target.value)}
                  placeholder="0.00"
                  className="pl-7 text-xl"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Set a competitive price based on market value and condition.
              </p>
            </div>

            {/* Payout Estimate for Sales - Only show when card payment is enabled */}
            {salePayoutEstimate && formData.accept_card_payment && (
              <div className="rounded-lg p-3 border border-border/60 bg-muted/30 max-w-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {formData.vendibook_freight_enabled && formData.freight_payer === 'seller' 
                      ? 'Payout Estimate (Free Shipping)' 
                      : 'Estimated Payout'}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm">
                  {/* Item price */}
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Item price</span>
                    <span>{formatCurrency(salePayoutEstimate.salePrice)}</span>
                  </div>
                  
                  {/* Platform fee - small and transparent */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                    <span>Platform fee ({SALE_SELLER_FEE_PERCENT}%)</span>
                    <span>-{formatCurrency(salePayoutEstimate.sellerFee)}</span>
                  </div>
                  
                  {/* Freight deduction (seller-paid) */}
                  {salePayoutEstimate.freightDeduction > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                      <span className="flex items-center gap-1">
                        Freight (seller-paid)
                        <InfoTooltip
                          content="Free shipping is a seller-paid incentive. Freight is deducted from your earnings."
                          iconClassName="h-3 w-3"
                        />
                      </span>
                      <span>-{formatCurrency(salePayoutEstimate.freightDeduction)}</span>
                    </div>
                  )}
                  
                  {/* Estimated payout */}
                  <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border/50">
                    <span className="text-foreground font-medium">You receive</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(salePayoutEstimate.sellerReceives)}
                    </span>
                  </div>
                </div>
                
                {formData.vendibook_freight_enabled && formData.freight_payer === 'seller' && (
                  <p className="text-[10px] text-muted-foreground/60 mt-2">
                    Freight estimate is approximate
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Options */}
          <div className="pt-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Accepted Payment Methods</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select how buyers can pay for your item. You can enable both options.
            </p>

            <div className="space-y-4">
              {/* Pay by Card (Stripe) */}
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                <Checkbox
                  id="accept_card_payment"
                  checked={formData.accept_card_payment}
                  onCheckedChange={(checked) => updateField('accept_card_payment', !!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="accept_card_payment"
                    className="flex items-center gap-2 text-base font-medium cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-primary" />
                    Pay by Card (Online)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Accept secure online payments via Stripe. Funds are deposited to your connected Stripe account after sale confirmation.
                  </p>
                  {formData.accept_card_payment && (
                    <div className="mt-2 p-2 bg-muted rounded border border-border text-xs text-muted-foreground">
                      <Info className="w-3 h-3 inline mr-1" />
                      Requires Stripe Connect setup to receive payments.
                    </div>
                  )}
                </div>
              </div>

              {/* Pay in Person */}
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                <Checkbox
                  id="accept_cash_payment"
                  checked={formData.accept_cash_payment}
                  onCheckedChange={(checked) => updateField('accept_cash_payment', !!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="accept_cash_payment"
                    className="flex items-center gap-2 text-base font-medium cursor-pointer"
                  >
                    <Banknote className="w-4 h-4 text-green-600" />
                    Pay in Person
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Accept cash or other payments at pickup/delivery. You'll arrange payment directly with the buyer.
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    No platform fee on in-person payments
                  </p>
                </div>
              </div>

              {/* Validation Warning */}
              {!formData.accept_card_payment && !formData.accept_cash_payment && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Please select at least one payment method.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Vendibook Freight Settings (Pod 1) */}
          <div className="pt-6 border-t">
            <FreightSettingsCard
              enabled={formData.vendibook_freight_enabled}
              payer={formData.freight_payer}
              onEnabledChange={(enabled) => updateField('vendibook_freight_enabled', enabled)}
              onPayerChange={(payer) => updateField('freight_payer', payer)}
            />
          </div>
        </>
      )}
    </div>
  );
};
