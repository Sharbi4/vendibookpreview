import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X, Navigation, ChevronDown, AlertCircle } from 'lucide-react';
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
  city?: string;
  state?: string;
  zip?: string;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250];

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: { name: string; coordinates: [number, number] } | null) => void;
  selectedCoordinates: [number, number] | null;
  placeholder?: string;
  className?: string;
  showRadiusSelector?: boolean;
  radius?: number;
  onRadiusChange?: (radius: number) => void;
}

export const LocationSearchInput: React.FC<LocationSearchInputProps> = ({
  value,
  onChange,
  onLocationSelect,
  selectedCoordinates,
  placeholder = 'City, state, or ZIP code',
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [locationError, setLocationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const radiusRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestIdRef = useRef(0);

  const applySuggestion = (suggestion: GeocodeResult) => {
    const displayText = suggestion.placeName || [suggestion.text, suggestion.context].filter(Boolean).join(', ');
    onChange(displayText);
    onLocationSelect({
      name: displayText,
      coordinates: suggestion.center,
    });
    setLocationError(null);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  const fetchSuggestions = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setLocationError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLocationError(null);

    try {
      const { data, error } = await supabase.functions.invoke('geocode-location', {
        body: { query: trimmed, limit: 6 },
      });

      if (requestId !== requestIdRef.current) return;

      if (error) {
        console.error('Geocoding error:', error);
        setSuggestions([]);
        setIsOpen(false);
        setLocationError('Location suggestions are temporarily unavailable. You can still search by city, state, or ZIP.');
        return;
      }

      const results = Array.isArray(data?.results) ? data.results : [];
      setSuggestions(results);
      setHighlightedIndex(results.length > 0 ? 0 : -1);
      setIsOpen(results.length > 0);

      if (results.length === 0 && data?.error) {
        setLocationError('No location suggestions found. Try a city with state, or a 5-digit ZIP code.');
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to fetch location suggestions:', err);
      setSuggestions([]);
      setIsOpen(false);
      setLocationError('Location suggestions are temporarily unavailable. You can still search by city, state, or ZIP.');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!selectedCoordinates) fetchSuggestions(value);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, selectedCoordinates]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
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
    setLocationError(null);
    if (selectedCoordinates) onLocationSelect(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => Math.min(current + 1, suggestions.length - 1));
      return;
    }

    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        applySuggestion(suggestions[highlightedIndex]);
      } else if (!selectedCoordinates && value.trim().length >= 2) {
        e.preventDefault();
        void fetchSuggestions(value);
      }
    }
  };

  const handleClear = () => {
    requestIdRef.current += 1;
    onChange('');
    onLocationSelect(null);
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setLocationError(null);
    inputRef.current?.focus();
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location access.');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Send latitude first to avoid ambiguous lat/lng parsing in reverse geocoding.
      const { data, error } = await supabase.functions.invoke('geocode-location', {
        body: { query: `${latitude},${longitude}`, limit: 1 },
      });

      if (!error && data?.results?.length > 0) {
        const result = data.results[0] as GeocodeResult;
        const displayText = result.placeName || result.text || 'Current location';
        onChange(displayText);
        onLocationSelect({
          name: displayText,
          coordinates: [longitude, latitude],
        });
      } else {
        onChange('Current location');
        onLocationSelect({
          name: 'Current location',
          coordinates: [longitude, latitude],
        });
      }
    } catch (err) {
      console.error('Failed to get current location:', err);
      const geoError = err as GeolocationPositionError;
      if (geoError?.code === 1) {
        setLocationError('Location permission was denied. Enter a city, state, or ZIP instead.');
      } else if (geoError?.code === 3) {
        setLocationError('Your location timed out. Try again or enter a city, state, or ZIP.');
      } else {
        setLocationError('We could not determine your location. Enter a city, state, or ZIP instead.');
      }
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
    <div className={cn('space-y-2', className)}>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls="location-search-suggestions"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            className={cn(
              'pl-9 pr-20',
              selectedCoordinates && 'border-primary bg-primary/5'
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClear}
                title="Clear location"
                aria-label="Clear location"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              title="Use my current location"
              aria-label="Use my current location"
            >
              {isGettingLocation ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Navigation className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {isOpen && suggestions.length > 0 && (
          <div
            id="location-search-suggestions"
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                role="option"
                aria-selected={index === highlightedIndex}
                className={cn(
                  'w-full px-4 py-3 text-left transition-colors flex items-start gap-3',
                  index === highlightedIndex ? 'bg-muted' : 'hover:bg-muted/70'
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applySuggestion(suggestion)}
              >
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {suggestion.text || suggestion.placeName}
                  </div>
                  {(suggestion.context || suggestion.placeName) && (
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.context || suggestion.placeName}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {locationError && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground" role="status">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

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
                        variant={radius === r ? 'default' : 'outline'}
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

            <div className="hidden sm:flex gap-1">
              {[10, 25, 50].map((r) => (
                <Badge
                  key={r}
                  variant={radius === r ? 'default' : 'secondary'}
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
