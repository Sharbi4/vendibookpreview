import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Truck, Package, Info, Building2, Phone, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { ListingFormData, FulfillmentType } from '@/types/listing';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { GpsLocationButton } from './GpsLocationButton';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/edge/invokeFunction';

interface StepLocationProps {
  formData: ListingFormData;
  updateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  isMobileAsset: boolean;
  isStaticLocation: boolean;
  isCategoryStaticLocation: boolean;
  onToggleStaticLocation: (isStatic: boolean) => void;
}

const fulfillmentOptions: { value: FulfillmentType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'pickup', label: 'Pickup Only', icon: <MapPin className="w-5 h-5" />, description: 'Buyer/renter picks up from your location' },
  { value: 'delivery', label: 'Delivery Only', icon: <Truck className="w-5 h-5" />, description: 'You deliver to their location' },
  { value: 'both', label: 'Pickup + Delivery', icon: <Package className="w-5 h-5" />, description: 'Offer both options' },
];

// ZIP code → City/State lookup using server-side geocode (no client API key restrictions)
const ZipCodeLookup: React.FC<{
  zipCode: string;
  onZipCodeChange: (zip: string) => void;
  city: string;
  state: string;
  onCityStateConfirmed: (city: string, state: string) => void;
  onCoordinatesChange: (coords: { lat: number; lng: number } | null) => void;
}> = ({ zipCode, onZipCodeChange, city, state, onCityStateConfirmed, onCoordinatesChange }) => {
  const [isLooking, setIsLooking] = useState(false);
  const [lookupCity, setLookupCity] = useState(city || '');
  const [lookupState, setLookupState] = useState(state || '');
  const [confirmed, setConfirmed] = useState(!!(city && state));
  const [error, setError] = useState<string | null>(null);

  const lookupZip = useCallback(async (zip: string) => {
    if (zip.length < 5) return;

    setIsLooking(true);
    setError(null);
    setConfirmed(false);

    try {
      const { data, error: fnError } = await invokeEdge<{ results?: any[] }>('geocode-location', {
        body: { query: zip, limit: 1 },
      }, { retries: 2 });

      if (fnError) throw new Error(fnError);

      const result = data?.results?.[0];
      if (!result) {
        setError("We couldn't find that ZIP code. Double-check the digits or try a nearby ZIP.");
        return;
      }

      const foundCity = (result.city || result.text || '').trim();
      const foundState = (result.state || result.context || '').trim();
      const [lng, lat] = result.center || [];

      if (!foundCity || !foundState) {
        setError("We found the ZIP but couldn't read the city/state. Try a nearby ZIP code.");
        return;
      }

      setLookupCity(foundCity);
      setLookupState(foundState);
      if (typeof lat === 'number' && typeof lng === 'number') {
        onCoordinatesChange({ lat, lng });
      }
      onCityStateConfirmed(foundCity, foundState);
      setConfirmed(true);
    } catch (err) {
      console.error('[ZipCodeLookup] lookup failed:', err);
      setError("We're having trouble looking up that ZIP. Please try again in a moment.");
    } finally {
      setIsLooking(false);
    }
  }, [onCityStateConfirmed, onCoordinatesChange]);

  useEffect(() => {
    if (zipCode.length === 5) {
      const timer = setTimeout(() => lookupZip(zipCode), 300);
      return () => clearTimeout(timer);
    } else {
      setConfirmed(false);
      setLookupCity('');
      setLookupState('');
      setError(null);
    }
  }, [zipCode, lookupZip]);

  const handleRetry = () => lookupZip(zipCode);

  return (
    <div className="space-y-4">
      {/* ZIP Code Input */}
      <div className="space-y-2">
        <Label className="text-base font-medium text-foreground">ZIP Code *</Label>
        <div className="relative max-w-[220px]">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            value={zipCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 5);
              onZipCodeChange(val);
            }}
            placeholder="e.g. 78701"
            className={cn(
              "text-xl font-semibold tracking-[0.3em] text-center h-12",
              confirmed && "border-emerald-500 focus-visible:ring-emerald-500",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            autoComplete="postal-code"
          />
          {isLooking && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {confirmed && !isLooking && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          5-digit US ZIP — we'll auto-fill your city and state.
        </p>
      </div>

      {/* Error with retry */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-destructive">{error}</p>
            {zipCode.length === 5 && (
              <button
                type="button"
                onClick={handleRetry}
                className="mt-1 text-xs font-medium text-destructive underline underline-offset-2 hover:no-underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {/* City/State Confirmation */}
      {confirmed && lookupCity && lookupState && (
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30 animate-in fade-in-50 slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Got it — your listing will appear in:
              </p>
              <p className="text-lg font-bold text-foreground mt-1">
                {lookupCity}, {lookupState}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Your full address stays private until a booking is confirmed. Only the city/state shows publicly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const StepLocation: React.FC<StepLocationProps> = ({
  formData,
  updateField,
  isMobileAsset,
  isStaticLocation,
  isCategoryStaticLocation,
  onToggleStaticLocation,
}) => {
  const handleCoordinatesChange = (coords: { lat: number; lng: number } | null) => {
    updateField('latitude', coords?.lat ?? null);
    updateField('longitude', coords?.lng ?? null);
  };

  const handleCityStateConfirmed = (city: string, state: string) => {
    updateField('city', city);
    updateField('state', state);
  };

  const handleZipCodeChange = (zip: string) => {
    updateField('zip_code', zip);
    // Reset coordinates when zip changes
    if (zip.length < 5) {
      updateField('latitude', null);
      updateField('longitude', null);
    }
  };

  return (
    <div className="space-y-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
          <MapPin className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Where is it located?</h2>
        <p className="text-muted-foreground text-sm">
          Enter your ZIP code and we'll confirm your city and state.
        </p>
      </div>

      {/* GPS Button */}
      <div className="flex justify-center">
        <GpsLocationButton
          onLocationDetected={(loc) => {
            updateField('street_address', loc.street_address);
            updateField('city', loc.city);
            updateField('state', loc.state);
            updateField('zip_code', loc.zip_code);
            updateField('country', loc.country);
          }}
        />
      </div>

      {/* ZIP Code Lookup */}
      <ZipCodeLookup
        zipCode={formData.zip_code}
        onZipCodeChange={handleZipCodeChange}
        city={formData.city}
        state={formData.state}
        onCityStateConfirmed={handleCityStateConfirmed}
        onCoordinatesChange={handleCoordinatesChange}
      />

      {/* Static Location Toggle - Only for mobile assets */}
      {isMobileAsset && !isCategoryStaticLocation && (
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
              checked={formData.is_static_location}
              onCheckedChange={onToggleStaticLocation}
            />
          </div>
        </div>
      )}

      {/* Fulfillment Options - Only for mobile, non-static assets */}
      {!isStaticLocation && !isCategoryStaticLocation && (
        <div className="space-y-3">
          <Label className="text-base font-medium">How will renters get your asset? *</Label>
          <div className="space-y-3">
            {fulfillmentOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateField('fulfillment_type', option.value)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3",
                  formData.fulfillment_type === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <div className={cn(
                  "mt-0.5",
                  formData.fulfillment_type === option.value ? "text-primary" : "text-muted-foreground"
                )}>
                  {option.icon}
                </div>
                <div>
                  <h4 className={cn(
                    "font-medium",
                    formData.fulfillment_type === option.value ? "text-primary" : "text-foreground"
                  )}>
                    {option.label}
                  </h4>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Options - shown when delivery selected */}
      {(formData.fulfillment_type === 'delivery' || formData.fulfillment_type === 'both') && !isStaticLocation && (
        <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold text-foreground">Delivery Options</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Delivery Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.delivery_fee}
                  onChange={(e) => updateField('delivery_fee', e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Radius</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={formData.delivery_radius_miles}
                  onChange={(e) => updateField('delivery_radius_miles', e.target.value)}
                  placeholder="50"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">miles</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Instructions - for static locations */}
      {(isStaticLocation || isCategoryStaticLocation) && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="space-y-2">
            <Label className="text-base font-medium">Access Instructions *</Label>
            <Textarea
              value={formData.access_instructions}
              onChange={(e) => updateField('access_instructions', e.target.value)}
              placeholder="Gate codes, parking, check-in procedures..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Shared with renters after booking confirmation.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Hours of Access (Optional)</Label>
            <Input
              value={formData.hours_of_access}
              onChange={(e) => updateField('hours_of_access', e.target.value)}
              placeholder="e.g., 6 AM - 10 PM daily"
            />
          </div>
        </div>
      )}

      {/* Phone Number */}
      <div className="space-y-2 pt-4 border-t border-border">
        <Label className="text-base font-medium">Contact Phone Number</Label>
        <Input
          type="tel"
          value={formData.pickup_location_text}
          onChange={(e) => updateField('pickup_location_text', e.target.value)}
          placeholder="(555) 123-4567"
        />
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Phone className="w-3 h-3" />
          Your phone number will not be revealed until a booking is confirmed.
        </p>
      </div>

      {/* Privacy Note */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          Your exact address and contact details are kept private until a booking is confirmed. Only your city and state are shown publicly.
        </p>
      </div>
    </div>
  );
};
