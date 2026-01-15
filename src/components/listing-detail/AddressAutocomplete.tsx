import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X, CheckCircle2, AlertCircle, Home, Building2, Star, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useSavedAddresses, SavedAddress, CreateAddressInput } from '@/hooks/useSavedAddresses';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface GeocodeResult {
  id: string;
  placeName: string;
  center: [number, number]; // [lng, lat]
  text: string;
  context?: string;
}

interface ParsedAddress {
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
}

interface AddressValidation {
  isValid: boolean;
  isComplete: boolean;
  missingFields: string[];
  parsedAddress: ParsedAddress;
}

interface AddressAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: { 
    fullAddress: string; 
    coordinates: [number, number];
    validation: AddressValidation;
  }) => void;
  onValidationChange?: (validation: AddressValidation) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  requireComplete?: boolean;
  showSavedAddresses?: boolean;
}

// Parse address components from Mapbox result
const parseAddressFromMapbox = (placeName: string, context?: string): ParsedAddress => {
  const parsed: ParsedAddress = {
    street: null,
    city: null,
    state: null,
    zipCode: null,
    country: null,
  };

  // Split the full address by commas
  const parts = placeName.split(',').map(p => p.trim());
  
  if (parts.length >= 1) {
    // First part is usually street address
    parsed.street = parts[0];
  }
  
  if (parts.length >= 2) {
    // Second part might be city or city + state
    parsed.city = parts[1];
  }
  
  if (parts.length >= 3) {
    // Third part usually contains state and zip
    const stateZipPart = parts[2];
    // Try to extract state and zip code (e.g., "TX 75001" or "Texas 75001")
    const stateZipMatch = stateZipPart.match(/^([A-Za-z\s]+)\s*(\d{5}(?:-\d{4})?)?$/);
    if (stateZipMatch) {
      parsed.state = stateZipMatch[1]?.trim() || null;
      parsed.zipCode = stateZipMatch[2] || null;
    } else {
      parsed.state = stateZipPart;
    }
  }
  
  if (parts.length >= 4) {
    // Fourth part might be zip if not already captured, or country
    const fourthPart = parts[3];
    if (/^\d{5}(?:-\d{4})?$/.test(fourthPart)) {
      parsed.zipCode = fourthPart;
    } else if (!parsed.zipCode && /\d{5}/.test(fourthPart)) {
      const zipMatch = fourthPart.match(/(\d{5}(?:-\d{4})?)/);
      if (zipMatch) parsed.zipCode = zipMatch[1];
    }
  }
  
  if (parts.length >= 5) {
    parsed.country = parts[parts.length - 1];
  }

  // Also try to extract from context if available
  if (context) {
    const contextParts = context.split(',').map(p => p.trim());
    contextParts.forEach(part => {
      // Look for zip code pattern
      const zipMatch = part.match(/(\d{5}(?:-\d{4})?)/);
      if (zipMatch && !parsed.zipCode) {
        parsed.zipCode = zipMatch[1];
      }
      // Look for state abbreviations
      if (/^[A-Z]{2}$/.test(part) && !parsed.state) {
        parsed.state = part;
      }
    });
  }

  return parsed;
};

