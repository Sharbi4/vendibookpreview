import React, { useState } from 'react';
import { MapPin, Truck, Package, Building2, Info, DollarSign } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LocationSearchInput } from '@/components/search/LocationSearchInput';
import { FulfillmentType, ListingCategory, isMobileAsset, isStaticLocation as isStaticLocationFn } from '@/types/listing';

interface StepLocationLogisticsProps {
  category: ListingCategory | null;
  fulfillmentType: FulfillmentType | null;
  isStaticLocation: boolean;
  pickupLocationText: string;
  address: string;
  deliveryFee: string;
  deliveryRadiusMiles: string;
  pickupInstructions: string;
  deliveryInstructions: string;
  accessInstructions: string;
  hoursOfAccess: string;
  locationNotes: string;
  onFulfillmentTypeChange: (type: FulfillmentType) => void;
  onStaticLocationChange: (isStatic: boolean) => void;
  onPickupLocationTextChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onDeliveryFeeChange: (value: string) => void;
  onDeliveryRadiusMilesChange: (value: string) => void;
  onPickupInstructionsChange: (value: string) => void;
  onDeliveryInstructionsChange: (value: string) => void;
  onAccessInstructionsChange: (value: string) => void;
  onHoursOfAccessChange: (value: string) => void;
  onLocationNotesChange: (value: string) => void;
  onCoordinatesChange: (coords: [number, number] | null) => void;
}

const fulfillmentOptions: { value: FulfillmentType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'pickup', label: 'Pickup', icon: <MapPin className="w-4 h-4" />, description: 'Renter picks up' },
  { value: 'delivery', label: 'Delivery', icon: <Truck className="w-4 h-4" />, description: 'You deliver' },
  { value: 'both', label: 'Both', icon: <Package className="w-4 h-4" />, description: 'Offer both' },
];

