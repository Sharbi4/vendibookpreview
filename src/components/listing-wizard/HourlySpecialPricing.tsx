import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, Plus, Trash2, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface HourlyPriceTier {
  id: string;
  label: string;
  hours: number[];
  price: number;
  type: 'peak' | 'offpeak' | 'custom';
}

export interface HourlySpecialPricingData {
  enabled: boolean;
  tiers: HourlyPriceTier[];
  defaultPrice: number;
}

interface HourlySpecialPricingProps {
  baseHourlyRate: number | null;
  specialPricing: HourlySpecialPricingData | null;
  onChange: (pricing: HourlySpecialPricingData | null) => void;
}

const HOUR_LABELS: Record<number, string> = {
  0: '12 AM', 1: '1 AM', 2: '2 AM', 3: '3 AM', 4: '4 AM', 5: '5 AM',
  6: '6 AM', 7: '7 AM', 8: '8 AM', 9: '9 AM', 10: '10 AM', 11: '11 AM',
  12: '12 PM', 13: '1 PM', 14: '2 PM', 15: '3 PM', 16: '4 PM', 17: '5 PM',
  18: '6 PM', 19: '7 PM', 20: '8 PM', 21: '9 PM', 22: '10 PM', 23: '11 PM',
};

const PRESET_TIERS = {
  peak: {
    label: 'Peak Hours',
    hours: [11, 12, 13, 17, 18, 19, 20],
    multiplier: 1.5,
  },
  offpeak: {
    label: 'Off-Peak',
    hours: [6, 7, 8, 9, 21, 22],
    multiplier: 0.75,
  },
};

