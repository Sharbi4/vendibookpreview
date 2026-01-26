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
  { value: 'pickup', label: 'Pickup Only', icon: <MapPin className="w-5 h-5" />, description: 'Renter picks up from your location' },
  { value: 'delivery', label: 'Delivery Only', icon: <Truck className="w-5 h-5" />, description: 'You deliver to their location' },
  { value: 'both', label: 'Pickup + Delivery', icon: <Package className="w-5 h-5" />, description: 'Offer both options' },
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

  // Static Location UI (Ghost Kitchen, Vendor Lot, or toggled static)
  if (showStaticUI) {
    return (
      <div className="space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Location Details</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            This is a fixed location. Customers will come to this address.
          </p>
        </div>

        {/* Static Location Toggle (only for mobile assets) */}
        {categoryIsMobile && !categoryIsStatic && (
          <div className="p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <Label htmlFor="static-toggle" className="text-base font-medium cursor-pointer">
                    Static Location
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    This asset is parked at a fixed location
                  </p>
                </div>
              </div>
              <Switch
                id="static-toggle"
                checked={isStaticLocation}
                onCheckedChange={onStaticLocationChange}
              />
            </div>
          </div>
        )}

        {/* Full Address */}
        <div className="space-y-3">
          <Label htmlFor="address" className="text-base font-semibold">Full Address *</Label>
          <LocationSearchInput
            value={address}
            onChange={onAddressChange}
            onLocationSelect={handleLocationSelect}
            selectedCoordinates={pickupCoordinates}
            placeholder="123 Main Street, Suite 100, City, State ZIP"
          />
          <p className="text-sm text-muted-foreground flex items-start gap-1.5">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Address is kept private until booking is confirmed.</span>
          </p>
        </div>

        {/* Access Instructions */}
        <div className="space-y-3">
          <Label htmlFor="access_instructions" className="text-base font-semibold">Access Instructions *</Label>
          <Textarea
            id="access_instructions"
            value={accessInstructions}
            onChange={(e) => onAccessInstructionsChange(e.target.value)}
            placeholder="How do guests access the space? Any gate codes, parking instructions, or check-in procedures?"
            rows={3}
          />
        </div>

        {/* Hours of Access */}
        <div className="space-y-3">
          <Label htmlFor="hours_of_access" className="text-base font-semibold">Hours of Access</Label>
          <Input
            id="hours_of_access"
            value={hoursOfAccess}
            onChange={(e) => onHoursOfAccessChange(e.target.value)}
            placeholder="e.g., 6 AM - 10 PM daily"
          />
        </div>

        {/* Location Notes */}
        <div className="space-y-3">
          <Label htmlFor="location_notes" className="text-base font-semibold">Additional Notes</Label>
          <Textarea
            id="location_notes"
            value={locationNotes}
            onChange={(e) => onLocationNotesChange(e.target.value)}
            placeholder="Utilities included, parking availability, nearby amenities..."
            rows={3}
          />
        </div>
      </div>
    );
  }

  // Mobile Asset UI (Pickup/Delivery)
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Location & Logistics</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          How will renters get your asset? Set up pickup and delivery options.
        </p>
      </div>

      {/* Static Location Toggle for mobile assets */}
      {categoryIsMobile && (
        <div className="p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <Label htmlFor="static-toggle" className="text-base font-medium cursor-pointer">
                  Static Location
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  This asset is permanently stationed at a fixed location
                </p>
              </div>
            </div>
            <Switch
              id="static-toggle"
              checked={isStaticLocation}
              onCheckedChange={onStaticLocationChange}
            />
          </div>
        </div>
      )}

      {/* Fulfillment Type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Fulfillment Options *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {fulfillmentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFulfillmentTypeChange(option.value)}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all",
                fulfillmentType === option.value
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "mb-2",
                fulfillmentType === option.value ? "text-primary" : "text-muted-foreground"
              )}>
                {option.icon}
              </div>
              <h4 className={cn(
                "font-semibold text-sm",
                fulfillmentType === option.value ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Pickup Location */}
      {(fulfillmentType === 'pickup' || fulfillmentType === 'both') && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <Label className="text-base font-semibold">Pickup Location *</Label>
          </div>
          
          <div className="space-y-3">
            <LocationSearchInput
              value={pickupLocationText}
              onChange={onPickupLocationTextChange}
              onLocationSelect={handleLocationSelect}
              selectedCoordinates={pickupCoordinates}
              placeholder="Enter full address for pickup"
            />
            <p className="text-sm text-muted-foreground flex items-start gap-1.5">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Exact address is hidden until booking is confirmed.</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Pickup Instructions</Label>
            <Textarea
              value={pickupInstructions}
              onChange={(e) => onPickupInstructionsChange(e.target.value)}
              placeholder="Any special instructions for pickup? Gate codes, parking, etc."
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Delivery Options */}
      {(fulfillmentType === 'delivery' || fulfillmentType === 'both') && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <Label className="text-base font-semibold">Delivery Options</Label>
          </div>

          {fulfillmentType === 'delivery' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Your Base Location *</Label>
              <LocationSearchInput
                value={pickupLocationText}
                onChange={onPickupLocationTextChange}
                onLocationSelect={handleLocationSelect}
                selectedCoordinates={pickupCoordinates}
                placeholder="City, State (e.g., Austin, TX)"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Delivery Fee
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryFee}
                  onChange={(e) => onDeliveryFeeChange(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">Per delivery (or per mile)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Delivery Radius</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={deliveryRadiusMiles}
                  onChange={(e) => onDeliveryRadiusMilesChange(e.target.value)}
                  placeholder="50"
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">miles</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Delivery Instructions</Label>
            <Textarea
              value={deliveryInstructions}
              onChange={(e) => onDeliveryInstructionsChange(e.target.value)}
              placeholder="Any requirements for delivery location? Power hookup needed? Minimum space required?"
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
};