export const StepLocationLogistics: React.FC<StepLocationLogisticsProps> = ({
  category,
  fulfillmentType,
  isStaticLocation,
  pickupLocationText,
  address,
  deliveryFee,
  deliveryRadiusMiles,
  pickupInstructions,
  deliveryInstructions,
  accessInstructions,
  hoursOfAccess,
  locationNotes,
  onFulfillmentTypeChange,
  onStaticLocationChange,
  onPickupLocationTextChange,
  onAddressChange,
  onDeliveryFeeChange,
  onDeliveryRadiusMilesChange,
  onPickupInstructionsChange,
  onDeliveryInstructionsChange,
  onAccessInstructionsChange,
  onHoursOfAccessChange,
  onLocationNotesChange,
  onCoordinatesChange,
}) => {
  const [pickupCoordinates, setPickupCoordinates] = useState<[number, number] | null>(null);
  
  const categoryIsStatic = category ? isStaticLocationFn(category) : false;
  const categoryIsMobile = category ? isMobileAsset(category) : false;
  const showStaticUI = categoryIsStatic || isStaticLocation;

  const handleLocationSelect = (location: { coordinates: [number, number] } | null) => {
    if (location) {
      setPickupCoordinates(location.coordinates);
      onCoordinatesChange(location.coordinates);
    } else {
      setPickupCoordinates(null);
      onCoordinatesChange(null);
    }
  };

  // Static Location UI
  if (showStaticUI) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-3 pb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Location Details</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Customers will come to this fixed location.
          </p>
        </div>

        {/* Static Location Toggle */}
        {categoryIsMobile && !categoryIsStatic && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium text-foreground cursor-pointer">Static Location</Label>
                  <p className="text-xs text-muted-foreground">Asset is at a fixed location</p>
                </div>
              </div>
              <Switch checked={isStaticLocation} onCheckedChange={onStaticLocationChange} />
            </div>
          </div>
        )}

        {/* Full Address */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Full Address *</Label>
          <LocationSearchInput
            value={address}
            onChange={onAddressChange}
            onLocationSelect={handleLocationSelect}
            selectedCoordinates={pickupCoordinates}
            placeholder="123 Main Street, City, State ZIP"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            Address is private until booking is confirmed.
          </p>
        </div>

        {/* Access Instructions */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Access Instructions *</Label>
          <Textarea
            value={accessInstructions}
            onChange={(e) => onAccessInstructionsChange(e.target.value)}
            placeholder="Gate codes, parking instructions, check-in procedures..."
            rows={3}
            className="resize-none bg-background"
          />
        </div>

        {/* Hours of Access */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Hours of Access</Label>
          <Input
            value={hoursOfAccess}
            onChange={(e) => onHoursOfAccessChange(e.target.value)}
            placeholder="e.g., 6 AM - 10 PM daily"
            className="bg-background"
          />
        </div>

        {/* Location Notes */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Additional Notes</Label>
          <Textarea
            value={locationNotes}
            onChange={(e) => onLocationNotesChange(e.target.value)}
            placeholder="Utilities, parking, nearby amenities..."
            rows={2}
            className="resize-none bg-background"
          />
        </div>
      </div>
    );
  }

  // Mobile Asset UI
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-3 pb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
          <MapPin className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Location & Logistics</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          How will renters get your asset?
        </p>
      </div>

      {/* Static Location Toggle */}
      {categoryIsMobile && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium text-foreground cursor-pointer">Static Location</Label>
                <p className="text-xs text-muted-foreground">Asset at a fixed location</p>
              </div>
            </div>
            <Switch checked={isStaticLocation} onCheckedChange={onStaticLocationChange} />
          </div>
        </div>
      )}

      {/* Fulfillment Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground">Fulfillment Options *</Label>
        <div className="grid grid-cols-3 gap-2">
          {fulfillmentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFulfillmentTypeChange(option.value)}
              className={cn(
                "p-3 rounded-xl border text-center transition-all",
                fulfillmentType === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className={cn(
                "mx-auto mb-1",
                fulfillmentType === option.value ? "text-primary" : "text-muted-foreground"
              )}>
                {option.icon}
              </div>
              <h4 className="font-semibold text-xs text-foreground">{option.label}</h4>
              <p className="text-[10px] text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Pickup Location */}
      {(fulfillmentType === 'pickup' || fulfillmentType === 'both') && (
        <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold text-foreground">Pickup Location *</Label>
          </div>
          
          <LocationSearchInput
            value={pickupLocationText}
            onChange={onPickupLocationTextChange}
            onLocationSelect={handleLocationSelect}
            selectedCoordinates={pickupCoordinates}
            placeholder="Enter full address"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            Hidden until booking confirmed.
          </p>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Pickup Instructions</Label>
            <Textarea
              value={pickupInstructions}
              onChange={(e) => onPickupInstructionsChange(e.target.value)}
              placeholder="Gate codes, parking, etc."
              rows={2}
              className="resize-none bg-background"
            />
          </div>
        </div>
      )}

      {/* Delivery Options */}
      {(fulfillmentType === 'delivery' || fulfillmentType === 'both') && (
        <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold text-foreground">Delivery Options</Label>
          </div>

          {fulfillmentType === 'delivery' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Your Base Location *</Label>
              <LocationSearchInput
                value={pickupLocationText}
                onChange={onPickupLocationTextChange}
                onLocationSelect={handleLocationSelect}
                selectedCoordinates={pickupCoordinates}
                placeholder="City, State"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Delivery Fee
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryFee}
                  onChange={(e) => onDeliveryFeeChange(e.target.value)}
                  placeholder="0"
                  className="pl-6 bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Radius</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={deliveryRadiusMiles}
                  onChange={(e) => onDeliveryRadiusMilesChange(e.target.value)}
                  placeholder="50"
                  className="pr-12 bg-background"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">mi</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Delivery Instructions</Label>
            <Textarea
              value={deliveryInstructions}
              onChange={(e) => onDeliveryInstructionsChange(e.target.value)}
              placeholder="Requirements, space needed, power hookup..."
              rows={2}
              className="resize-none bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
};