export const HourlySpecialPricing: React.FC<HourlySpecialPricingProps> = ({
  baseHourlyRate,
  specialPricing,
  onChange,
}) => {
  const [enabled, setEnabled] = useState(specialPricing?.enabled || false);
  const [tiers, setTiers] = useState<HourlyPriceTier[]>(specialPricing?.tiers || []);

  // Sync state with props
  useEffect(() => {
    if (specialPricing) {
      setEnabled(specialPricing.enabled);
      setTiers(specialPricing.tiers);
    }
  }, [specialPricing]);

  // Propagate changes
  useEffect(() => {
    if (enabled && tiers.length > 0) {
      onChange({
        enabled,
        tiers,
        defaultPrice: baseHourlyRate || 0,
      });
    } else if (!enabled) {
      onChange(null);
    }
  }, [enabled, tiers, baseHourlyRate, onChange]);

  const handleEnableToggle = (checked: boolean) => {
    setEnabled(checked);
    if (checked && tiers.length === 0) {
      // Add default peak tier
      const defaultPrice = baseHourlyRate || 50;
      setTiers([
        {
          id: crypto.randomUUID(),
          label: 'Peak Hours',
          hours: PRESET_TIERS.peak.hours,
          price: Math.round(defaultPrice * 1.5),
          type: 'peak',
        },
      ]);
    }
  };

  const addTier = (type: 'peak' | 'offpeak' | 'custom') => {
    const defaultPrice = baseHourlyRate || 50;
    const preset = PRESET_TIERS[type === 'custom' ? 'peak' : type];
    
    // Find hours not already assigned
    const assignedHours = tiers.flatMap(t => t.hours);
    const availableHours = preset.hours.filter(h => !assignedHours.includes(h));
    
    const newTier: HourlyPriceTier = {
      id: crypto.randomUUID(),
      label: type === 'custom' ? 'Custom' : preset.label,
      hours: type === 'custom' ? [] : availableHours,
      price: type === 'custom' 
        ? defaultPrice 
        : Math.round(defaultPrice * (type === 'peak' ? 1.5 : 0.75)),
      type,
    };
    
    setTiers([...tiers, newTier]);
  };

  const removeTier = (id: string) => {
    setTiers(tiers.filter(t => t.id !== id));
  };

  const updateTier = (id: string, updates: Partial<HourlyPriceTier>) => {
    setTiers(tiers.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const toggleHour = (tierId: string, hour: number) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;

    // Check if hour is assigned to another tier
    const otherTier = tiers.find(t => t.id !== tierId && t.hours.includes(hour));
    if (otherTier) {
      // Remove from other tier first
      updateTier(otherTier.id, { hours: otherTier.hours.filter(h => h !== hour) });
    }

    const newHours = tier.hours.includes(hour)
      ? tier.hours.filter(h => h !== hour)
      : [...tier.hours, hour].sort((a, b) => a - b);
    
    updateTier(tierId, { hours: newHours });
  };

  const getHourTier = (hour: number): HourlyPriceTier | null => {
    return tiers.find(t => t.hours.includes(hour)) || null;
  };

  const formatHourRange = (hours: number[]): string => {
    if (hours.length === 0) return 'No hours selected';
    if (hours.length === 1) return HOUR_LABELS[hours[0]];
    
    // Group consecutive hours
    const sorted = [...hours].sort((a, b) => a - b);
    const ranges: string[] = [];
    let rangeStart = sorted[0];
    let rangeEnd = sorted[0];
    
    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === rangeEnd + 1) {
        rangeEnd = sorted[i];
      } else {
        if (rangeStart === rangeEnd) {
          ranges.push(HOUR_LABELS[rangeStart]);
        } else {
          ranges.push(`${HOUR_LABELS[rangeStart]}–${HOUR_LABELS[rangeEnd]}`);
        }
        if (i < sorted.length) {
          rangeStart = sorted[i];
          rangeEnd = sorted[i];
        }
      }
    }
    
    return ranges.slice(0, 2).join(', ') + (ranges.length > 2 ? ` +${ranges.length - 2}` : '');
  };

  if (!baseHourlyRate) {
    return (
      <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border">
        <p className="text-sm text-muted-foreground text-center">
          Set an hourly rate first to configure special pricing
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <Label className="text-base font-medium">Special hourly pricing</Label>
            </div>
            <Switch checked={enabled} onCheckedChange={handleEnableToggle} />
          </div>

          <p className="text-sm text-muted-foreground">
            Charge different rates for peak hours like lunch or dinner rushes.
          </p>

          {enabled && (
            <>
              {/* Base rate reminder */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div>
                  <span className="text-sm text-muted-foreground">Standard rate</span>
                  <p className="font-semibold text-foreground">${baseHourlyRate}/hour</p>
                </div>
                <Badge variant="outline">Default</Badge>
              </div>

              {/* Pricing tiers */}
              <div className="space-y-3">
                {tiers.map((tier) => (
                  <div 
                    key={tier.id} 
                    className={cn(
                      "p-3 rounded-lg border",
                      tier.type === 'peak' 
                        ? "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900" 
                        : tier.type === 'offpeak'
                        ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
                        : "bg-muted/30 border-border"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={tier.label}
                          onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                          className="h-7 w-32 text-sm font-medium bg-transparent border-dashed"
                        />
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[10px]",
                            tier.type === 'peak' && "bg-orange-100 text-orange-700",
                            tier.type === 'offpeak' && "bg-blue-100 text-blue-700"
                          )}
                        >
                          {tier.type === 'peak' ? (
                            <><TrendingUp className="h-2.5 w-2.5 mr-1" /> Higher</>
                          ) : tier.type === 'offpeak' ? (
                            <><TrendingDown className="h-2.5 w-2.5 mr-1" /> Lower</>
                          ) : 'Custom'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeTier(tier.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Price input */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative flex-1 max-w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          min="1"
                          value={tier.price}
                          onChange={(e) => updateTier(tier.id, { price: parseInt(e.target.value) || 0 })}
                          className="pl-7 h-9"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">/hour</span>
                      {tier.price !== baseHourlyRate && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px]",
                            tier.price > baseHourlyRate ? "text-orange-600" : "text-green-600"
                          )}
                        >
                          {tier.price > baseHourlyRate ? '+' : ''}
                          {Math.round(((tier.price - baseHourlyRate) / baseHourlyRate) * 100)}%
                        </Badge>
                      )}
                    </div>

                    {/* Hour selector */}
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatHourRange(tier.hours)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Array.from({ length: 24 }, (_, h) => {
                          const isInThisTier = tier.hours.includes(h);
                          const otherTier = !isInThisTier && getHourTier(h);
                          
                          return (
                            <Tooltip key={h}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => toggleHour(tier.id, h)}
                                  className={cn(
                                    "w-6 h-6 text-[10px] rounded font-medium transition-all",
                                    isInThisTier
                                      ? tier.type === 'peak'
                                        ? "bg-orange-500 text-white"
                                        : tier.type === 'offpeak'
                                        ? "bg-blue-500 text-white"
                                        : "bg-primary text-primary-foreground"
                                      : otherTier
                                      ? "bg-muted text-muted-foreground/50 cursor-not-allowed"
                                      : "bg-muted/50 hover:bg-muted text-muted-foreground"
                                  )}
                                >
                                  {h}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p>{HOUR_LABELS[h]}</p>
                                {otherTier && <p className="text-muted-foreground">Assigned to {otherTier.label}</p>}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add tier buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTier('peak')}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <TrendingUp className="h-3 w-3 text-orange-500" />
                  Peak hours
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTier('offpeak')}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <TrendingDown className="h-3 w-3 text-blue-500" />
                  Off-peak
                </Button>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>
                  Hours not assigned to a tier will use the standard ${baseHourlyRate}/hour rate. 
                  Renters will see the applicable rate when selecting times.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default HourlySpecialPricing;
