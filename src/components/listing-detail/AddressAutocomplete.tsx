import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
}) => {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [validation, setValidation] = useState<AddressValidation | null>(null);
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
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
    
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    setValidation(null);
    setHasSelectedAddress(false);
    onValidationChange?.(null as unknown as AddressValidation);
    inputRef.current?.focus();
  };

  const showValidationStatus = hasSelectedAddress && validation;
  const isAddressValid = validation?.isComplete;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
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
            "pl-10 pr-10",
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
    </div>
  );
};

export default AddressAutocomplete;
