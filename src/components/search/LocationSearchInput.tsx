import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X, Navigation, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface GeocodeResult {
  id: string;
  placeName: string;
  center: [number, number]; // [lng, lat]
  text: string;
  context?: string;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250];

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: { name: string; coordinates: [number, number] } | null) => void;
  selectedCoordinates: [number, number] | null;
  placeholder?: string;
  className?: string;
  /** Optional: show inline radius selector when location is selected */
  showRadiusSelector?: boolean;
  /** Current radius value (miles) */
  radius?: number;
  /** Callback when radius changes */
  onRadiusChange?: (radius: number) => void;
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  onLocationSelect,
  selectedCoordinates,
  placeholder = "City, state, or zip code",
  className,
  showRadiusSelector = false,
  radius = 25,
  onRadiusChange,
}) => {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showRadiusDropdown, setShowRadiusDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const radiusRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Fetch suggestions from geocoding API
  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 2) {
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
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!selectedCoordinates) {
        fetchSuggestions(value);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, selectedCoordinates]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (radiusRef.current && !radiusRef.current.contains(event.target as Node)) {
        setShowRadiusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    // Clear selected coordinates when user types
    if (selectedCoordinates) {
      onLocationSelect(null);
    }
  };

  const handleSuggestionClick = (suggestion: GeocodeResult) => {
    onChange(suggestion.text);
    onLocationSelect({
      name: suggestion.placeName,
      coordinates: suggestion.center,
    });
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    onChange('');
    onLocationSelect(null);
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // Cache for 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse geocode to get location name
      const { data, error } = await supabase.functions.invoke('geocode-location', {
        body: { query: `${longitude},${latitude}`, limit: 1 },
      });

      if (!error && data.results?.length > 0) {
        const result = data.results[0];
        onChange(result.text);
        onLocationSelect({
          name: result.placeName,
          coordinates: [longitude, latitude],
        });
      } else {
        // Fallback to just coordinates
        onChange('Current Location');
        onLocationSelect({
          name: 'Current Location',
          coordinates: [longitude, latitude],
        });
      }
    } catch (err) {
      console.error('Failed to get current location:', err);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleRadiusSelect = (r: number) => {
    onRadiusChange?.(r);
    setShowRadiusDropdown(false);
  };

  const showInlineRadius = showRadiusSelector && selectedCoordinates;

  return (
    <div className={cn("space-y-2", className)}>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            className={cn(
              "pl-10 pr-20",
              selectedCoordinates && "border-primary bg-primary/5"
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {value && (
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              title="Use current location"
            >
              {isGettingLocation ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Navigation className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-start gap-3"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {suggestion.text}
                  </div>
                  {suggestion.context && (
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.context}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inline Radius Selector */}
      {showInlineRadius && (
        <div ref={radiusRef} className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Within:</span>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setShowRadiusDropdown(!showRadiusDropdown)}
              >
                {radius} mi
                <ChevronDown className="h-3 w-3" />
              </Button>
              
              {showRadiusDropdown && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[120px]">
                  <div className="flex flex-wrap gap-1">
                    {RADIUS_OPTIONS.map((r) => (
                      <Badge
                        key={r}
                        variant={radius === r ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                        onClick={() => handleRadiusSelect(r)}
                      >
                        {r} mi
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick select badges */}
            <div className="hidden sm:flex gap-1">
              {[10, 25, 50].map((r) => (
                <Badge
                  key={r}
                  variant={radius === r ? "default" : "secondary"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors text-xs"
                  onClick={() => onRadiusChange?.(r)}
                >
                  {r} mi
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};