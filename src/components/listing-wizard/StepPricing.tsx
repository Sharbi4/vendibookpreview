import React, { useState } from 'react';
import { Calendar, DollarSign, Sparkles, Loader2, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { ListingFormData } from '@/types/listing';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
}

interface SaleSuggestions {
  sale_low: number;
  sale_suggested: number;
  sale_high: number;
  reasoning: string;
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
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-foreground mb-1">AI Pricing Assistant</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Get smart pricing suggestions based on your listing title, category, and location.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetSuggestions}
              disabled={isLoadingSuggestions}
              className="border-primary/30 hover:bg-primary/5"
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
                  className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
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
                  className="p-3 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left"
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
                  className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Premium
                  </div>
                  <div className="font-semibold text-foreground">${rentalSuggestions.daily_high}/day</div>
                  <div className="text-xs text-muted-foreground">${rentalSuggestions.weekly_high}/week</div>
                </button>
              </div>
              
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
                  className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
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
                  className="p-3 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left"
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
                  className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Premium
                  </div>
                  <div className="font-semibold text-foreground">${saleSuggestions.sale_high.toLocaleString()}</div>
                </button>
              </div>
              
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
          </div>
        </>
      )}
    </div>
  );
};