// Validate that address has all required components
const validateAddress = (parsed: ParsedAddress): AddressValidation => {
  const missingFields: string[] = [];
  
  if (!parsed.street || parsed.street.length < 3) {
    missingFields.push('street address');
  }
  if (!parsed.city) {
    missingFields.push('city');
  }
  if (!parsed.state) {
    missingFields.push('state');
  }
  if (!parsed.zipCode) {
    missingFields.push('ZIP code');
  }

  const isComplete = missingFields.length === 0;
  const isValid = parsed.street !== null && parsed.city !== null;

  return {
    isValid,
    isComplete,
    missingFields,
    parsedAddress: parsed,
  };
};

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  id,
  value,
  onChange,
  onAddressSelect,
  onValidationChange,
  placeholder = "Enter your full delivery address",
  className,
  disabled,
  requireComplete = true,
  showSavedAddresses = true,
}) => {
  const { user } = useAuth();
  const { addresses: savedAddresses, isLoading: isLoadingAddresses, saveAddress } = useSavedAddresses();
  
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [validation, setValidation] = useState<AddressValidation | null>(null);
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingAddressToSave, setPendingAddressToSave] = useState<{
    fullAddress: string;
    parsed: ParsedAddress;
    coordinates: [number, number];
  } | null>(null);
  const [saveLabel, setSaveLabel] = useState('Home');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Fetch suggestions from geocoding API
  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-location', {
        body: { query, limit: 5 },
      });

      if (error) {
        console.error('Geocoding error:', error);
        setSuggestions([]);
        return;
      }

      setSuggestions(data.results || []);
      setIsOpen(data.results?.length > 0);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    // Only search if user is typing (not after selection)
    if (hasSelectedAddress) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, hasSelectedAddress]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setHasSelectedAddress(false);
    setValidation(null);
    onValidationChange?.(null as unknown as AddressValidation);
  };

  const handleSuggestionClick = (suggestion: GeocodeResult) => {
    const fullAddress = suggestion.placeName;
    onChange(fullAddress);
    setHasSelectedAddress(true);
    
    // Parse and validate the selected address
    const parsed = parseAddressFromMapbox(fullAddress, suggestion.context);
    const addressValidation = validateAddress(parsed);
    setValidation(addressValidation);
    onValidationChange?.(addressValidation);
    
    onAddressSelect?.({
      fullAddress,
      coordinates: suggestion.center,
      validation: addressValidation,
    });
    
    // Store for potential save
    if (addressValidation.isComplete) {
      setPendingAddressToSave({
        fullAddress,
        parsed,
        coordinates: suggestion.center,
      });
    }
    
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleSavedAddressSelect = (savedAddress: SavedAddress) => {
    onChange(savedAddress.full_address);
    setHasSelectedAddress(true);
    
    const parsed: ParsedAddress = {
      street: savedAddress.street,
      city: savedAddress.city,
      state: savedAddress.state,
      zipCode: savedAddress.zip_code,
      country: savedAddress.country,
    };
    
    const addressValidation = validateAddress(parsed);
    setValidation(addressValidation);
    onValidationChange?.(addressValidation);
    
    const coordinates: [number, number] = [
      savedAddress.longitude || 0,
      savedAddress.latitude || 0,
    ];
    
    onAddressSelect?.({
      fullAddress: savedAddress.full_address,
      coordinates,
      validation: addressValidation,
    });
  };

  const handleSaveAddress = async () => {
    if (!pendingAddressToSave) return;
    
    const input: CreateAddressInput = {
      label: saveLabel,
      full_address: pendingAddressToSave.fullAddress,
      street: pendingAddressToSave.parsed.street,
      city: pendingAddressToSave.parsed.city,
      state: pendingAddressToSave.parsed.state,
      zip_code: pendingAddressToSave.parsed.zipCode,
      country: pendingAddressToSave.parsed.country,
      latitude: pendingAddressToSave.coordinates[1],
      longitude: pendingAddressToSave.coordinates[0],
    };
    
    await saveAddress(input);
    setShowSaveDialog(false);
    setSaveLabel('Home');
    setPendingAddressToSave(null);
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    setValidation(null);
    setHasSelectedAddress(false);
    setPendingAddressToSave(null);
    onValidationChange?.(null as unknown as AddressValidation);
    inputRef.current?.focus();
  };

  const showValidationStatus = hasSelectedAddress && validation;
  const isAddressValid = validation?.isComplete;
  const hasSavedAddresses = showSavedAddresses && user && savedAddresses.length > 0;

  const getLabelIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('home')) return <Home className="h-4 w-4" />;
    if (lowerLabel.includes('work') || lowerLabel.includes('office')) return <Building2 className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };


  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Saved Addresses Quick Select */}
      {hasSavedAddresses && !value && (
        <div className="mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Star className="h-3 w-3" />
            <span>Saved addresses</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedAddresses.slice(0, 3).map((addr) => (
              <Button
                key={addr.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => handleSavedAddressSelect(addr)}
              >
                {getLabelIcon(addr.label)}
                {addr.label}
                {addr.is_default && <Star className="h-3 w-3 fill-primary text-primary" />}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <MapPin className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
          showValidationStatus && isAddressValid ? "text-emerald-500" : "text-muted-foreground"
        )} />
        <Input
          id={id}
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          className={cn(
            "pl-10 pr-20",
            showValidationStatus && isAddressValid && "border-emerald-500 focus-visible:ring-emerald-500",
            showValidationStatus && !isAddressValid && requireComplete && "border-amber-500 focus-visible:ring-amber-500"
          )}
          disabled={disabled}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {showValidationStatus && isAddressValid && !isLoading && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          {showValidationStatus && !isAddressValid && requireComplete && !isLoading && (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          {/* Save address button */}
          {user && pendingAddressToSave && !savedAddresses.some(a => a.full_address === pendingAddressToSave.fullAddress) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowSaveDialog(true)}
              title="Save this address"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          {value && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Validation Message */}
      {showValidationStatus && !isAddressValid && requireComplete && (
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Missing: {validation.missingFields.join(', ')}. Please select a complete address.
        </p>
      )}

      {showValidationStatus && isAddressValid && (
        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Complete address verified
        </p>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-start gap-3"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm text-foreground">
                  {suggestion.text}
                </div>
                {suggestion.context && (
                  <div className="text-xs text-muted-foreground">
                    {suggestion.context}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Save Address Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save address</DialogTitle>
            <DialogDescription>
              Give this address a label for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="addressLabel">Label</Label>
              <div className="flex gap-2">
                {['Home', 'Work', 'Other'].map((label) => (
                  <Button
                    key={label}
                    type="button"
                    variant={saveLabel === label ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSaveLabel(label)}
                    className="gap-1.5"
                  >
                    {getLabelIcon(label)}
                    {label}
                  </Button>
                ))}
              </div>
              <Input
                id="addressLabel"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="Custom label..."
                className="mt-2"
              />
            </div>
            {pendingAddressToSave && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {pendingAddressToSave.fullAddress}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAddress} disabled={!saveLabel.trim()}>
              Save address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressAutocomplete;
