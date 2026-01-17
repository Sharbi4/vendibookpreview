import React from 'react';
import { Truck, DollarSign, Gift } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { FreightComparisonCard } from './FreightInfoCard';

interface FreightSettingsCardProps {
  enabled: boolean;
  payer: 'buyer' | 'seller';
  onEnabledChange: (enabled: boolean) => void;
  onPayerChange: (payer: 'buyer' | 'seller') => void;
}

/**
 * Pod 1 - Freight Delivery settings in Listing Creation
 */
export const FreightSettingsCard: React.FC<FreightSettingsCardProps> = ({
  enabled,
  payer,
  onEnabledChange,
  onPayerChange,
}) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">
                Freight Delivery (Vendibook Facilitated)
              </h3>
              <InfoTooltip
                content="Vendibook is the only freight facilitator on the platform. We coordinate shipping through a third-party carrier—buyers and sellers don't arrange carriers directly inside Vendibook."
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              We coordinate freight through a trusted third-party carrier.
            </p>
          </div>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
        <Label htmlFor="freight-enabled" className="flex items-center gap-2 cursor-pointer">
          <span className="font-medium">Enable Vendibook Freight</span>
        </Label>
        <Switch
          id="freight-enabled"
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {/* Payment Responsibility - only shown when enabled */}
      {enabled && (
        <div className="space-y-4 pt-4 border-t border-border">
          <Label className="text-sm font-medium text-foreground">
            Payment Responsibility
          </Label>
          
          <RadioGroup
            value={payer}
            onValueChange={(val) => onPayerChange(val as 'buyer' | 'seller')}
            className="space-y-3"
          >
            <div 
              className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                payer === 'buyer' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value="buyer" id="freight-buyer" />
              <Label htmlFor="freight-buyer" className="flex items-center gap-3 cursor-pointer flex-1">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Buyer pays at checkout</p>
                  <p className="text-sm text-muted-foreground">
                    Freight cost is added to the buyer's total at checkout
                  </p>
                </div>
              </Label>
            </div>
            
            <div 
              className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                payer === 'seller' 
                  ? 'border-emerald-500 bg-emerald-500/5' 
                  : 'border-border hover:border-emerald-500/50'
              }`}
            >
              <RadioGroupItem value="seller" id="freight-seller" />
              <Label htmlFor="freight-seller" className="flex items-center gap-3 cursor-pointer flex-1">
                <Gift className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-foreground">Seller pays (Free Shipping to buyer)</p>
                  <p className="text-sm text-muted-foreground">
                    Freight is deducted from your payout after the sale
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Pay in person note */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              <strong>Tip:</strong> Freight can be charged separately even if you only accept "Pay in Person" for the item. The buyer pays freight online, and you collect payment for the item in person.
            </p>
          </div>

          {/* Truth statement */}
          <p className="text-xs text-muted-foreground italic pt-2">
            Vendibook is the only freight facilitator. We coordinate delivery through a third-party carrier.
          </p>

          {/* Mini comparison card */}
          <FreightComparisonCard />
        </div>
      )}
    </div>
  );
};
